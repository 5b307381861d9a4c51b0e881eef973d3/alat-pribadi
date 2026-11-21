#!/usr/bin/env python3
"""RE:HINE — server pemroses lokal untuk Termux (Mode Pro > Pemroses: Termux).

Menerima video dari extension lewat 127.0.0.1, memprosesnya dengan ffmpeg native, lalu mengembalikan hasilnya.
Prep yang didukung:
  antilag : H.264 2-pass di bawah 20 MB (desimal), maks 1080p; mode Max: resolusi dipertahankan & batas MB disesuaikan resolusi, frame tidak digeser, verifikasi frame/timing (port skrip under20mb)
  tiktok  : kecilkan ke maks 1080p + CRF 24 (ukuran lebih kecil, frame tidak digeser)
Hanya library standar Python; butuh ffmpeg & ffprobe di PATH.  Setup:  pkg install python ffmpeg  &&  python rehine_server.py
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

VERSION = '1.0'
LIMIT = 20_000_000
PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow']
JOBS = {}
LOCK = threading.Lock()
WORK = Path(tempfile.gettempdir()) / 'rehine-server'


class Cancelled(Exception):
    pass


class Job:
    def __init__(self, jid, folder):
        self.id, self.dir = jid, folder
        self.status, self.pct, self.msg, self.error = 'queued', 0.0, '', ''
        self.result, self.name, self.proc, self.cancel, self.t = None, 'video', None, False, time.time()

    def set(self, pct=None, msg=None):
        if pct is not None:
            self.pct = max(self.pct, min(0.99, pct))
        if msg is not None:
            self.msg = msg

    def check(self):
        if self.cancel:
            raise Cancelled()


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, errors='replace')
    if r.returncode:
        raise ValueError((r.stderr or 'perintah gagal')[-1500:])
    return r.stdout


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))


def timestamps(path, idx):
    raw = run(['ffprobe', '-v', 'error', '-select_streams', str(idx), '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(path)])
    v = [float(f['best_effort_timestamp_time']) for f in json.loads(raw).get('frames', []) if 'best_effort_timestamp_time' in f]
    return [x - v[0] for x in v] if v else []


def ffmpeg(job, cmd, duration, lo, hi):
    """Jalankan ffmpeg; progres dipetakan ke rentang [lo, hi]. Bisa dibatalkan."""
    cmd = cmd[:1] + ['-progress', 'pipe:1', '-nostats'] + cmd[1:]
    with tempfile.TemporaryFile(mode='w+', errors='replace') as err:
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, text=True, errors='replace')
        job.proc = p
        try:
            for line in p.stdout:
                if job.cancel:
                    p.kill()
                    break
                k, _, v = line.strip().partition('=')
                if k in ('out_time_us', 'out_time_ms') and v.lstrip('-').isdigit() and duration:
                    job.set(lo + (hi - lo) * min(1.0, max(0, int(v)) / 1e6 / duration))
            code = p.wait()
        finally:
            job.proc = None
            if p.poll() is None:
                p.kill()
        job.check()
        if code:
            err.seek(0)
            raise ValueError(err.read()[-1500:] or 'ffmpeg gagal')


def color_plan(v):
    tr, pr = v.get('color_transfer'), v.get('color_primaries')
    hdr, wide = tr in ('smpte2084', 'arib-std-b67'), pr == 'bt2020'
    if not hdr and not wide:
        return ('format=yuv420p' if v.get('pix_fmt') not in ('yuv420p', 'yuvj420p') else ''), []
    tin = tr if hdr else {'bt2020-10': '14', 'bt2020-12': '15'}.get(tr, 'bt709')
    pin = 'bt709' if pr == 'bt709' else 'bt2020'
    mat = 'bt709' if v.get('color_space') == 'bt709' else 'bt2020nc'
    rng = 'full' if v.get('color_range') == 'pc' else 'limited'
    inc = f'pin={pin}:tin={tin}:min={mat}:rin={rng}'
    if hdr:
        vf = f'zscale={inc}:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=2,zscale=t=bt709:m=bt709:r=limited:dither=error_diffusion,format=yuv420p'
    else:
        vf = f'zscale={inc}:p=bt709:t=bt709:m=bt709:r=limited:dither=error_diffusion,format=yuv420p'
    vf += ',sidedata=mode=delete:type=MASTERING_DISPLAY_METADATA,sidedata=mode=delete:type=CONTENT_LIGHT_LEVEL'
    return vf, ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv']


def size_limit(w, h, keep):
    """Batas ukuran (byte). Normal: 20 MB. Max (resolusi dipertahankan): 20 MB x (piksel/1080p)^0.75 -> 720p ~11 MB, 1080p 20 MB, 1440p ~31 MB, 4K ~57 MB."""
    return int(LIMIT * (w * h / (1920 * 1080)) ** 0.75) if keep else LIMIT


def plan(src, cap4k=False):
    before = probe(src)
    vids = [s for s in before['streams'] if s['codec_type'] == 'video' and not s.get('disposition', {}).get('attached_pic')]
    if not vids:
        raise ValueError('video tidak ditemukan di file')
    v = vids[0]
    a = next((s for s in before['streams'] if s['codec_type'] == 'audio'), None)
    cf, flags = color_plan(v)
    if 'zscale' in cf:
        f = run(['ffmpeg', '-hide_banner', '-filters'])
        if 'zscale' not in f or 'tonemap' not in f:
            raise ValueError('konversi HDR butuh ffmpeg dengan zscale/libzimg (pkg install ffmpeg)')
    # Max (cap4k=True): resolusi TIDAK diubah, hanya ukuran file yang disesuaikan; normal: maks 1080p
    sc = 1 if cap4k else min(1, 1920 / max(v['width'], v['height']), 1080 / min(v['width'], v['height']))
    w, h = max(2, int(v['width'] * sc / 2) * 2), max(2, int(v['height'] * sc / 2) * 2)
    filt = ([f'scale={w}:{h}:flags=lanczos'] if (w, h) != (v['width'], v['height']) else []) + ([cf] if cf else [])
    dur = max(float(s.get('duration') or before['format'].get('duration') or 0) for s in [v] + ([a] if a else []))
    if not 0 < dur < float('inf'):
        raise ValueError('durasi video tidak valid')
    return before, v, a, filt, flags, (w, h), dur


def antilag(job, src, out, preset, cap4k=False):
    before, v, a, filt, flags, (w, h), dur = plan(src, cap4k)
    job.set(0.02, 'membaca frame')
    first = timestamps(src, v['index'])
    if not first:
        raise ValueError('frame sumber tidak terbaca')
    n = len(first)
    arate = 128_000 if a else 0
    limit = size_limit(w, h, cap4k)
    job.set(msg=f'target di bawah {limit / 1e6:.0f} MB')
    vrate = int(limit * 0.95 * 8 / dur) - arate
    if vrate < 50_000:
        raise ValueError('video terlalu panjang untuk profil 20 MB, potong dulu')
    tmp = job.dir
    target = tmp / 'encoded.mp4'
    for attempt in range(3):
        log = tmp / f'pass-{attempt}'
        tb = str(v.get('time_base') or '0').replace('/', ':')
        common = ['ffmpeg', '-hide_banner', '-v', 'error', '-nostdin', '-y', '-noautorotate', '-i', str(src), '-map', f'0:{v["index"]}',
                  '-c:v', 'libx264', '-preset', preset, '-b:v', str(vrate), '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough',
                  '-enc_time_base', tb, '-passlogfile', str(log)] + (['-vf', ','.join(filt)] if filt else []) + flags
        base = 0.05 + 0.85 * attempt / 3
        step = 0.85 / 3 / 2
        job.set(base, f'percobaan {attempt + 1}, pass 1/2')
        ffmpeg(job, common + ['-pass', '1', '-an', '-f', 'null', '-'], dur, base, base + step)
        job.set(base + step, f'percobaan {attempt + 1}, pass 2/2')
        aud = ['-map', f'0:{a["index"]}', '-c:a', 'aac', '-b:a', str(arate)] if a else ['-an']
        ffmpeg(job, common + ['-pass', '2'] + aud + ['-map_metadata', '0', '-map_chapters', '-1', '-movflags', '+faststart', str(target)], dur, base + step, base + 2 * step)
        if target.stat().st_size < limit:
            break
        vrate = int(vrate * (limit * 0.925 / target.stat().st_size) * 0.95)
        job.set(msg='menurunkan bitrate agar di bawah 20 MB')
    else:
        raise ValueError(f'tidak bisa mencapai batas {limit / 1e6:.0f} MB')
    job.set(0.92, 'memeriksa frame & timing')
    after = probe(target)
    rv = next(s for s in after['streams'] if s['codec_type'] == 'video')
    if bool(a) != any(s['codec_type'] == 'audio' for s in after['streams']):
        raise ValueError('audio hasil hilang')
    second = timestamps(target, rv['index'])
    if (rv['width'], rv['height'], len(second)) != (w, h, n):
        raise ValueError('resolusi/jumlah frame berubah')
    if any(abs(x - y) > 0.001 for x, y in zip(first, second)):
        raise ValueError('timing frame bergeser lebih dari 1 ms')
    job.check()
    shutil.move(str(target), str(out))


def tiktok(job, src, out, preset, cap4k=False):
    before, v, a, filt, flags, (w, h), dur = plan(src, cap4k)
    cmd = ['ffmpeg', '-hide_banner', '-v', 'error', '-nostdin', '-y', '-noautorotate', '-i', str(src), '-map', f'0:{v["index"]}']
    if a:
        cmd += ['-map', f'0:{a["index"]}']
    cmd += ['-c:v', 'libx264', '-preset', preset, '-crf', '24', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough'] + (['-vf', ','.join(filt)] if filt else []) + flags
    cmd += (['-c:a', 'aac', '-b:a', '128k'] if a else ['-an']) + ['-map_metadata', '0', '-map_chapters', '-1', '-movflags', '+faststart', str(out)]
    job.set(0.03, 'mengoptimalkan ukuran')
    ffmpeg(job, cmd, dur, 0.03, 0.97)


def worker(job, prep, preset, cap4k=False):
    try:
        job.status = 'running'
        src, out = job.dir / 'in.bin', job.dir / 'out.mp4'
        (antilag if prep == 'antilag' else tiktok)(job, src, out, preset, cap4k)
        job.result, job.pct, job.status = out, 1.0, 'done'
        src.unlink(missing_ok=True)
    except Cancelled:
        job.status = 'cancelled'
    except Exception as e:  # noqa: BLE001
        job.status, job.error = 'error', str(e)[-600:]
    finally:
        job.proc = None
        if job.status in ('error', 'cancelled'):      # gagal/batal: buang berkas sementara segera
            shutil.rmtree(job.dir, ignore_errors=True)


def sweep(max_age=600):
    """Hapus job lama (hasil yang tak sempat diambil, dll.). Berjalan otomatis tiap menit."""
    now = time.time()
    with LOCK:
        for jid in [j for j, x in JOBS.items() if now - x.t > max_age and x.status != 'running']:
            shutil.rmtree(JOBS.pop(jid).dir, ignore_errors=True)


def sweeper():
    while True:
        time.sleep(60)
        sweep()


class H(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'RehineServer/' + VERSION

    def log_message(self, *a):
        pass

    def _ok_origin(self):
        o = self.headers.get('Origin')
        return o is None or o.startswith(('chrome-extension://', 'moz-extension://'))

    def _send(self, code, body=b'', ctype='application/json', extra=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        self.send_response(code)
        o = self.headers.get('Origin')
        if o:
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def do_OPTIONS(self):
        if not self._ok_origin():
            return self._send(403, {'error': 'origin ditolak'})
        o = self.headers.get('Origin')
        self.send_response(204)
        if o:
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _job(self, parts):
        with LOCK:
            return JOBS.get(parts[1]) if len(parts) > 1 else None

    def do_GET(self):
        if not self._ok_origin():
            return self._send(403, {'error': 'origin ditolak'})
        u = urlparse(self.path)
        parts = [p for p in u.path.split('/') if p]
        if u.path == '/ping':
            return self._send(200, {'ok': True, 'server': 'rehine', 'version': VERSION, 'ffmpeg': bool(shutil.which('ffmpeg')), 'ffprobe': bool(shutil.which('ffprobe'))})
        if parts[:1] == ['job']:
            j = self._job(parts)
            if not j:
                return self._send(404, {'error': 'job tidak ada'})
            if len(parts) == 3 and parts[2] == 'result':
                if j.status != 'done' or not j.result or not j.result.exists():
                    return self._send(409, {'error': 'belum selesai'})
                size = j.result.stat().st_size
                self.send_response(200)
                o = self.headers.get('Origin')
                if o:
                    self.send_header('Access-Control-Allow-Origin', o)
                self.send_header('Content-Type', 'video/mp4')
                self.send_header('Content-Length', str(size))
                self.end_headers()
                with j.result.open('rb') as f:
                    shutil.copyfileobj(f, self.wfile, 1 << 20)
                return
            return self._send(200, {'id': j.id, 'status': j.status, 'pct': round(j.pct, 4), 'msg': j.msg, 'error': j.error})
        self._send(404, {'error': 'tidak ada'})

    def do_POST(self):
        if not self._ok_origin():
            return self._send(403, {'error': 'origin ditolak'})
        u = urlparse(self.path)
        if u.path != '/job':
            return self._send(404, {'error': 'tidak ada'})
        q = parse_qs(u.query)
        prep = (q.get('prep') or ['antilag'])[0]
        preset = (q.get('preset') or ['veryfast'])[0]
        if prep not in ('antilag', 'tiktok') or preset not in PRESETS:
            return self._send(400, {'error': 'prep/preset tidak dikenal'})
        if not (shutil.which('ffmpeg') and shutil.which('ffprobe')):
            return self._send(500, {'error': 'ffmpeg/ffprobe tidak ditemukan (pkg install ffmpeg)'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0:
            return self._send(400, {'error': 'tubuh kosong'})
        sweep()
        jid = uuid.uuid4().hex[:12]
        folder = WORK / jid
        folder.mkdir(parents=True, exist_ok=True)
        j = Job(jid, folder)
        j.name = (q.get('name') or ['video'])[0]
        cap4k = (q.get('max') or ['0'])[0] == '1'
        try:
            with (folder / 'in.bin').open('wb') as f:
                left = n
                while left:
                    chunk = self.rfile.read(min(1 << 20, left))
                    if not chunk:
                        raise ConnectionError('unggahan terputus')
                    f.write(chunk)
                    left -= len(chunk)
        except Exception as e:  # noqa: BLE001
            shutil.rmtree(folder, ignore_errors=True)
            return self._send(400, {'error': str(e)})
        with LOCK:
            JOBS[jid] = j
        threading.Thread(target=worker, args=(j, prep, preset, cap4k), daemon=True).start()
        self._send(200, {'id': jid})

    def do_DELETE(self):
        if not self._ok_origin():
            return self._send(403, {'error': 'origin ditolak'})
        parts = [p for p in urlparse(self.path).path.split('/') if p]
        j = self._job(parts) if parts[:1] == ['job'] else None
        if not j:
            return self._send(404, {'error': 'job tidak ada'})
        j.cancel = True
        try:
            if j.proc:
                j.proc.kill()
        except Exception:  # noqa: BLE001
            pass
        def later():
            time.sleep(1.5)
            with LOCK:
                JOBS.pop(j.id, None)
            shutil.rmtree(j.dir, ignore_errors=True)
        threading.Thread(target=later, daemon=True).start()
        self._send(200, {'ok': True})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--port', type=int, default=8787)
    a = ap.parse_args()
    for t in ('ffmpeg', 'ffprobe'):
        if not shutil.which(t):
            sys.exit(f'{t} tidak ditemukan. Di Termux: pkg install ffmpeg')
    shutil.rmtree(WORK, ignore_errors=True)       # mulai bersih: buang sisa proses sebelumnya
    WORK.mkdir(parents=True, exist_ok=True)
    try:
        srv = ThreadingHTTPServer(('127.0.0.1', a.port), H)
    except OSError:
        sys.exit(f'Port {a.port} sudah dipakai (server RE:HINE mungkin sudah jalan).')
    threading.Thread(target=sweeper, daemon=True).start()
    print(f'RE:HINE server siap di http://127.0.0.1:{a.port}  (Ctrl+C untuk berhenti)', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        shutil.rmtree(WORK, ignore_errors=True)


if __name__ == '__main__':
    main()
