// RE:HINE — terjemahan pesan galat mesin patch (EN <-> ID).
// Mesin patch melempar pesan dalam satu bahasa saja (Standar/pemeriksaan: Indonesia, High/CompressBase: Inggris).
// errText(pesan, 'en'|'id') mengembalikan pesan dalam bahasa pilihan; pesan yang tidak dikenal dikembalikan apa adanya.
(() => {
  'use strict';
  const R = (globalThis.RehineCore = globalThis.RehineCore || {});

  // [Inggris, Indonesia]
  const PAIRS = [
    // — High (CompressBase) —
    ['Audio chunk exceeds sample count', 'Chunk audio melebihi jumlah sample'],
    ['Audio chunk outside media data', 'Chunk audio di luar data media'],
    ['Audio chunks omit samples', 'Chunk audio melewatkan sample'],
    ['Audio composition counts differ', 'Jumlah composition audio tidak sama'],
    ['Audio edit does not reach the end', 'Edit audio tidak mencapai akhir'],
    ['Audio groups exceed sample count', 'Grup audio melebihi jumlah sample'],
    ['Audio timescale cannot represent AAC frames', 'Timescale audio tidak bisa merepresentasikan frame AAC'],
    ['Audio timing does not match samples', 'Waktu audio tidak cocok dengan sample'],
    ['Duplicate chunk offset tables', 'Tabel offset chunk ganda'],
    ['Empty AAC sample', 'Sample AAC kosong'],
    ['Excessive MP4 nesting', 'Susunan box MP4 terlalu dalam'],
    ['Expected a direct AAC configuration', 'Dibutuhkan konfigurasi AAC langsung'],
    ['Expected one AAC sample description', 'Dibutuhkan tepat satu deskripsi sample AAC'],
    ['Expected one conventional MP4 movie box', 'Dibutuhkan tepat satu box movie MP4 konvensional'],
    ['External audio references are unsupported', 'Referensi audio eksternal tidak didukung'],
    ['Fragmented or indexed MP4 is unsupported', 'MP4 fragmented atau berindeks tidak didukung'],
    ['Inconsistent audio duration', 'Durasi audio tidak konsisten'],
    ['Inconsistent edit duration', 'Durasi edit tidak konsisten'],
    ['Invalid AAC descriptor length', 'Panjang deskriptor AAC tidak valid'],
    ['Invalid AAC descriptor', 'Deskriptor AAC tidak valid'],
    ['Invalid MP4 box size', 'Ukuran box MP4 tidak valid'],
    ['Invalid audio chunk run', 'Urutan chunk audio tidak valid'],
    ['Invalid audio dependency or priority table', 'Tabel dependensi atau prioritas audio tidak valid'],
    ['Invalid audio group count', 'Jumlah grup audio tidak valid'],
    ['Invalid audio sample count', 'Jumlah sample audio tidak valid'],
    ['Invalid audio sample group', 'Grup sample audio tidak valid'],
    ['Invalid audio sample sizes', 'Ukuran sample audio tidak valid'],
    ['Invalid audio sync sample', 'Sync sample audio tidak valid'],
    ['Invalid audio timing', 'Waktu audio tidak valid'],
    ['Invalid first chunk run', 'Urutan chunk pertama tidak valid'],
    ['Invalid track IDs', 'ID track tidak valid'],
    ['Missing AAC configuration', 'Konfigurasi AAC tidak ada'],
    ['Missing AAC descriptor', 'Deskriptor AAC tidak ada'],
    ['Missing audio chunks', 'Chunk audio tidak ada'],
    ['Movie timescale cannot represent the silent tail', 'Timescale film tidak bisa merepresentasikan ekor senyap'],
    ['Nonzero audio composition offsets are unsupported', 'Offset composition audio bukan nol tidak didukung'],
    ['Size-zero box exceeds the supported range', 'Box berukuran nol melebihi rentang yang didukung'],
    ['Truncated AAC descriptor', 'Deskriptor AAC terpotong'],
    ['Truncated MP4 header', 'Header MP4 terpotong'],
    ['Truncated extended MP4 header', 'Header MP4 extended terpotong'],
    ['Unsupported AAC descriptor flags', 'Flag deskriptor AAC tidak didukung'],
    ['Unsupported AAC descriptor version', 'Versi deskriptor AAC tidak didukung'],
    ['Unsupported AAC sample rate or extension', 'Sample rate atau ekstensi AAC tidak didukung'],
    ['Unsupported MP4 edit list', 'Edit list MP4 tidak didukung'],
    ['Unsupported MP4 header version', 'Versi header MP4 tidak didukung'],
    ['Unsupported MP4 timing or ID', 'Waktu atau ID MP4 tidak didukung'],
    ['Unsupported MPEG-4 audio descriptor', 'Deskriptor audio MPEG-4 tidak didukung'],
    ['Unsupported audio duration or track flags', 'Durasi audio atau flag track tidak didukung'],
    ['Unsupported audio edit rate', 'Rate edit audio tidak didukung'],
    ['Unsupported audio edits', 'Edit audio tidak didukung'],
    ['Unsupported audio sample table', 'Tabel sample audio tidak didukung'],
    ['Unsupported leading audio edit', 'Edit audio di bagian awal tidak didukung'],
    ['Use an MP4 with exactly one AAC-LC stereo track', 'Pakai MP4 dengan tepat satu track audio AAC-LC stereo'],
    ['Use an unencrypted AAC-LC stereo MP4', 'Pakai MP4 AAC-LC stereo yang tidak terenkripsi'],
    ['Use ordinary AAC-LC stereo with 1024-sample frames', 'Pakai AAC-LC stereo biasa dengan frame 1024 sample'],
    // — Standar / Custom —
    ['Audio is not AAC (mp4a), unsupported.', 'Audio bukan AAC (mp4a), tidak didukung.'],
    ['mvhd box not found.', 'Box mvhd tidak ditemukan.'],
    ['Invalid video buffer.', 'Buffer video tidak valid.'],
    ['Not a valid MP4/MOV file.', 'Bukan file MP4/MOV yang valid.'],
    ['Invalid output MP4 container (moov/mdat missing).', 'Container MP4 hasil encode tidak valid (moov/mdat hilang).'],
    ['File too large (>4 GB) for Re:Hine standar.', 'File terlalu besar (>4 GB) untuk Re:Hine standar.'],
    ['Video file is empty.', 'File video kosong.'],
    ['Unsupported audio format (needs AAC-LC mono/stereo, max 48 kHz).', 'Format audio tidak didukung (butuh AAC-LC mono/stereo, maks 48 kHz).'],
    ['Fragmented MP4 is not supported.', 'Fragmented MP4 tidak didukung.'],
    ['Input must be a Uint8Array or ArrayBuffer.', 'Input harus berupa Uint8Array atau ArrayBuffer.'],
    ['Audio configuration (esds) could not be read.', 'Konfigurasi audio (esds) tidak terbaca.'],
    ['Unsupported MP4 structure (needs exactly one moov and one mdat).', 'Struktur MP4 tidak didukung (butuh tepat satu moov dan satu mdat).'],
    ['Video track not found in the output MP4.', 'Track video tidak ditemukan pada MP4 hasil encode.'],
    // — pemeriksaan hasil (verify.js) —
    ['64-bit atom header truncated', 'header atom 64-bit terpotong'],
    ['atom size too large', 'ukuran atom terlalu besar'],
    ['atom structure incomplete', 'struktur atom tidak utuh'],
    ['ftyp/moov/mdat atoms incomplete', 'atom ftyp/moov/mdat tidak lengkap'],
    ['mvhd missing', 'mvhd tidak ada'],
    ['movie duration is infinite', 'durasi film tak hingga'],
    ['movie duration is 0', 'durasi film 0'],
    ['no video track', 'track video tidak ada'],
    ['no audio track', 'track audio tidak ada'],
    ['Missing moov/mdat', 'moov/mdat tidak ada'],
    ['Invalid mvhd duration', 'Durasi mvhd tidak valid'],
    ['Shared audio stco mismatch', 'stco audio bersama tidak cocok'],
    ['Shared audio stco bytes differ', 'Byte stco audio bersama berbeda'],
    // — kartu upload —
    ['patch module not loaded', 'modul patch tidak termuat']
  ];
  // Awalan "label: alasan" — alasannya diterjemahkan secara terpisah. [Inggris, Indonesia]
  const PREFIXES = [
    ['Result check failed: ', 'Pemeriksaan hasil gagal: '],
    ['Result verification failed: ', 'Verifikasi hasil gagal: '],
    ['check failed: ', 'pemeriksaan gagal: ']
  ];

  const toId = new Map(PAIRS.map(([en, id]) => [en, id]));
  const toEn = new Map(PAIRS.map(([en, id]) => [id, en]));

  function errText(message, lang) {
    const msg = String(message == null ? '' : message);
    const id = lang === 'id';
    const table = id ? toId : toEn;
    if (table.has(msg)) return table.get(msg);
    for (const [en, ind] of PREFIXES) {
      for (const p of [en, ind]) {
        if (msg.startsWith(p)) return (id ? ind : en) + errText(msg.slice(p.length), lang);
      }
    }
    let m = /^ukuran atom (.+) tidak valid$/.exec(msg);
    if (m) return id ? msg : 'atom ' + m[1] + ' size is invalid';
    m = /^atom (.+) size is invalid$/.exec(msg);
    if (m) return id ? 'ukuran atom ' + m[1] + ' tidak valid' : msg;
    return msg;
  }

  R.errText = errText;
  R.errPairs = PAIRS;
})();
