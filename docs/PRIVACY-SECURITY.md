# Privasi dan keamanan — Qissa

## 1. Inventaris data

| Data | Di mana | Siapa yang bisa lihat | Alasan |
| --- | --- | --- | --- |
| Jalur, akhir yang dibaca, jawaban poll | localStorage perangkat | hanya pembaca | progres |
| Jawaban refleksi | localStorage perangkat | hanya pembaca | privat, tidak pernah dikirim |
| Event analitik (tujuh nama, nilai pendek) | Umami self-hosted | founder | metrik agregat |
| Masukan sukarela (templat dari “Kirim masukan ke pembuat”) | WhatsApp, email, atau aplikasi yang dipilih pembaca, paling lama 12 bulan | founder | perbaikan konten |
| Alamat IP | log nginx (7 hari), Umami (di-hash, tidak disimpan mentah) | founder | keamanan, rate limit |

Aplikasi tidak mengumpulkan: akun, email, nomor telepon, nama, lokasi, cookie pelacak, SDK pihak ketiga. Skrip Umami dipasang dengan `data-exclude-search="true"`, jadi parameter URL yang ditambahkan aplikasi lain ke tautan Qissa (misalnya `fbclid` atau `utm_source`) tidak ikut tersimpan. Pembaca yang mengirim masukan lewat WhatsApp atau email memperlihatkan nomor atau alamatnya kepada founder; hal ini disebut di kebijakan privasi (§6). Form masukan ke PocketBase (SRS SHR-3) ditunda sampai setelah Ramadan.

## 2. Prinsip
1. Data minimal: kalau fitur bisa jalan tanpa data, jalankan tanpa data.
2. Tidak ada identitas: app tidak membuat ID perangkat atau pengguna.
3. Refleksi adalah milik pembaca: tidak pernah meninggalkan perangkat, dan ada tombol hapus di fase 2.
4. Transparan: kebijakan privasi berbahasa Indonesia yang bisa dibaca dalam dua menit.

## 3. Keamanan aplikasi
- Semua teks naskah dirender sebagai teks (escaping React); tidak ada HTML mentah dari konten.
- Content Security Policy (header nginx): `default-src 'self'; script-src 'self' https://umami.qissah.id; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://umami.qissah.id; frame-ancestors 'none'`. Font di-host sendiri, jadi tidak ada origin pihak ketiga selain Umami (ADR-019).
- Header lain: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` menolak kamera, mikrofon, geolokasi.
- Dependensi: `pnpm audit` di CI; pembaruan bulanan; tidak ada dependensi baru tanpa ADR.
- PocketBase (setelah Ramadan, bila form masukan dibangun): admin hanya lewat HTTPS, 2FA bila tersedia, aturan koleksi dikomit sebagai migrasi, rate limit di hook.
- Rahasia (keystore Android, kredensial Easypanel, PocketBase, Umami, Play Console, registrar domain) disimpan di password manager dengan pemulihan yang didokumentasikan di RUNBOOK.

## 4. Ancaman yang dipertimbangkan
| Ancaman | Mitigasi |
| --- | --- |
| XSS lewat konten naskah | Rendering teks, CSP, linter menolak tag HTML dan tautan |
| Spam ke endpoint feedback (setelah Ramadan, bila form PocketBase dibangun) | Rate limit per IP, batas ukuran, tanpa balasan ke pengirim |
| Konten dipelintir di luar konteks (screenshot cabang "salah") | Nama pereview di kartu, pernyataan di halaman "Tentang", protokol di RUNBOOK |
| Kehilangan keystore Android | Cadangan terenkripsi di dua tempat; Play App Signing diaktifkan |
| Kehilangan akses solo founder | Daftar akun dan kontak pemulihan di RUNBOOK §6 |

## 5. Kepatuhan
- UU PDP (UU 27/2022): data yang diproses minimal (IP di log server paling lama 7 hari, masukan sukarela lewat aplikasi pilihan pembaca); dasar pemrosesan kepentingan sah dan persetujuan untuk masukan; retensi log 7 hari, feedback 12 bulan; kontak permintaan hapus di kebijakan privasi.
- PSE Lingkup Privat (Komdigi): pendaftaran sebelum rilis Play Store produksi, melalui OSS; cek langkah terbaru karena prosedur bisa berubah.
- Play Store Data Safety: "tidak mengumpulkan data pengguna" untuk kategori identitas; "data aplikasi dan performa: analitik" dikumpulkan, tidak dibagikan, tidak bisa dihapus per pengguna karena tidak terkait identitas. Kebijakan privasi: `https://qissah.id/privasi`.
- Rating konten: isi kuesioner IARC dengan jujur: ada referensi ke perjudian dan tema dewasa tanpa adegan eksplisit; harapkan 17+.

## 6. Teks kebijakan privasi (draf untuk qissah.id/privasi)

Kebijakan Privasi Qissa

Qissa adalah aplikasi cerita interaktif. Kami merancangnya supaya bisa dipakai tanpa memberi tahu kami siapa Anda.

Apa yang kami simpan di perangkat Anda. Progres cerita, pilihan Anda, dan jawaban refleksi disimpan di penyimpanan browser atau aplikasi di perangkat Anda sendiri. Jawaban refleksi tidak pernah dikirim ke server kami. Menghapus data aplikasi atau data situs di perangkat akan menghapus semuanya.

Apa yang kami ukur. Kami menghitung berapa orang yang membuka episode, memilih, menamatkan, dan membagikan, memakai perangkat lunak analitik yang kami jalankan sendiri (Umami) tanpa cookie dan tanpa identitas pengguna. Alamat IP dipakai sesaat untuk menghitung pengunjung dan tidak disimpan dalam bentuk mentah. Server kami mencatat alamat IP di log akses paling lama 7 hari untuk keamanan, lalu menghapusnya.

Masukan sukarela. Tombol “Kirim masukan ke pembuat” membuka lembar bagikan di perangkat Anda. Kalau Anda mengirimnya lewat WhatsApp, email, atau aplikasi lain, kami menerima isi pesan (termasuk jalur cerita di templatnya) beserta nomor atau akun pengirim yang terlihat di aplikasi itu. Kami memakainya hanya untuk memperbaiki cerita dan membalas Anda, dan tidak menyimpannya lebih dari 12 bulan.

Yang tidak kami lakukan. Tidak ada iklan, tidak ada penjualan atau pembagian data ke pihak lain, tidak ada pelacak pihak ketiga, tidak ada akun.

Anak-anak. Qissa ditujukan untuk pembaca 17 tahun ke atas.

Hak Anda. Untuk pertanyaan atau permintaan penghapusan masukan yang pernah Anda kirim, hubungi halo@qissah.id. Kebijakan ini dapat berubah; tanggal pembaruan tercantum di bawah.

Diperbarui: [tanggal].
