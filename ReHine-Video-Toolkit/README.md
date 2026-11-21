# RE:HINE Uploader v1.0.127

Ekstensi Chrome (Manifest V3) untuk upload langsung lewat TikTok Studio.

## Instalasi
Ekstrak, buka `chrome://extensions`, aktifkan Developer mode, lalu Load unpacked dan pilih folder ini.

## Saklar di popup
| Saklar | Efek |
|---|---|
| UPLOADER AKTIF / MATI | Post dipaksa Private, kartu upload tampil, video URL hook aktif, badge jadi OFF saat mati |
| CAPTION AKTIF / MATI | Menambahkan tanda tangan ke caption |
| MODE (di bawah saklar) | Cara video diproses sebelum dikirim ke TikTok. **Hanya berlaku saat UPLOADER AKTIF**; saat MATI pilihan MODE dinonaktifkan dan video dikirim apa adanya |

## MODE patch
Dijalankan saat kamu memilih/drop video di kartu upload, **sebelum** video dibaca dan info (resolusi, FPS, ukuran, bitrate, codec) ditampilkan. Info yang tampil adalah info video hasil patch, dan file hasil patch itulah yang diteruskan ke TikTok.

| MODE | Yang dilakukan |
|---|---|
| Standar | Metode HIDZZ (core asli HIDZZ Uploader 1.4.1): struktur dibangun ulang (3 track, ekor senyap, durasi diatur), tag artist "Re:Hine" + komentar. **Default** |
| High | sl-sr "CompressBase" (ADJN Patcher 4.0, kredit: F R Y 60fps & Adekjamannow): patch langsung tanpa membangun ulang video (potongan Blob, tidak menyalin seluruh file). Menambah track audio kedua + ekor senyap + komentar. Syarat: AAC-LC stereo, 1 track audio, MP4 biasa. Video tanpa audio atau dengan audio mono/multi-track ditolak (otomatis dialihkan ke Standar) |
| Optimasi | File dikirim **apa adanya** (varian "original": tanpa patch, tanpa fallback); TikTok yang mengoptimasi. **Peringatan:** Optimasi tidak mendukung HDR/Dolby Vision dan video di atas 720p kemungkinan terkompresi menjadi 720p/HD. |

Semua mode menulis komentar sesuai namanya: **"By Re:Hine standar"**, **"By Re:Hine high"** (tag `©cmt`, terbaca sebagai `Comment: By Re:Hine high`, dst.). 

Syarat: Lite dan Standar menerima MP4/MOV biasa (bukan fragmented, maks. ~4 GB) dengan audio AAC apa pun; video tanpa audio diberi audio senyap. High butuh tepat 1 track audio AAC-LC stereo. Bila High menolak video (mis. tanpa audio, mono, atau multi-track), otomatis dipakai Standar dan muncul pesan alasannya. Hasil semua mode diperiksa strukturnya (jumlah track, ftyp/moov/mdat, durasi valid) dan kartu menampilkan mis. `✓ 1V+2A`. Standar dan Standar memuat seluruh file ke memori, jadi ada peringatan bila file lebih dari 300 MB. Bila patch atau pemeriksaan gagal, video asli tetap dikirim dan muncul pesan "Patch gagal, video asli dikirim: …".

Pilihan MODE disimpan di `rehineMode` (nilai `optimasi`, `standar`, `high`). Nilai lama dimigrasi otomatis: `custom`/`beta3`/`test` → standar, `beta2`/`beta4` → high, `beta` → optimasi (atau high/standar menurut `rehineBetaAudio` lama). Kunci lama (`rehineFakeSize`, `rehineBeta*`) dihapus saat popup dibuka. `lite`/`v1`/`v3`, jatuh ke Standar).

Caption akhir saat CAPTION aktif:

```
<caption kamu>

Metode upload by @ariefee10
```

## Struktur folder
```
manifest.json
background/
  service-worker.js          menyalakan aturan desktop-mode
  desktop-rule.js            aturan header User-Agent desktop (hanya di browser HP)
core/                        mesin patch MP4 (script klasik, namespace RehineCore)
  patch-standard.js          mode Standar: core patcher HIDZZ (di-rebrand)
  patch-compressbase.js      mode High: sl-sr CompressBase (ADJN, kredit asli di header)
  i18n-errors.js             terjemahan pesan galat EN <-> ID
  verify.js                  pemeriksaan struktur file hasil patch (semua mode)
  modes.js                   pemilih MODE, fallback High -> Standar, memanggil pemeriksaan
content/
  main-world/                berjalan di halaman TikTok (bisa mengubah fetch/XHR)
    desktop-mode.js          UA + viewport desktop di sisi halaman
    caption-signature-hook.js  tanda tangan "Metode upload by @ariefee10"
    publish-request-hook.js    hashtag + paksa Private
    video-url-hook.js          blob video diganti blob dummy 8-byte
  isolated/                  berjalan di sisi ekstensi (akses chrome.storage)
    status-badge.js          badge ACTIVE/NOT ACTIVE/OFF + meneruskan saklar ke hook
    upload-card.js           kartu upload (pilih/drop video -> MODE patch -> info video -> kirim ke TikTok)
    video-meta.js            pembaca metadata MP4/MOV
ui/
  popup/                     popup.html + popup.js
  shared/                    tiktok-stats.js, updater.js, theme.js
styles/                      style.css, upload-card.css
```

## Mengubah pengaturan
- Hashtag (kosong secara default) dan privasi: bagian atas `content/main-world/publish-request-hook.js` (`HASHTAG_LIST`, `FORCE_PRIVATE`).
- Handle dan label tanda tangan: bagian atas `content/main-world/caption-signature-hook.js` (`SIGNATURE_LABEL`, `MENTIONS`).

## Catatan
- `assets/*.mp4` berukuran 0 byte di zip asli (placeholder). Ganti dengan video sendiri; bila kosong, UI otomatis jatuh ke latar polos.
- Hook bergantung pada pola URL publish TikTok; jika TikTok mengubahnya, perlu disesuaikan.
- Setelan lama (`hidzz*`) tidak dibawa; kunci penyimpanan sekarang `rehineUploader`, `rehineCaption`, `rehineLang`, `rehineMode`.
- Modul di `core/` berasal dari `mp4-patcher-extension-v9`; hanya dibungkus jadi script klasik (tanpa `import`/`export`), logika tidak diubah. Hasilnya diuji identik dengan modul asli.


## Deskripsi & tagar otomatis (v1.0.48)
- Kolom **DESKRIPSI** di popup: bila diisi, menggantikan caption yang diketik di TikTok Studio saat publish (kosong = caption Studio dipakai). `#tagar` di dalamnya jadi hashtag sungguhan.
- **TAGAR OTOMATIS**: menambahkan tagar dari video yang dipilih, mis. 1280×720 30 fps → `#hd #720p #30fps` (4k/2k/fullhd/hd/sd, `NNNp`, `NNfps`).
- Keduanya berjalan sendiri, tidak butuh saklar CAPTION. CAPTION (tanda tangan "Metode upload by") tetap terpisah dan ditambahkan paling akhir.
- Tombol HAPUS mengosongkan deskripsi; deskripsi juga otomatis kosong setiap extension di-refresh/di-reload.

- v1.0.48: uid + sec_uid mention @ariefee10 dicari sejak halaman dibuka dan diulang sampai berhasil (publish menunggu maks. 8 dtk). Saklar CAPTION merah sampai ketemu, lalu hijau. Deskripsi dikosongkan saat extension di-refresh/diperbarui, browser dibuka ulang, atau halaman TikTok di-refresh (F5).
- v1.0.48: deskripsi juga dikosongkan setiap popup dibuka; keterangan teks status mention dihapus (saklar CAPTION tetap merah/hijau).
- v1.0.48: saklar CAPTION tetap hijau selama halaman TikTok terbuka (tidak kedaluwarsa); kembali merah bila halaman ditutup/di-refresh. Contoh tagar di popup dihapus.
- v1.0.48: keterangan "Tagar dari video terakhir" dihapus dari popup.
- v1.0.48: saklar DESKRIPSI AKTIF/MATI (mati = caption dari TikTok Studio dipakai apa adanya; teks deskripsi tidak ikut terkirim).
- v1.0.48: saklar DESKRIPSI selalu mulai MATI (popup dibuka, extension di-refresh, browser dibuka, halaman di-refresh); kotak deskripsi hanya tampil saat aktif. Urutan: DESKRIPSI, kotak, TAGAR OTOMATIS, CAPTION.
- v1.0.48: saklar DESKRIPSI, TAGAR OTOMATIS, dan CAPTION rata kiri.
- v1.0.48: keterangan di bawah saklar diganti dengan penjelasan MODE (Standar/High/Custom).
- v1.0.48: tampilan popup berbentuk kartu (UPLOADER CONTROL, TEMA & PEMBARUAN), saklar pil di kanan, tombol info (i) untuk keterangan MODE, bahasa EN / ID berupa teks.
- v1.0.48: popup bergaya dashboard (QUICK ACTIONS, kartu PENGATURAN UPLOADER dengan pilihan mode segmen + keterangan, UPDATE BAR); mengikuti semua tema.
- v1.0.48: kartu PENGATURAN UPLOADER disembunyikan selama panel TIKTOK STATISTICS terbuka.
- v1.0.48: pilihan MODE disembunyikan saat UPLOADER mati; label DESKRIPSI di kotak diganti tombol HAPUS; mematikan saklar DESKRIPSI ikut mengosongkan teksnya.
- v1.0.48: terjemahan EN/ID dilengkapi (judul menu, pilihan mode, Fake Sample Size, bilah pembaruan, nama tema).
- v1.0.48: bila popup dibuka di layar lebar / mode desktop (mis. sebagai tab), tampilan otomatis diperbesar sesuai lebar layar (maks. 2,6x); popup biasa tidak berubah.
- v1.0.48: saklar "Caption" di popup diganti nama menjadi "Kredit Pembuat" (EN: Creator Credit); fungsinya tetap menambahkan tanda tangan "Metode upload by".
- v1.0.48: pilihan tema pindah ke tombol di bawah EN/ID (muncul saat diklik) + 11 tema baru (total 20); TAGAR OTOMATIS selalu mulai mati; penghitung karakter di kiri, HAPUS di kanan.
- v1.0.48: popup otomatis memeriksa pembaruan setiap dibuka; bila ada versi baru tampil pop-up (Kembali / Perbarui). Perbarui = unduh zip lalu buka chrome://extensions/. Bilah UPDATE BAR dihapus.
- v1.0.48: versi saat ini ditampilkan di bawah "RE:HINE • RESMI"; perbaikan aturan CSS neon yang tergabung salah.
- v1.0.48: 8 tema desain AI modern (latar gradasi + permukaan kaca): Aurora, Nebula, Prisma, Kuantum, Zamrud, Grafit, Tanah Liat, Kaca. Total 28 tema, dikelompokkan di pilihan tema.
- v1.0.49: saat pilihan tema dibuka, dasbor (aksi cepat & pengaturan) disembunyikan agar bersih.
- v1.0.50: desain baru "Pusat Kontrol" (logo R, tombol ikon|label|panah, kartu Preferensi Upload, footer baru) yang ikut tema apa pun; "Caption Otomatis" tetap bernama Deskripsi.
- v1.0.51: EN/ID jadi dropdown seperti Tema; pop-up pembaruan hanya judul + versi dan hanya saat extension pertama dibuka; label baru (Statistik TikTok, Preferensi Unggah TikTok, Pengunggah); klik versi 5x menampilkan QR + salin URL unduhan.
- v1.0.52: tombol bahasa satu klik langsung ganti EN/ID, selebar tombol Tema; footer selalu OFFICIAL.
- v1.0.53: QR dibuka dengan klik versi 3x (URL tidak ditampilkan, tetap bisa disalin); deskripsi extension dihapus dari manifest.
- v1.0.54: saklar tagar diganti nama: Auto Quality Tags (EN) / Tagar Kualitas Otomatis (ID).
- v1.0.55: label saklar tagar (keadaan mati) ikut diganti jadi Auto Quality Tags / Tagar Kualitas Otomatis. Pilih video langsung di popup (PREFERENSI UNGGAH TIKTOK). Setelah dipilih, tombol jadi UNGGAH LANGSUNG KE TIKTOK: Studio dibuka dan video terisi otomatis (dikirim per 4 MB lewat service worker, sekali pakai, berlaku 3 menit). Tanpa video terpilih, kartu di halaman TikTok bekerja seperti biasa.
- v1.0.56: unggah langsung dicoba berulang sampai kartu tampil (maks. 3 menit) dan menampilkan alasan bila gagal.
- v1.0.57: popup menampilkan status percobaan unggah langsung (langkah demi langkah) dan peringatan bila halaman TikTok memakai versi extension lama.
- v1.0.58: Posting Otomatis (saklar di popup, default aktif): setelah unggah langsung, tombol Posting diklik otomatis (privasi tetap Private).
- v1.0.59: tombol UNGGAH LANGSUNG KE TIKTOK pindah ke kartu video; tombol utama selalu BUKA TIKTOK STUDIO (hanya membuka).
- v1.0.60: peringatan versi lama dihapus; tombol Buka TikTok Studio/WhatsApp/Statistik otomatis hilang saat ada video terpilih.
- v1.0.61: jendela QR hanya tertutup lewat tombol Tutup.
- v1.0.62: kartu PREFERENSI UNGGAH TIKTOK bisa dilipat dengan panah atas/bawah (kondisi diingat).
- v1.0.63: kartu preferensi selalu mulai terlipat saat popup dibuka/di-refresh; saat ada video terpilih kartu terbuka dan panahnya hilang.
- v1.0.64: BUKA TIKTOK STUDIO membuka tiktokstudio/content (unggah langsung tetap ke halaman unggah); label Private diganti Hanya saya / Only me.
- v1.0.65: saklar Posting Otomatis dihapus (UNGGAH LANGSUNG selalu posting otomatis, Hanya saya); kartu RE:HINE di halaman TikTok Studio mengikuti tema popup.
- v1.0.66: popup mode desktop/tab pas layar penuh (zoom tepat selebar layar, latar tema memenuhi jendela, footer di bawah).
- v1.0.67: footer/versi diberi jarak minimum dan tinggi layar dihitung dari beberapa sumber (innerHeight, visualViewport) + dihitung ulang setelah load.
- v1.0.91: footer + versi di mode lebar ditempel ke dasar layar dengan position:fixed (tidak lagi bergantung pada hitungan tinggi layar).
- v1.0.91: video kini diproses LANGSUNG di popup (tanpa fallback otomatis: bila tidak cocok, popup meminta mengganti mode manual); kartu di halaman TikTok Studio diganti animasi loading; Deskripsi & privasi "Hanya saya" diisi di halaman; tagar tambahan maks. 5 hashtag; mode Custom/Beta/Test dihapus, Optimasi = file apa adanya.
- v1.0.91: kartu popup menampilkan resolusi, FPS, bitrate, dan codec video (chip H.264/H.265 & MP4/MOV ikut menyala); info dibaca dari box ftyp+moov saja, tanpa memuat seluruh file.
- v1.0.91: perbaikan tagar dobel di kolom Deskripsi (isi diganti sekali lewat paste, idempoten, tanpa menumpuk); pencarian dropdown privasi diperluas; langkah deskripsi/privasi dibatasi waktu (40 dtk / 25 dtk) agar Posting otomatis tidak tertahan; hasilnya tercatat di log popup (caption: … · private: …).
- v1.0.91: kolom Deskripsi di popup membatasi hashtag maksimal 5 secara total (tagar yang diketik + tagar otomatis bila saklarnya menyala); '#' ke-6 ditolak, tempel banyak tagar dipotong, ada keterangan "Hashtag n/m".
- v1.0.91: dropdown privasi "Hanya saya" di halaman: daftar saran hashtag ditutup lebih dulu (spasi akhir + Escape + lepas fokus) dan klik memakai rangkaian pointerdown/mousedown/mouseup/click; kode gagal di log popup menyertakan elemen yang dicoba.
- v1.0.92: animasi loading bertema (warna mengikuti tema popup, logo RE:HINE, cincin neon, bar progres %); privasi "Hanya saya" dicek & diulang selama menunggu dan sekali lagi tepat sebelum klik Posting (TikTok kadang mengembalikan ke "Semua orang"), plus cadangan lewat papan ketik.
- v1.0.93: penyebab privasi gagal ketemu: TikTok menamai pilihannya "Hanya Anda" (bukan "Hanya saya") — kini dikenali ("hanya anda"/"only you"); Posting otomatis tidak lagi menunggu jeda pemeriksaan (TikTok memeriksa di latar belakang); latar animasi loading memakai video assets/bg.mp4 (mata Gojo, tanpa suara) dengan lapisan gelap berwarna tema; bg.mp4 didaftarkan di web_accessible_resources.
- v1.0.94: klik pilihan "Hanya Anda" lebih lengkap (hover + pointer + mouse + klik asli pada elemen yang benar-benar tampil di titik itu), dropdown yang sudah terbuka tidak diklik ulang (sebelumnya menutup-buka terus), cadangan papan ketik (ArrowDown + Enter); batas waktu langkah dipangkas (deskripsi 25 dtk, privasi 14 dtk) supaya Posting tidak tertahan; kegagalan mencatat elemen yang diklik di log popup (private: noverify[klik>opsi]).
- v1.0.95: perbaikan error "toastTimer is not defined" (variabel hilang saat penulisan ulang v1.0.91) yang menghentikan Posting otomatis begitu pesan "menunggu TikTok…" muncul; Posting otomatis kini juga membungkus kesalahan ke log popup; semua file diperiksa no-undef (bersih).
- v1.0.96: langkah memindah dropdown ke "Hanya Anda" dihapus (privasi tetap dipaksa Private di level request); Posting otomatis kini 1 detik setelah tombol Posting aktif (polling 0,3 dtk), tanpa jeda privasi.
- v1.0.97: MODE PRO baru (tombol keempat): seluruh alur CompressBase v1.5.1 dipasang di folder pro/ (mesin OBX & Nova, ffmpeg.wasm lokal, downscale ke 1080p, MKV/WebM/MOV→MP4 tanpa re-encode); pilihan Mesin (OBX/Nova) dan Persiapan (Normal 1080p / Ukuran TikTok / Anti Lag 7 Mbps) di popup; status & persen tampil di kartu; manifest ditambah CSP wasm-unsafe-eval. Ukuran paket bertambah ±10 MB (ffmpeg.wasm).
- v1.0.98: Anti Lag di mode Pro kini porting skrip Python "under20mb": H.264 2-pass di bawah 20 MB, maks 1080p, frame tidak digeser (-fps_mode passthrough), audio AAC 128k, hingga 3 percobaan menurunkan bitrate, lalu di-patch mesin OBX/Nova; lewat ffmpeg.wasm lokal (tanpa tonemap HDR & tanpa verifikasi timestamp per-frame). Perbaikan: pilihan Mesin/Persiapan Pro kini benar-benar terbaca dari penyimpanan.
- v1.0.99: info video seperti CompressBase (format · resolusi · FPS · durasi · codec · audio kHz/Stereo · ukuran) tampil di kartu; tombol Batalkan saat memproses (membatalkan ffmpeg/proses & membersihkan); mode Standar & High dihapus (tersisa Optimasi & Pro; pengaturan lama otomatis jadi Pro, bawaan Pro); file patch-standard/patch-compressbase dihapus.
- v1.0.100: keterangan "Pro: Alur lengkap CompressBase…" dihapus (kotak keterangan disembunyikan bila kosong).
- v1.0.101: pilihan Pemroses di mode Pro: Browser (ffmpeg.wasm) atau Termux (ffmpeg native lewat server lokal termux/rehine_server.py, 127.0.0.1:8787, hanya menerima extension). Dipakai untuk Ukuran TikTok & Anti Lag (<20 MB): Anti Lag penuh seperti skrip Python (2-pass, tonemap HDR, verifikasi frame/timing), progres & Batalkan tetap jalan; pesan jelas bila server mati. Petunjuk setup di termux/README.md. host_permissions + http://127.0.0.1/*.
- v1.0.102: tombol "Salin" di sebelah Pemroses (muncul saat Termux dipilih): satu perintah untuk ditempel di Termux (pasang python+ffmpeg, tulis server, jalankan di LATAR BELAKANG sehingga terminal tidak tersangkut); memilih video tidak lagi langsung memproses — tampil info + tombol "PROSES VIDEO"; server Termux membersihkan berkas sementara otomatis (gagal/batal/tiap menit/saat mulai & berhenti); izin clipboardWrite.
- v1.0.103: perintah Termux hanya memasang python/ffmpeg bila belum ada (tidak mengunduh ulang tiap dijalankan).
- v1.0.104: baris Pemroses/Mesin/Persiapan dirapikan (label seragam 24px sehingga kotak pilihan sejajar walau ada tombol Salin; perbaikan deklarasi font yang membuat tombol & pilihan terlalu besar).
- v1.0.105: nama pilihan: "Browser (lambat)", mesin "EDITING NEWS" (OBX) dan "Nova", persiapan "Anti Lag"; baris Pemroses/Mesin/Persiapan dipastikan tersembunyi di mode Optimasi (hanya untuk Pro).
- v1.0.106: saklar "Max" di sebelah Mesin (mode Pro): aktif -> "Normal (maks. 4K)" (video sampai 4K tidak diturunkan ke 1080p) dan pilihan "Ukuran TikTok" otomatis hilang (bila terpilih pindah ke Normal); video di atas 4K ditolak dengan pesan jelas; pilihan tersimpan.
- v1.0.107: Anti Lag ikut saklar Max: Max aktif -> resolusi 720p sampai 4K dipertahankan (batas 4K, bukan 1080p) dan tetap di bawah 20 MB (2-pass); berlaku di Browser maupun Termux (server Termux diperbarui, salin ulang perintahnya).
- v1.0.108: Anti Lag mode Max diperbaiki sesuai maksud: resolusi TIDAK diubah sama sekali, hanya batas MB yang disesuaikan per resolusi (20 MB x (piksel/1080p)^0.75: 720p ≈ 11 MB, 1080p 20 MB, 1440p ≈ 31 MB, 4K ≈ 57 MB); tanpa Max tetap seperti biasa (maks 1080p, <20 MB). Browser & Termux (salin ulang perintah Termux).
- v1.0.109: Max + Pemroses Browser -> pilihan Anti Lag otomatis hilang (tersisa "Normal (maks. 4K)"; Anti Lag tetap ada untuk Termux); tanpa Max, video di atas 1080p tidak bisa diproses (tombol PROSES VIDEO nonaktif + peringatan untuk mengaktifkan Max atau memilih video <=1080p).
- v1.0.110: saklar T/W di sebelah versi. T = preferensi TikTok (Uploader pindah ke bawah, Deskripsi tanpa saklar). W = preferensi WhatsApp (hanya Pemroses/Mesin/Persiapan tanpa "Ukuran TikTok", deskripsi langsung aktif, tombol Bagikan ke WhatsApp; belum diuji di Kiwi).
- v1.0.111: mode W kini mengunggah ke Status WhatsApp Web (digabung dari WA Status Video Uploader: background/wa-status.js + content/isolated/wa-status.js). Izin baru: tabs, scripting, web.whatsapp.com. Diuji hanya dengan halaman WA palsu; langkah klik DOM WhatsApp asli belum diuji.
- v1.0.112: deskripsi dipindah ke atas Pemroses/Mesin; saklar @ (Kredit Pembuat), # (Tagar Kualitas) dan ikon unggah (Pengunggah) ada di sebelah catatan Hashtag. W tanpa Max. Ganti T/W mengosongkan video terpilih; setelah status WhatsApp terkirim, video otomatis dikosongkan.
- v1.0.113: WA Status: jalur utama kini drop video langsung ke "Area lepas file status" (tanpa foto sementara); jalur lama jadi cadangan dengan tunggu 20 dtk + klik menu Foto & video; pesan gagal menyebut langkah yang gagal; debug mencantumkan input file. Diuji dengan halaman WA palsu saja.
- v1.0.114: saklar T/W jadi "TikTok"/"WhatsApp". Unggah WA kini membuka WhatsApp Web di depan (jendela, atau tab biasa bila jendela popup tidak didukung) dan meminta pengguna tetap di halaman itu sampai selesai.
- v1.0.115: WA: log juga dikirim lewat storage (popup tidak lagi macet di pesan awal); notifikasi (izin notifications) untuk belum login / selesai / error; bila belum login, halaman WhatsApp dibiarkan terbuka agar bisa scan QR. Diuji dengan halaman WA palsu.
- v1.0.116: WA: pengisian keterangan diperbaiki (pilih kolom di luar pencarian/daftar chat, 3 cara isi: ketik, paste, input event; baris baru didukung; diverifikasi sebelum kirim; bila gagal tidak dikirim otomatis). Diuji dengan halaman WA palsu.
- v1.0.117: WA: alur dikembalikan ke foto 1x1 -> video -> isi keterangan (pada video) -> hapus foto -> kirim (jalur drop dinonaktifkan). Tidak diuji dengan WA asli.
- v1.0.118: WA: layar loading RE:HINE (orb + bar progres) menutupi halaman WhatsApp selama proses unggah; hilang otomatis saat selesai atau gagal (agar daftar diagnosa terlihat).
- v1.0.119: WA: animasi loading bersih (tanpa teks langkah, hanya "Selesai ✅" di akhir); di mode WhatsApp video tidak diserahkan ke TikTok Studio (rehinePending tidak ditulis) dan video sisa dari TikTok dikosongkan saat popup dibuka di W.
- v1.0.120: WA: animasi loading menampilkan persentase di tengah lingkaran; chip status kartu video di mode WhatsApp (belum ada video) menjadi "Uploader mati".
- v1.0.121: WA: indikator atas "Siap untuk digunakan" menjadi "Uploader mati" selama belum ada video dipilih (TikTok tidak berubah).
- v1.0.122: WA: Pemroses ditambah "Original (apa adanya)" (hanya di W): Mesin & Persiapan hilang, video dikirim tanpa diubah (ukuran keluar = masuk, teruji).
- v1.0.123: tombol STATISTIK TIKTOK berubah menjadi KEMBALI/BACK (panah dibalik) saat Penganalisis Metadata & Stream terbuka; menutup panel dan menampilkan kartu preferensi lagi.
- v1.0.124: WA + Original: setelah pilih video langsung muncul UNGGAH KE STATUS WHATSAPP (tanpa PROSES VIDEO); perbaikan pesan palsu "Mode berubah setelah video ini diproses" pada mode Original.
- v1.0.125: pembaruan memakai dist/rehine-extension.zip (manifest.json di akar zip, bisa langsung dipasang di Kiwi); download_url & cadangan di updater.js diarahkan ke sana.
- v1.0.126: W: catatan "Hashtag 0/5" dihapus dan batas 5 hashtag tidak berlaku; placeholder deskripsi khusus WhatsApp ("Tulis keterangan status di sini (opsional)."). Kembali ke T, hashtag dipangkas lagi ke batas 5.
- v1.0.127: QR unduhan (ketuk versi 3x) & tombol Salin kini menunjuk ke dist/rehine-extension.zip (zip siap pasang ~12 MB), bukan zip repo penuh; QR dibuat ulang dan diverifikasi terbaca.
