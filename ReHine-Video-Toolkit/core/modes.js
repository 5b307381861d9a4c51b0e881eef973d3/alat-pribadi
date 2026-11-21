// RE:HINE — pemilih MODE patch (dijalankan sebelum video dibaca & diteruskan ke upload TikTok).
// Semua mode menulis komentar "By Re:Hine <mode>" (mis. "By Re:Hine high") ke metadata video (©cmt).
//   optimasi: file dikirim apa adanya (tanpa patch, "varian original"); hanya diperiksa untuk info. TikTok yang mengoptimasi.
//   pro     : alur lengkap CompressBase v1.5.1 (core/pro.js + folder pro/): kecilkan/ubah ke MP4 bila perlu, lalu patch OBX atau Nova (ffmpeg lokal).
// Semua hasil diperiksa strukturnya (core/verify.js) sebelum diteruskan.
(() => {
  'use strict';
  const R = (globalThis.RehineCore = globalThis.RehineCore || {});
  const MODES = ['optimasi', 'pro'];
  const DEFAULT_MODE = 'pro';
  const COMMENT_NAME = { optimasi: 'optimasi' };
  const commentFor = (mode) => 'By Re:Hine ' + (COMMENT_NAME[mode] || mode);
  // Standar & High sudah dihapus: nama lama (dan semua nilai lawas) jatuh ke Pro; Beta/Optimasi lama -> Optimasi.
  const LEGACY = { beta: 'optimasi' };
  const normalize = (m) => (MODES.includes(m) ? m : LEGACY[m] || DEFAULT_MODE);

  // Satu kali pembuatan hasil untuk satu mode.
  async function build(mode, file, opts) {
    // Optimasi: file dikirim apa adanya (varian "original": tanpa patch); TikTok yang mengoptimasi.
    if (mode === 'optimasi') return file;
    if (mode === 'pro') return R.pro.run(file, opts);
    throw new Error('Mode tidak dikenal: ' + mode);
  }

  // Menjalankan mode dan memeriksa hasilnya. TANPA fallback otomatis: bila video tidak cocok dengan mode
  // (ditolak atau hasil tidak lolos pemeriksaan), error dilempar dan pengguna diminta mengganti mode secara manual.
  // Blob hasil membawa `rehine = { mode, check }`.
  async function run(mode, file, opts = {}) {
    mode = normalize(mode);
    const blob = await build(mode, file, opts);
    if (mode === 'optimasi') {      // dikirim apa adanya; hasil pemeriksaan hanya informasi
      const out = new Blob([file], { type: file.type || 'video/mp4' });
      out.rehine = { mode, check: await R.verify.verifyMp4(out, { allowUnknownDuration: true }) };
      return out;
    }
    const check = await R.verify.verifyMp4(blob, { allowUnknownDuration: true });   // Pro: hasil mesin CompressBase, pemeriksaan hanya informasi
    blob.rehine = Object.assign(blob.rehine || {}, { mode, check });
    return blob;
  }

  R.modes = { MODES, DEFAULT_MODE, LEGACY, normalize, run };
})();
