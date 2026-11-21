# RE:HINE — pemroses Termux (cepat)

Mode **Pro → Pemroses: Termux (cepat)** mengirim video ke server kecil di HP-mu (`127.0.0.1`), yang menjalankan **ffmpeg native**
(jauh lebih cepat daripada ffmpeg di browser). Berlaku untuk persiapan **Ukuran TikTok** dan **Anti Lag (<20 MB)**;
"Normal" tetap diproses di browser. Setelah itu patch OBX/Nova berjalan seperti biasa.

## Setup (sekali saja, tanpa berkas manual)
1. Di popup pilih **Pemroses: Termux (cepat)**, lalu tekan tombol **Salin** di sebelahnya.
2. Buka Termux, **tempel** (paste) dan jalankan. Perintah itu memasang python & ffmpeg, menulis `~/rehine_server.py`,
   (pemasangan hanya bila belum ada) lalu menjalankan server **di latar belakang** (terminal langsung bebas dipakai).
3. Hentikan server kapan saja: `pkill -f rehine_server.py`. Jalankan ulang dengan menempel perintah yang sama.

## Penyimpanan
Berkas sementara hanya di folder temp Termux, otomatis dihapus: setelah hasil diambil, saat gagal/dibatalkan, tiap menit untuk sisa lama,
dan seluruhnya saat server mulai/berhenti. Yang tersisa permanen hanya `~/rehine_server.py` (±14 KB). Tidak menulis ke penyimpanan HP/galeri.

## Catatan
- Server hanya mendengarkan `127.0.0.1` dan menolak permintaan dari situs web; hanya extension yang diterima.
- Anti Lag = port skrip `under20mb`: 2-pass H.264 < 20 MB, maks 1080p, tonemap HDR, verifikasi jumlah frame & timing (±1 ms).
- Ukuran TikTok = maks 1080p, CRF 24, frame tidak digeser.
- Bila server mati, popup menampilkan pesan jelas; ganti Pemroses ke Browser sebagai cadangan.
