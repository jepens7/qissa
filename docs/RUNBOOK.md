# Runbook — operasional Qissa

Untuk satu orang yang mengoperasikan produksi. Setiap prosedur ditulis supaya bisa dijalankan saat lelah, jam 2 pagi, dari HP bila perlu.

## 1. Deploy
- Produksi: CI PR hijau → merge ke `main` → Easypanel membangun image dari push itu tanpa menunggu CI di `main` (ADR-012) → live dalam 3–5 menit. Cek `https://qissah.id/healthz` dan buka satu episode di HP.
- Staging: push ke `staging` → `staging.qissah.id`. Manifest staging boleh memuat episode `draft`.
- Rollback: Easypanel → service `qissa` → Deployments → pilih image sebelumnya → Redeploy. Waktu: 1 menit. Konten (manifest dan episode) ikut kembali seketika. App shell hasil rollback baru dipakai perangkat yang sudah punya service worker setelah pembaca mengetuk "Muat ulang" di baris "Versi baru tersedia" atau menutup semua tab dan aplikasi Qissa; muat ulang biasa tidak cukup (ADR-017). Saat memeriksa di HP sendiri, ketuk "Muat ulang" atau hapus data situs.

## 2. Rilis konten (episode baru)
1. PR `content:` dengan `episode.qs.md`, `dalil.md` (`status: reviewed`, `reviewed_by`, `reviewed_at`), dan entri manifest dengan `rilis`.
2. CI: `qs lint`, `qs compile`, tes jelajah.
3. Merge ke `staging`, baca tuntas di HP.
4. Merge ke `main`. Episode tampil otomatis pada tanggal `rilis` (Asia/Jakarta) tanpa deploy tambahan.

## 3. Ramadan: rotasi harian
- Semua episode malam 1–10 sudah di `main` dengan tanggal `rilis` masing-masing sebelum 20 Januari; malam 11–30 menyusul per 10 hari.
- Setiap pagi (10 menit): cek Umami: `mulai` dan `selesai` episode semalam; cek `halo@qissah.id` untuk masukan (templat masukan mengarah ke sana); cek uptime.
- Setiap sore (15 menit): tulis pesan saluran WA untuk malam ini (judul, satu kalimat dilema, tautan `#epNN`).
- Kalau sakit atau tidak bisa: tidak ada yang perlu dilakukan; rilis sudah terjadwal. Pesan saluran bisa dijadwalkan lewat fitur jadwal WhatsApp Business bila tersedia, atau dilewati.

## 4. Pemantauan
- Uptime: pemantau eksternal (mis. UptimeRobot gratis) ke `https://qissah.id/healthz` setiap 5 menit, notifikasi ke email dan WhatsApp.
- Analitik: dasbor Umami; alarm manual bila completion harian turun di bawah 40% dua hari berturut-turut (periksa konten, bukan fitur).
- Log nginx: 7 hari, hanya dilihat saat insiden.

## 5. Cadangan
- Umami (PostgreSQL), dan PocketBase (`pb_data`) bila dibangun setelah Ramadan: snapshot harian oleh Easypanel ke penyimpanan objek (S3-kompatibel) dengan retensi 14 hari. Uji pemulihan sekali sebelum Ramadan.
- Repo GitHub adalah cadangan konten dan kode. Keystore Android dicadangkan terenkripsi di dua tempat terpisah dari repo.

## 6. Pemulihan akses (bus factor)
Satu dokumen di password manager berisi: registrar domain, DNS, VPS, Easypanel, GitHub, Play Console, Umami, PocketBase, saluran WhatsApp, Kitabisa, email pereview. Satu orang tepercaya (keluarga) memegang akses darurat ke password manager dengan instruksi: "kalau saya tidak bisa dihubungi 14 hari, matikan tagihan yang tidak perlu dan beri tahu pembaca lewat saluran".

## 7. Insiden: kontroversi konten
Pemicu: episode atau potongan episode dipelintir di media sosial, atau pereview menarik persetujuan.
1. Dalam 1 jam: sembunyikan episode terkait dengan mengubah `rilis` ke tanggal jauh di masa depan (satu PR kecil, merge ke `main`); konfirmasi di HP sesudah Qissa ditutup dari daftar aplikasi terbaru lalu dibuka lagi, karena sesi yang masih hidup memakai manifest lama. Menyembunyikan ep01 ikut menyembunyikan poll di landing, tetapi pratinjau tautan (`og:description` di `apps/web/index.html` dan `og.png`) tetap memuat dilema ep01; menggantinya butuh PR kode.
2. Dalam 4 jam: hubungi pereview episode itu; sepakati apakah perlu revisi, klarifikasi, atau penarikan.
3. Dalam 24 jam: satu pernyataan singkat di saluran WA dan halaman "Tentang": apa yang terjadi, apa yang diubah, siapa yang mereview. Tidak berdebat di kolom komentar.
4. Setelah tenang: catat di `docs/DECISIONS.md` bila ada aturan konten yang berubah.

## 8. Insiden: keamanan
- Dugaan kebocoran kredensial: ganti kata sandi akun terkait, cabut token, periksa deployment dan DNS, catat waktu dan tindakan.
- Spam feedback (bila form PocketBase dibangun setelah Ramadan): naikkan rate limit di hook PocketBase atau matikan create sementara (ubah aturan koleksi).
- Sertifikat kedaluwarsa: Easypanel memperbarui otomatis; bila gagal, tekan "Renew" di panel domain.
- Mengubah header keamanan (CSP dan lainnya) di `nginx.conf`: HTML yang di-precache service worker menyimpan header lamanya, jadi perubahan baru sampai ke pembaca lama bila deploy yang sama juga mengubah app shell (misalnya menaikkan `version` di `apps/web/package.json`) dan pembaca mengetuk "Muat ulang" (ADR-017).

## 9. Kontak dan jadwal tetap
- Pereview: nama, nomor, honor, episode yang direview (diisi).
- Pembaca Gen Z: tiga nama dan kesediaan per minggu (diisi).
- Jumat sore: tinjau angka minggu ini, perbarui `docs/ROADMAP.md`, tulis satu baris di `CLAUDE.md` bagian status.
