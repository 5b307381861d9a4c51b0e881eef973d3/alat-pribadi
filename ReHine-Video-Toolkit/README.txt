ReHine — STRUKTUR MODULAR

PENEMPATAN FILE
manifest.json
  Konfigurasi ekstensi, izin, urutan pemuatan modul, dan service worker analyzer.

engine/
  engine-core.js   : inti ReHineEngine; dipertahankan byte-for-byte dari paket sebelumnya.
  engine-ui.js     : UI pemrosesan file MP4 lokal.
  engine.html      : halaman tool ReHineEngine.
  media-worker.js  : service worker pendukung engine.

analyzer/
  cutefish-analyzer.js : analisis statistik TikTok via CuteFish API, spesifikasi media, engagement, tombol salin.

integration/
  content.js       : jembatan/penghubung halaman TikTok, panel upload ReHine, dan analyzer.

ui/
  popup.html       : popup utama ekstensi.
  popup.js         : aksi tombol Buka Engine Video dan TikTok Studio.

CARA MEMASANG
1. Ekstrak ZIP ke satu folder.
2. Pada Kiwi Browser, buka halaman ekstensi yang mendukung pemuatan ekstensi lokal/unpacked.
3. Aktifkan Developer mode bila tersedia, lalu pilih Load unpacked dan pilih folder ReHine-Video-Toolkit (folder yang berisi manifest.json).
4. Buka halaman video TikTok publik. Panel hanya muncul; analisis TIDAK berjalan otomatis. Tekan ANALISIS VIDEO saat ingin mengambil data.
5. Buka popup ekstensi lalu tekan BUKA ENGINE VIDEO untuk memilih file MP4 dan memprosesnya secara lokal.

CATATAN
- Analyzer memerlukan internet dan layanan https://cutefish.my.id; hasil bergantung pada API pihak ketiga.
- FPS dan resolusi berasal dari endpoint FPS; bitrate adalah estimasi ukuran file/durasi.
- Status NFF/NR ditampilkan berdasarkan nilai is_nff_or_nr dari endpoint tiktok-resolve; ini merupakan indikator API, bukan verifikasi independen dari TikTok.
- ReHineEngine memodifikasi struktur MP4; uji dengan salinan file. Ini bukan peningkatan kualitas gambar dan hasil bisa tidak kompatibel pada sebagian pemutar/platform.
- Struktur dan sintaks diperiksa secara lokal; belum diuji langsung di Kiwi Browser pada perangkat pengguna.
