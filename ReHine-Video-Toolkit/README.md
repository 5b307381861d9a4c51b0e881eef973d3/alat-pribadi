# RE:HINE Uploader v1.0.44

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
| Custom | Struktur Standar (3 track) + **Fake Sample Size**: ukuran tiap sample senyap di ekor audio diatur slider 6–60 byte (muncul otomatis saat Custom dipilih). Batas bawah 6 karena frame senyap stereo yang sah minimal 6 byte. Bawaan 6 (sama dengan Standar). Komentar \"By Re:Hine custom\" |

Semua mode menulis komentar sesuai namanya: **"By Re:Hine standar"**, **"By Re:Hine high"**, **"By Re:Hine custom"** (tag `©cmt`, terbaca sebagai `Comment: By Re:Hine high`, dst.). 

Syarat: Lite dan Standar menerima MP4/MOV biasa (bukan fragmented, maks. ~4 GB) dengan audio AAC apa pun; video tanpa audio diberi audio senyap. High butuh tepat 1 track audio AAC-LC stereo. Bila High menolak video (mis. tanpa audio, mono, atau multi-track), otomatis dipakai Standar dan muncul pesan alasannya. Hasil semua mode diperiksa strukturnya (jumlah track, ftyp/moov/mdat, durasi valid) dan kartu menampilkan mis. `✓ 1V+2A`. Standar dan Custom memuat seluruh file ke memori, jadi ada peringatan bila file lebih dari 300 MB. Bila patch atau pemeriksaan gagal, video asli tetap dikirim dan muncul pesan "Patch gagal, video asli dikirim: …".

Pilihan MODE disimpan di `rehineMode` (nilai `standar`, `high`, `custom`; ukuran Custom di `rehineFakeSize`; nilai lama `v2` dipetakan ke High; nilai yang sudah dihapus, mis. `lite`/`v1`/`v3`, jatuh ke Standar).

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
  patch-standard.js          mode Standar & Custom: core patcher HIDZZ (di-rebrand)
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
assets/                      bg.mp4
```

## Mengubah pengaturan
- Hashtag (kosong secara default) dan privasi: bagian atas `content/main-world/publish-request-hook.js` (`HASHTAG_LIST`, `FORCE_PRIVATE`).
- Handle dan label tanda tangan: bagian atas `content/main-world/caption-signature-hook.js` (`SIGNATURE_LABEL`, `MENTIONS`).

## Catatan
- `assets/*.mp4` berukuran 0 byte di zip asli (placeholder). Ganti dengan video sendiri; bila kosong, UI otomatis jatuh ke latar polos.
- Hook bergantung pada pola URL publish TikTok; jika TikTok mengubahnya, perlu disesuaikan.
- Setelan lama (`hidzz*`) tidak dibawa; kunci penyimpanan sekarang `rehineUploader`, `rehineCaption`, `rehineLang`, `rehineMode`.
- Modul di `core/` berasal dari `mp4-patcher-extension-v9`; hanya dibungkus jadi script klasik (tanpa `import`/`export`), logika tidak diubah. Hasilnya diuji identik dengan modul asli.


## Deskripsi & tagar otomatis (v1.0.44)
- Kolom **DESKRIPSI** di popup: bila diisi, menggantikan caption yang diketik di TikTok Studio saat publish (kosong = caption Studio dipakai). `#tagar` di dalamnya jadi hashtag sungguhan.
- **TAGAR OTOMATIS**: menambahkan tagar dari video yang dipilih, mis. 1280×720 30 fps → `#hd #720p #30fps` (4k/2k/fullhd/hd/sd, `NNNp`, `NNfps`).
- Keduanya berjalan sendiri, tidak butuh saklar CAPTION. CAPTION (tanda tangan "Metode upload by") tetap terpisah dan ditambahkan paling akhir.
- Tombol HAPUS mengosongkan deskripsi; deskripsi juga otomatis kosong setiap extension di-refresh/di-reload.

- v1.0.44: uid + sec_uid mention @ariefee10 dicari sejak halaman dibuka dan diulang sampai berhasil (publish menunggu maks. 8 dtk). Saklar CAPTION merah sampai ketemu, lalu hijau. Deskripsi dikosongkan saat extension di-refresh/diperbarui, browser dibuka ulang, atau halaman TikTok di-refresh (F5).
- v1.0.44: deskripsi juga dikosongkan setiap popup dibuka; keterangan teks status mention dihapus (saklar CAPTION tetap merah/hijau).
- v1.0.44: saklar CAPTION tetap hijau selama halaman TikTok terbuka (tidak kedaluwarsa); kembali merah bila halaman ditutup/di-refresh. Contoh tagar di popup dihapus.
- v1.0.44: keterangan "Tagar dari video terakhir" dihapus dari popup.
- v1.0.44: saklar DESKRIPSI AKTIF/MATI (mati = caption dari TikTok Studio dipakai apa adanya; teks deskripsi tidak ikut terkirim).
- v1.0.44: saklar DESKRIPSI selalu mulai MATI (popup dibuka, extension di-refresh, browser dibuka, halaman di-refresh); kotak deskripsi hanya tampil saat aktif. Urutan: DESKRIPSI, kotak, TAGAR OTOMATIS, CAPTION.
- v1.0.44: saklar DESKRIPSI, TAGAR OTOMATIS, dan CAPTION rata kiri.
- v1.0.44: keterangan di bawah saklar diganti dengan penjelasan MODE (Standar/High/Custom).
- v1.0.44: tampilan popup berbentuk kartu (UPLOADER CONTROL, TEMA & PEMBARUAN), saklar pil di kanan, tombol info (i) untuk keterangan MODE, bahasa EN / ID berupa teks.
- v1.0.44: popup bergaya dashboard (QUICK ACTIONS, kartu PENGATURAN UPLOADER dengan pilihan mode segmen + keterangan, UPDATE BAR); mengikuti semua tema.
- v1.0.44: kartu PENGATURAN UPLOADER disembunyikan selama panel TIKTOK STATISTICS terbuka.
- v1.0.44: pilihan MODE disembunyikan saat UPLOADER mati; label DESKRIPSI di kotak diganti tombol HAPUS; mematikan saklar DESKRIPSI ikut mengosongkan teksnya.
- v1.0.44: terjemahan EN/ID dilengkapi (judul menu, pilihan mode, Fake Sample Size, bilah pembaruan, nama tema).
- v1.0.44: bila popup dibuka di layar lebar / mode desktop (mis. sebagai tab), tampilan otomatis diperbesar sesuai lebar layar (maks. 2,6x); popup biasa tidak berubah.
- v1.0.44: saklar "Caption" di popup diganti nama menjadi "Kredit Pembuat" (EN: Creator Credit); fungsinya tetap menambahkan tanda tangan "Metode upload by".
