REHINE VERSION CHECKER

File version.json harus berada di root repository GitHub, sejajar dengan folder ReHine-Video-Toolkit.

Pemeriksaan versi berjalan saat popup dibuka dan dapat dijalankan ulang melalui tombol PERIKSA PEMBARUAN.

PENTING:
- Repository GitHub saat ini dibuat Private. Endpoint raw.githubusercontent.com tidak dapat dibaca oleh extension tanpa autentikasi.
- Untuk mengaktifkan pemeriksaan versi tanpa token di extension, ubah repository menjadi Public atau host version.json di lokasi publik.
- Jangan pernah menanam Personal Access Token atau private SSH key ke dalam extension.
- Download Update membuka arsip ZIP branch main. Browser extension yang dipasang manual tetap perlu diperbarui/reload secara manual; extension tidak dapat mengganti file dirinya sendiri secara diam-diam.

Untuk rilis baru: naikkan version pada manifest.json dan version.json (misalnya 1.0.1), lalu commit dan push. Isi notes dengan ringkasan perubahan.

ZIP SIAP PASANG (v1.0.125+)
- Zip dari "archive/refs/heads/main.zip" GitHub selalu berpembungkus folder (alat-pribadi-main/ReHine-Video-Toolkit/...), sehingga tidak bisa dipasang langsung lewat "+ (from .zip/.crx/.user.js)" di Kiwi.
- Karena itu repo menyimpan dist/rehine-extension.zip: isinya langsung manifest.json, ui/, core/, pro/, dst. (tanpa folder pembungkus).
- version.json -> download_url menunjuk ke berkas itu. Tombol "Perbarui" di pop-up mengunduhnya lalu membuka halaman extension.
- Setiap rilis: naikkan versi (manifest.json, version.json, README.md), bangun ulang dist/rehine-extension.zip dari isi folder ReHine-Video-Toolkit, lalu unggah semuanya ke GitHub. Jika dist tidak ikut diperbarui, pengguna mengunduh versi lama.
- Pemberitahuan update: pop-up membaca version.json saat dibuka; bila versinya lebih baru dari manifest, muncul dialog "Pembaruan tersedia" (Kembali / Perbarui).
