// RE:HINE — pemeriksaan struktur file hasil patch (dijalankan untuk semua mode).
// Membaca hanya header box dan moov lewat potongan Blob, tanpa memuat seluruh video.
// Memeriksa: box tingkat atas utuh, ada ftyp/moov/mdat, ada track video & audio, dan durasi mvhd valid (> 0, bukan tak hingga).
(() => {
  'use strict';
  const R = (globalThis.RehineCore = globalThis.RehineCore || {});
  const td = new TextDecoder('latin1');
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

  async function scanTop(blob) {
    const boxes = [];
    let off = 0;
    while (off + 8 <= blob.size && boxes.length < 10000) {
      const head = new Uint8Array(await blob.slice(off, Math.min(off + 16, blob.size)).arrayBuffer());
      let size = u32(head, 0), hdr = 8;
      const type = td.decode(head.subarray(4, 8));
      if (size === 1) {
        if (head.length < 16) return { boxes, end: off, error: 'header atom 64-bit terpotong' };
        const big = u32(head, 8) * 4294967296 + u32(head, 12);
        if (!Number.isSafeInteger(big)) return { boxes, end: off, error: 'ukuran atom terlalu besar' };
        size = big; hdr = 16;
      } else if (size === 0) size = blob.size - off;
      if (size < hdr || off + size > blob.size) return { boxes, end: off, error: 'ukuran atom ' + type + ' tidak valid' };
      boxes.push({ type, off, size, hdr });
      off += size;
    }
    return { boxes, end: off, error: null };
  }

  function children(b, start, end) {
    const out = [];
    let o = start;
    while (o + 8 <= end) {
      const size = u32(b, o);
      if (size < 8 || o + size > end) break;
      out.push({ type: td.decode(b.subarray(o + 4, o + 8)), off: o, size });
      o += size;
    }
    return out;
  }

  async function verifyMp4(blob) {
    try {
      const top = await scanTop(blob);
      if (top.error) return { ok: false, reason: top.error };
      if (top.end !== blob.size) return { ok: false, reason: 'struktur atom tidak utuh' };
      const has = (t) => top.boxes.some((b) => b.type === t);
      if (!has('ftyp') || !has('moov') || !has('mdat')) return { ok: false, reason: 'atom ftyp/moov/mdat tidak lengkap' };

      const moovRef = top.boxes.find((b) => b.type === 'moov');
      const moov = new Uint8Array(await blob.slice(moovRef.off + moovRef.hdr, moovRef.off + moovRef.size).arrayBuffer());
      const kids = children(moov, 0, moov.length);

      const mvhd = kids.find((k) => k.type === 'mvhd');
      if (!mvhd) return { ok: false, reason: 'mvhd tidak ada' };
      const v = moov[mvhd.off + 8];
      const durOff = mvhd.off + 8 + (v === 1 ? 4 + 8 + 8 + 4 : 4 + 4 + 4 + 4);
      let allOnes, zero;
      if (v === 1) { allOnes = u32(moov, durOff) === 0xffffffff && u32(moov, durOff + 4) === 0xffffffff; zero = u32(moov, durOff) === 0 && u32(moov, durOff + 4) === 0; }
      else { allOnes = u32(moov, durOff) === 0xffffffff; zero = u32(moov, durOff) === 0; }
      if (allOnes) return { ok: false, reason: 'durasi film tak hingga' };
      if (zero) return { ok: false, reason: 'durasi film 0' };

      let video = 0, audio = 0;
      for (const trak of kids.filter((k) => k.type === 'trak')) {
        const mdia = children(moov, trak.off + 8, trak.off + trak.size).find((k) => k.type === 'mdia');
        const hdlr = mdia && children(moov, mdia.off + 8, mdia.off + mdia.size).find((k) => k.type === 'hdlr');
        if (!hdlr) continue;
        const h = td.decode(moov.subarray(hdlr.off + 16, hdlr.off + 20));
        if (h === 'vide') video++; else if (h === 'soun') audio++;
      }
      if (!video) return { ok: false, reason: 'track video tidak ada' };
      if (!audio) return { ok: false, reason: 'track audio tidak ada' };
      return { ok: true, video, audio };
    } catch (e) {
      return { ok: false, reason: 'pemeriksaan gagal: ' + (e && e.message ? e.message : e) };
    }
  }

  R.verify = { verifyMp4 };
})();
