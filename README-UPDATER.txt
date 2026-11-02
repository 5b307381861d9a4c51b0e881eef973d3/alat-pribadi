REHINE VERSION CHECKER

File version.json harus berada di root repository GitHub, sejajar dengan folder ReHine-Video-Toolkit.

Pemeriksaan versi berjalan saat popup dibuka dan dapat dijalankan ulang melalui tombol PERIKSA PEMBARUAN.

PENTING:
- Repository GitHub saat ini dibuat Private. Endpoint raw.githubusercontent.com tidak dapat dibaca oleh extension tanpa autentikasi.
- Untuk mengaktifkan pemeriksaan versi tanpa token di extension, ubah repository menjadi Public atau host version.json di lokasi publik.
- Jangan pernah menanam Personal Access Token atau private SSH key ke dalam extension.
- Download Update membuka arsip ZIP branch main. Browser extension yang dipasang manual tetap perlu diperbarui/reload secara manual; extension tidak dapat mengganti file dirinya sendiri secara diam-diam.

Untuk rilis baru: naikkan version pada manifest.json dan version.json (misalnya 1.0.1), lalu commit dan push. Isi notes dengan ringkasan perubahan.
