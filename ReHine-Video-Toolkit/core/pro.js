// Mode Pro — memasang seluruh alur CompressBase v1.5.1 (folder pro/): baca info video -> kecilkan ke 1080p bila perlu
// (atau Ukuran TikTok / Anti Lag <20 MB, 2-pass) -> MKV/WebM/MOV ke MP4 tanpa re-encode -> patch dengan mesin OBX atau Nova (ffmpeg lokal).
// Semua berjalan lokal di popup; tanpa jaringan.
(() => {
  'use strict';
  const R = (globalThis.RehineCore = globalThis.RehineCore || {});
  const ROOT = () => chrome.runtime.getURL('pro/');
  const FORMATS = [[/quick/i, 'MOV'], [/matroska/i, 'MKV'], [/webm/i, 'WebM'], [/mp4/i, 'MP4'], [/transport|mpeg-?ts/i, 'MPEG-TS'], [/ogg/i, 'OGG']];
  const fmtName = (n, f) => n ? ((FORMATS.find(([r]) => r.test(n)) || [])[1] || n) : ((f.name.split('.').pop() || '?').toUpperCase());
  const ENGINES = ['obx', 'nova'], PREPS = ['normal', 'tiktok', 'antilag'];

  function probeSize(f) {
    return new Promise((res) => {
      const v = document.createElement('video'), u = URL.createObjectURL(f), done = (r) => { URL.revokeObjectURL(u); res(r); };
      v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = () => done({ width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => done(null); v.src = u;
    });
  }


  // ---- Anti Lag: porting skrip Python "under20mb" (2-pass H.264 < 20 MB desimal, maks 1080p, frame tidak digeser) ke ffmpeg.wasm lokal ----
  // Catatan beda dari skrip PC: tanpa tonemap HDR (zscale tidak tersedia di browser) dan verifikasi timestamp per-frame dilewati;
  // frame cadence dijaga dengan -fps_mode passthrough (tanpa duplikat/buang frame).
  const LIMIT = 20e6;
  async function antiLag(file, size, info, o) {
    const { base, signal, onStatus, onProgress } = o;
    const w0 = (size && size.width) || 0, h0 = (size && size.height) || 0;
    if (!w0 || !h0) throw new Error('Anti Lag: ukuran video tidak terbaca');
    let dur = info && info.duration;
    if (!(dur > 0)) dur = await new Promise((res) => { const v = document.createElement('video'), u = URL.createObjectURL(file); v.preload = 'metadata'; v.onloadedmetadata = () => { URL.revokeObjectURL(u); res(v.duration); }; v.onerror = () => { URL.revokeObjectURL(u); res(0); }; v.src = u; });
    if (!(dur > 0 && isFinite(dur))) throw new Error('Anti Lag: durasi video tidak valid');
    const audioRate = 128000;
    // Max: resolusi TIDAK diubah, hanya batas MB disesuaikan (20 MB x (piksel/1080p)^0.75); normal: maks 1080p & 20 MB
    const scale = o.max ? 1 : Math.min(1, 1920 / Math.max(w0, h0), 1080 / Math.min(w0, h0));
    const W = Math.max(2, Math.floor(w0 * scale / 2) * 2), H = Math.max(2, Math.floor(h0 * scale / 2) * 2);
    const limit = o.max ? Math.floor(LIMIT * Math.pow(W * H / (1920 * 1080), 0.75)) : LIMIT;
    onStatus('Anti Lag: target di bawah ' + Math.round(limit / 1e6) + ' MB');
    let rate = Math.floor(limit * 0.95 * 8 / dur) - audioRate;
    if (rate < 50000) throw new Error('Anti Lag: video terlalu panjang untuk profil 20 MB, potong dulu');
    const vf = (W !== w0 || H !== h0 ? 'scale=' + W + ':' + H + ':flags=lanczos,' : '') + 'format=yuv420p';
    onStatus('Anti Lag: memuat encoder lokal…');
    const { FFmpeg } = await import(base + 'ffmpeg-esm/index.js');
    const ff = new FFmpeg();
    const abort = () => { try { ff.terminate(); } catch (_) {} };
    if (signal) signal.addEventListener('abort', abort, { once: true });
    let stage = 0, nStages = 1;
    ff.on('progress', ({ progress }) => { if (Number.isFinite(progress)) onProgress(Math.max(0, Math.min(0.99, (stage + Math.max(0, Math.min(1, progress))) / nStages))); });
    let logTail = ''; ff.on('log', ({ message }) => { logTail = (logTail + '\n' + message).slice(-1500); });
    try {
      await ff.load({ classWorkerURL: base + 'ffmpeg-esm/worker.js', coreURL: base + 'ffmpeg-core/ffmpeg-core.js', wasmURL: base + 'ffmpeg-core/ffmpeg-core.wasm' });
      onStatus('Anti Lag: menyalin video ke encoder…');
      await ff.writeFile('in.mp4', new Uint8Array(await file.arrayBuffer()));
      const run1 = async (args) => { const code = await ff.exec(args); if (code) throw new Error('Anti Lag: encoder gagal (' + code + ') ' + logTail.slice(-300)); };
      let out = null, vsync = ['-fps_mode', 'passthrough'];
      for (let attempt = 0; attempt < 3; attempt++) {
        nStages = 2; stage = 0;
        const common = ['-hide_banner', '-y', '-i', 'in.mp4', '-map', '0:v:0', '-c:v', 'libx264', '-preset', o.preset || 'veryfast', '-b:v', String(rate), '-pix_fmt', 'yuv420p', ...vsync, '-passlogfile', 'pl', '-vf', vf];
        onStatus('Anti Lag: percobaan ' + (attempt + 1) + ', pass 1/2…');
        try { await run1([...common, '-pass', '1', '-an', '-f', 'null', '-']); }
        catch (e) { if (attempt === 0 && /fps_mode|Unrecognized option/i.test(logTail)) { vsync = ['-vsync', '0']; common.splice(common.indexOf('-fps_mode'), 2, '-vsync', '0'); await run1([...common, '-pass', '1', '-an', '-f', 'null', '-']); } else throw e; }
        stage = 1; onStatus('Anti Lag: percobaan ' + (attempt + 1) + ', pass 2/2…');
        await run1([...common, '-pass', '2', '-map', '0:a:0?', '-c:a', 'aac', '-b:a', String(audioRate), '-map_metadata', '0', '-map_chapters', '-1', '-movflags', '+faststart', 'out.mp4']);
        const data = await ff.readFile('out.mp4'); out = data;
        if (data.length < limit) break;
        rate = Math.floor(rate * (limit * 0.925 / data.length) * 0.95); out = null;
        onStatus('Anti Lag: menurunkan bitrate agar < 20 MB…');
        try { await ff.deleteFile('out.mp4'); } catch (_) {}
      }
      if (!out) throw new Error('Anti Lag: tidak bisa mencapai batas ' + Math.round(limit / 1e6) + ' MB');
      onProgress(1);
      return new File([out], file.name.replace(/\.[^.]+$/, '') + '_anti_lag.mp4', { type: 'video/mp4' });
    } finally {
      if (signal) signal.removeEventListener('abort', abort);
      try { ff.terminate(); } catch (_) {}
    }
  }


  // ---- Pemroses Termux: kirim ke server lokal (termux/rehine_server.py) yang menjalankan ffmpeg native ----
  const TERMUX = 'http://127.0.0.1:8787';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function termuxRun(file, prep, o) {
    const { signal, onStatus, onProgress } = o;
    const err = (m) => new Error('Termux: ' + m);
    onStatus('Termux: menghubungi server…');
    const c = new AbortController(), to = setTimeout(() => c.abort(), 2500);
    let ping = null;
    try { const r = await fetch(TERMUX + '/ping', { signal: c.signal }); ping = await r.json(); }
    catch (_) { throw err('server tidak terdeteksi. Jalankan "python rehine_server.py" di Termux (lihat README), atau ganti Pemroses ke Browser.'); }
    finally { clearTimeout(to); }
    if (!ping || ping.server !== 'rehine') throw err('server di 127.0.0.1:8787 bukan RE:HINE.');
    if (!ping.ffmpeg || !ping.ffprobe) throw err('ffmpeg belum terpasang di Termux (pkg install ffmpeg).');
    onStatus('Termux: mengirim video…');
    let id = null;
    const cancel = () => { if (id) fetch(TERMUX + '/job/' + id, { method: 'DELETE' }).catch(() => {}); };
    if (signal) signal.addEventListener('abort', cancel, { once: true });
    try {
      let r;
      try { r = await fetch(TERMUX + '/job?prep=' + prep + '&preset=' + (o.preset || 'veryfast') + '&max=' + (o.max ? 1 : 0) + '&name=' + encodeURIComponent(file.name), { method: 'POST', body: file, signal }); }
      catch (e) { if (signal && signal.aborted) throw e; throw err('gagal mengirim video ke server.'); }
      const j = await r.json();
      if (!r.ok) throw err(j.error || 'ditolak server');
      id = j.id;
      for (;;) {
        if (signal && signal.aborted) throw new Error('Cancelled');
        await sleep(600);
        let st;
        try { st = await (await fetch(TERMUX + '/job/' + id, { signal })).json(); }
        catch (e) { if (signal && signal.aborted) throw e; throw err('koneksi ke server terputus (Termux dimatikan Android?). Aktifkan termux-wake-lock.'); }
        if (st.status === 'error') throw err(st.error || 'gagal');
        if (st.status === 'cancelled') throw new Error('Cancelled');
        onProgress(Math.min(0.99, st.pct || 0)); if (st.msg) onStatus('Termux: ' + st.msg);
        if (st.status === 'done') break;
      }
      onStatus('Termux: mengambil hasil…');
      const res = await fetch(TERMUX + '/job/' + id + '/result', { signal });
      if (!res.ok) throw err('hasil tidak bisa diambil.');
      const blob = await res.blob();
      cancel(); id = null;
      onProgress(1);
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + (prep === 'antilag' ? '_anti_lag' : '_tiktok') + '.mp4', { type: 'video/mp4' });
    } finally { if (signal) signal.removeEventListener('abort', cancel); }
  }

  // opts: { engine:'obx'|'nova', prep:'normal'|'tiktok'|'antilag', onStatus(text), onProgress(0..1), signal }
  async function run(file, opts = {}) {
    const engine = ENGINES.includes(opts.engine) ? opts.engine : 'obx';
    const maxOn = !!opts.max;                                   // Max: tanpa penurunan ke 1080p (sampai 4K), Ukuran TikTok tidak tersedia
    const prep = PREPS.includes(opts.prep) && !(maxOn && opts.prep === 'tiktok') && !(maxOn && opts.proc !== 'termux' && opts.prep === 'antilag') ? opts.prep : 'normal';   // Max + Browser: hanya Normal
    const onStatus = opts.onStatus || (() => {}), signal = opts.signal;
    const base = ROOT();
    const common = { signal, onStatus, onProgress: opts.onProgress || (() => {}), assetsBaseURL: base };
    onStatus('Pro: membaca info video…');
    const [client, dl, res] = await Promise.all([import(base + 'lib/client.mjs'), import(base + 'lib/downscale.mjs'), import(base + 'lib/resolution.mjs')]);
    let info = null; try { info = await dl.probeVideo(file); } catch (_) {}
    const size = info && info.width ? info : await probeSize(file);
    const low = size && Math.min(size.width, size.height) < 1080, big = !maxOn && size && res.above1080p(size);
    if (maxOn && prep === 'normal' && size && (Math.max(size.width, size.height) > 4096 || Math.min(size.width, size.height) > 2160)) throw new Error('Max: video di atas 4K (4096×2160) tidak didukung');
    const container = info && info.format ? fmtName(info.format, file) : null;
    let src = file, note = '';
    const viaTermux = opts.proc === 'termux' && prep !== 'normal' && !(prep === 'tiktok' && low);
    if (viaTermux) { src = await termuxRun(file, prep, { max: maxOn, signal, onStatus, onProgress: common.onProgress, preset: opts.preset }); note = (prep === 'antilag' ? 'Anti Lag <20 MB' : 'ukuran dioptimalkan') + ' (Termux)'; }
    else if (prep === 'antilag') { src = await antiLag(file, size, info, { max: maxOn, base, signal, onStatus, onProgress: common.onProgress, preset: opts.preset }); note = 'Anti Lag <20 MB (2-pass)' + (maxOn ? ' · resolusi asli' : ''); }
    else if (prep === 'tiktok' && !low) { onStatus('Pro: mengoptimalkan ukuran file…'); src = await dl.downscaleVideo(src, { ...common, frameLiteQuality: 'balanced' }); note = 'ukuran dioptimalkan'; }
    else if (big) { onStatus('Pro: mengecilkan ke 1080p…'); src = await dl.downscaleVideo(src, common); note = 'diturunkan ke 1080p'; }
    if (src === file && container && container !== 'MP4') {
      onStatus('Pro: ' + container + ' → MP4 (tanpa re-encode)…');
      src = new File([await dl.remux(src, signal)], file.name.replace(/\.[^.]+$/, '') + '.mp4', { type: 'video/mp4' }); note += (note ? ' · ' : '') + container + '→MP4';
    }
    onStatus('Pro: patch (' + (engine === 'nova' ? 'Nova' : 'OBX') + ')…');
    const out = await client.patchVideo(src, { signal, onStatus, postingDevice: engine === 'nova' ? 'patchbox' : 'obx' });
    out.rehine = { mode: 'pro', engine, prep, note };
    return out;
  }
  // info video untuk ditampilkan (format, ukuran, FPS, durasi, codec, audio) — dibaca lokal tanpa memuat seluruh file
  const VC = { avc: 'H.264', hevc: 'H.265', vp9: 'VP9', vp8: 'VP8', av1: 'AV1' };
  const AC = { aac: 'AAC', mp3: 'MP3', opus: 'Opus', vorbis: 'Vorbis', flac: 'FLAC', ac3: 'AC-3', eac3: 'E-AC-3' };
  const RATES = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 72, 90, 120, 144, 240];
  const fpsLabel = (x) => { if (!(x > 0)) return ''; const c = RATES.find((c) => Math.abs(x - c) / c < .006); return (c !== undefined ? c : +x.toFixed(2)) + ' FPS'; };
  const durLabel = (s) => { if (!(s > 0)) return ''; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
  const fmtSize = (n) => n > 1024 ** 3 ? (n / 1024 ** 3).toFixed(2) + ' GB' : (n / 1024 ** 2).toFixed(1) + ' MB';
  async function describe(file) {
    const chips = [];
    let i = null;
    try { const dl = await import(ROOT() + 'lib/downscale.mjs'); i = await dl.probeVideo(file); } catch (_) {}
    chips.push(fmtName(i && i.format, file));
    if (i && i.width) chips.push(i.width + '×' + i.height);
    if (i && i.fps) chips.push(fpsLabel(i.fps));
    if (i && i.duration) chips.push(durLabel(i.duration));
    if (i && i.vcodec) chips.push(VC[i.vcodec] || String(i.vcodec).toUpperCase());
    if (i && i.acodec) chips.push((AC[i.acodec] || String(i.acodec).toUpperCase()) + (i.sampleRate ? ' · ' + +(i.sampleRate / 1000).toFixed(1) + ' kHz' : '') + (i.channels ? ' · ' + (i.channels === 1 ? 'Mono' : i.channels === 2 ? 'Stereo' : i.channels + ' ch') : ''));
    chips.push(fmtSize(file.size));
    const out = chips.filter(Boolean);
    out.w = (i && i.width) || 0; out.h = (i && i.height) || 0;      // ukuran asli, dipakai popup untuk peringatan >1080p
    return out;
  }
  R.pro = { run, describe, ENGINES, PREPS };
})();
