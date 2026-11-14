// RE:HINE — pemilih MODE patch (dijalankan sebelum video dibaca & diteruskan ke upload TikTok).
// Semua mode menulis komentar "By Re:Hine <mode>" (mis. "By Re:Hine high") ke metadata video (©cmt).
//   standar : Metode HIDZZ (core asli)  -> bangun ulang struktur MP4 (3 track, ekor senyap)
//   custom  : struktur Standar + ukuran sample senyap (Fake Sample Size) diatur slider 6-60 byte
//   high    : sl-sr CompressBase (ADJN) -> patch langsung tanpa membangun ulang video; syarat: AAC-LC stereo, 1 track audio, MP4 biasa.
//             Bila ditolak, otomatis memakai Standar (komentar menjadi "By Re:Hine standar").
// Semua hasil diperiksa strukturnya (core/verify.js) sebelum diteruskan.
(() => {
  'use strict';
  const R = (globalThis.RehineCore = globalThis.RehineCore || {});
  const MODES = ['standar', 'high', 'custom'];
  const DEFAULT_MODE = 'standar';
  const commentFor = (mode) => 'By Re:Hine ' + mode;
  // nama lama tetap dikenali agar pengaturan tersimpan tidak hilang (lite/v1/v3/slsr/phone sudah dihapus -> default)
  const LEGACY = { v1: 'standar', lite: 'standar', 'audio-only': 'standar', v2: 'high', combo: 'high' };
  const normalize = (m) => (MODES.includes(m) ? m : LEGACY[m] || DEFAULT_MODE);

  const DEFAULT_FAKE_SIZE = 6; // = ukuran frame senyap stereo bawaan Standar
  const clampSize = (v) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(6, Math.min(60, v)) : DEFAULT_FAKE_SIZE; };

  // Satu kali pembuatan hasil untuk satu mode.
  async function build(mode, file, opts) {
    if (mode === 'high') {
      // sl-sr CompressBase: file asli dipatch langsung (potongan Blob, tanpa menyalin seluruh video).
      return R.compressbase.patchSlSr(file);
    }
    // standar & custom membangun ulang struktur MP4 dan membaca seluruh file ke memori.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const res = R.standard.processAndReport(bytes, commentFor(mode), { fakeSize: mode === 'custom' ? clampSize(opts.fakeSize) : undefined });
    return new Blob([res.bytes], { type: 'video/mp4' });
  }

  // Menjalankan mode, memeriksa hasilnya, dan (khusus High) otomatis memakai Standar bila High menolak video
  // atau hasilnya tidak lolos pemeriksaan. Blob hasil membawa `rehine = { mode, fellBack, check }`.
  async function run(mode, file, opts = {}) {
    mode = normalize(mode);
    const attempt = async (m) => {
      const blob = await build(m, file, opts);
      const check = await R.verify.verifyMp4(blob);
      if (!check.ok) throw new Error('Pemeriksaan hasil gagal: ' + check.reason);
      blob.rehine = { mode: m, fellBack: false, check };
      return blob;
    };
    try {
      return await attempt(mode);
    } catch (firstErr) {
      if (mode !== 'high') throw firstErr;
      try {
        const blob = await attempt('standar');
        blob.rehine.fellBack = true;
        blob.rehine.reason = firstErr && firstErr.message ? firstErr.message : String(firstErr);
        return blob;
      } catch (_) {
        throw firstErr;   // dua-duanya gagal: laporkan alasan dari mode yang dipilih
      }
    }
  }

  R.modes = { MODES, DEFAULT_MODE, DEFAULT_FAKE_SIZE, LEGACY, normalize, clampSize, run };
})();
