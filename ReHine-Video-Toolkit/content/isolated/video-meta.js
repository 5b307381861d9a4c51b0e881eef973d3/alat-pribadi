/* RE:HINE — tiny MP4/MOV metadata reader (resolution, fps, bitrate, codec). Runs locally. */
(() => {
  'use strict';
  const AVC_PROFILES = { 66: 'Baseline', 77: 'Main', 88: 'Extended', 100: 'High', 110: 'High10', 122: 'High422', 244: 'High444' };
  const HEVC_PROFILES = { 1: 'Main', 2: 'Main10', 3: 'MainStill' };

  function parse(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const t4 = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    function* boxes(s, e) {
      let o = s;
      while (o + 8 <= e) {
        let size = dv.getUint32(o), hdr = 8;
        const t = t4(o + 4);
        if (size === 1) { if (o + 16 > e) return; size = Number(dv.getBigUint64(o + 8)); hdr = 16; }
        else if (size === 0) size = e - o;
        if (o + size > e) size = e - o;
        if (size < hdr) return;
        yield { t, s: o + hdr, e: o + size };
        o += size;
      }
    }
    const find = (b, t) => { if (!b) return null; for (const x of boxes(b.s, b.e)) if (x.t === t) return x; return null; };

    const root = { s: 0, e: bytes.length };
    const ftyp = find(root, 'ftyp');
    const container = ftyp && t4(ftyp.s) === 'qt  ' ? 'MOV' : 'MP4';
    const moov = find(root, 'moov');
    if (!moov) throw new Error('moov tidak ditemukan');

    for (const trak of boxes(moov.s, moov.e)) {
      if (trak.t !== 'trak') continue;
      const mdia = find(trak, 'mdia');
      const hdlr = find(mdia, 'hdlr');
      if (!hdlr || t4(hdlr.s + 8) !== 'vide') continue;

      const out = { container, w: 0, h: 0, fps: 0, bitrate: 0, codecKey: '', codec: '—' };

      const mdhd = find(mdia, 'mdhd');
      let ts = 0, dur = 0;
      if (mdhd) {
        if (bytes[mdhd.s] === 1) { ts = dv.getUint32(mdhd.s + 20); dur = Number(dv.getBigUint64(mdhd.s + 24)); }
        else { ts = dv.getUint32(mdhd.s + 12); dur = dv.getUint32(mdhd.s + 16); }
      }
      const seconds = ts ? dur / ts : 0;

      const stbl = find(find(mdia, 'minf'), 'stbl');
      const stsd = find(stbl, 'stsd');
      if (stsd) {
        const es = stsd.s + 16, type = t4(stsd.s + 12);
        out.w = dv.getUint16(es + 24);
        out.h = dv.getUint16(es + 26);
        const kids = { s: es + 78, e: stsd.e };
        if (type === 'avc1' || type === 'avc3') {
          out.codecKey = 'avc';
          const c = find(kids, 'avcC');
          out.codec = 'H.264' + (c ? ' ' + (AVC_PROFILES[bytes[c.s + 1]] || '') + ' L' + (bytes[c.s + 3] / 10).toFixed(1) : '');
        } else if (type === 'hvc1' || type === 'hev1') {
          out.codecKey = 'hevc';
          const c = find(kids, 'hvcC');
          out.codec = 'H.265' + (c ? ' ' + (HEVC_PROFILES[bytes[c.s + 1] & 31] || '') + ' L' + (bytes[c.s + 12] / 30).toFixed(1) : '');
        } else if (type === 'av01') { out.codecKey = 'av1'; out.codec = 'AV1'; }
        else if (type === 'vp09') { out.codecKey = 'vp9'; out.codec = 'VP9'; }
        else out.codec = type.trim();
      }

      // rotation: swap w/h for portrait-rotated phone clips
      const tkhd = find(trak, 'tkhd');
      if (tkhd) {
        const mo = tkhd.s + (bytes[tkhd.s] === 1 ? 52 : 40);
        const b = dv.getInt32(mo + 4);
        if (Math.abs(b) === 0x10000) { const x = out.w; out.w = out.h; out.h = x; }
      }

      const stts = find(stbl, 'stts');
      if (stts && ts) {
        const n = dv.getUint32(stts.s + 4);
        let cnt = 0, tot = 0;
        for (let i = 0; i < n; i++) { const c = dv.getUint32(stts.s + 8 + i * 8), d = dv.getUint32(stts.s + 12 + i * 8); cnt += c; tot += c * d; }
        if (tot) out.fps = cnt * ts / tot;
      }

      const stsz = find(stbl, 'stsz');
      if (stsz && seconds) {
        const fixed = dv.getUint32(stsz.s + 4), n = dv.getUint32(stsz.s + 8);
        let sum = 0;
        if (fixed) sum = fixed * n;
        else for (let i = 0; i < n; i++) sum += dv.getUint32(stsz.s + 12 + i * 4);
        out.bitrate = sum * 8 / seconds;
      }
      return out;
    }
    throw new Error('track video tidak ditemukan');
  }

  const fmt = {
    size: (n) => { const u = ['B','KB','MB','GB']; let i = 0, x = n; while (x >= 1024 && i < 3) { x /= 1024; i++; } return x.toFixed(i ? 1 : 0) + ' ' + u[i]; },
    res: (m) => (m && m.w ? m.w + '×' + m.h : '—'),
    fps: (m) => (m && m.fps ? String(Math.round(m.fps * 100) / 100) : '—'),
    bitrate: (m) => !m || !m.bitrate ? '—' : m.bitrate >= 1e6 ? (m.bitrate / 1e6).toFixed(1) + ' Mbps' : Math.round(m.bitrate / 1e3) + ' kbps'
  };
  // Tagar otomatis dari ukuran piksel & fps: mis. 1280x720 30fps -> ['#hd','#720p','#30fps']
  function tags(m) {
    if (!m || !m.w || !m.h) return [];
    const s = Math.min(m.w, m.h), out = [];
    const label = s >= 2160 ? '4k' : s >= 1440 ? '2k' : s >= 1080 ? 'fullhd' : s >= 720 ? 'hd' : s >= 480 ? 'sd' : '';
    if (label) out.push('#' + label);
    out.push('#' + s + 'p');
    if (m.fps) out.push('#' + Math.round(m.fps) + 'fps');
    return out;
  }
  globalThis.RehineVideoMeta = { parse, fmt, tags };
})();
