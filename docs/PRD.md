# PRD — Qissa v1.0 (MVP Ramadan 2027)

Status: disetujui untuk dibangun. Tanggal: 21 Oktober 2026. Pemilik: founder (solo). Pembaruan: setiap milestone di `docs/ROADMAP.md`.

## 1. Ringkasan

Qissa adalah aplikasi cerita pendek interaktif berbentuk chat untuk Muslim Indonesia usia 17–40. Setiap episode (5–8 menit) menempatkan pembaca di posisi tokoh yang menghadapi dilema nyata, dua titik pilihan menentukan jalannya cerita, dan di akhir pembaca menerima kartu dalil berisi ayat dan hadis beserta derajatnya, yang telah direview ulama. Produk dibangun oleh satu orang, dipasarkan di Indonesia dulu, dengan target rilis publik sebelum Ramadan 1448 H (sekitar 8 Februari 2027).

## 2. Masalah

Konten keislaman untuk anak muda hampir seluruhnya berbentuk ceramah, kutipan, atau utilitas (jadwal salat, mushaf). Gen Z dan milenial menghadapi dilema yang spesifik dan baru (tangkapan layar chat, judi online, pinjol, tekanan karier, hijrah yang memutus pertemanan, warisan yang tak dibagi) dan tidak menemukan konten yang membuat mereka merasakan dilema itu sebelum diberi tahu jawabannya. Aplikasi yang mencoba "edukasi" gagal karena menggurui, visualnya tua, dan gamifikasinya salah arah (leaderboard amal). Ditambah krisis kepercayaan: hadis tanpa sanad, iklan, dan data pengguna yang dijual.

## 3. Pengguna

| Persona | Siapa | Kebutuhan | Yang membuatnya berhenti |
| --- | --- | --- | --- |
| Raka (21, Gen Z) | Mahasiswa akhir atau pekerja pertama, Android, WhatsApp dan TikTok, baca di KRL dan sebelum tidur | Cerita yang terasa seperti hidupnya; tidak diceramahi; bisa dibagikan ke teman | Bahasa yang tua, azab instan, visual masjid-kubah-emas |
| Sarah (31, milenial) | Pekerja atau orang tua muda, sibuk, membaca 10 menit malam hari | Dilema dewasa (uang, mertua, karier, mental health); dalil yang bisa dipercaya | Konten yang terasa untuk anak-anak; gamifikasi |
| Bu Ani (guru, B2B, fase 2) | Guru sekolah Islam atau pembina rohis | Bahan diskusi akhlak yang tidak membosankan | Konten tanpa sumber jelas |

Target MVP: Raka dan Sarah. Bu Ani masuk fase B2B setelah Ramadan.

## 4. Tujuan dan metrik

North star: jumlah episode yang ditamatkan per minggu.

Metrik MVP (Tahap 0, 500 pembaca pertama):
- Completion per episode (`selesai` ÷ `mulai`) ≥ 60%.
- Pengunjung yang menekan "Ikuti saluran" ≥ 5%.
- Retensi Episode 1 ke Episode 2 (`mulai` ep2 ÷ `selesai` ep1) ≥ 40%.
- Share rate (`bagikan` ÷ `selesai`) ≥ 10%, dan minimal satu pembagian organik yang terlacak.

Metrik Ramadan: pembaca harian "30 Malam", dan yang paling menentukan, **retensi 30 hari setelah Idulfitri ≥ 25%**. Kalau di bawah itu, Qissa dipikir ulang sebagai produk musiman plus B2B.

Kriteria gagal Tahap 0: completion < 40% atau tidak ada pembagian organik sama sekali setelah 500 pembaca. Kalau gagal, yang diperbaiki ceritanya dulu, bukan fiturnya.

## 5. Bukan tujuan (MVP)

- Tidak ada skor iman, leaderboard, atau streak publik.
- Tidak ada feed sosial, komentar publik, atau konten buatan pengguna tanpa kurasi.
- Tidak ada mesin fatwa atau chatbot agama.
- Tidak ada iklan, tidak ada penjualan data.
- Tidak ada login atau akun (fase 2).
- Tidak ada iOS (setelah Android terbukti).
- Tidak ada bahasa selain Indonesia (en dan ms setelah Ramadan).

## 6. Prinsip produk

1. Tidak ada pilihan yang jelas benar. Dua nilai yang sama-sama sah bertabrakan.
2. Dalil muncul setelah pilihan, dan tidak menghakimi tokoh.
3. Tidak ada skor iman; yang dilacak hanya konsekuensi naratif dan peta tema.

Tes untuk setiap episode dan setiap fitur: apakah pembaca merasakan sesuatu sebelum diberi tahu sesuatu?

## 7. Fitur MVP (MoSCoW)

| Prioritas | Fitur | Catatan |
| --- | --- | --- |
| Must | Landing dengan poll "Lu bakal gimana?" yang langsung masuk ke Episode 1 | Sudah ada di prototipe |
| Must | Pemutar chat fiction: gelembung per ketukan, "mengetik…", kartu narasi, tangkapan layar, notifikasi, m-banking, pilihan bercabang, variabel | Sudah ada di prototipe; dipindah ke engine |
| Must | Daftar episode dengan status (belum dibaca, selesai, akhir yang sudah dibaca) | |
| Must | Kartu dalil dengan badge status review dan nama pereview | Badge "Belum direview ulama" sampai direview |
| Must | Refleksi privat tersimpan di perangkat | Tidak pernah dikirim |
| Must | Bagikan dilema (Web Share, fallback salin) dan kirim masukan | |
| Must | Tombol ikuti Saluran WhatsApp sebagai waitlist | |
| Must | Analitik Umami tanpa data pribadi | Event tetap, lihat SRS §8 |
| Must | Konten dimuat dari server (manifest) sehingga episode baru tidak butuh rilis app | Wajib untuk "30 Malam" |
| Must | PWA: bisa dipasang, episode yang sudah dibuka bisa dibaca offline | |
| Must | Android (Capacitor) di Play Store, rating 17+ | Termasuk pendaftaran PSE Komdigi |
| Should | Push notification harian selama Ramadan (FCM) | Kalau tidak sempat, Saluran WA menggantikan |
| Should | Sapaan sampul yang mengingat pilihan di episode sebelumnya | Sudah ada di prototipe |
| Should | Form masukan ke PocketBase (tanpa login) sebagai alternatif share | |
| Could | Mode gelap/terang manual | Sistem sudah mengikuti perangkat |
| Won't (MVP) | Akun, sinkronisasi progres, halaqah, langganan, bahasa lain, iOS | Fase 2 |

## 8. Alur pengguna utama

1. Pembaca baru dari TikTok atau WhatsApp: buka tautan, lihat poll, pilih, masuk Episode 1, tamat, lihat perbedaan antara jawaban poll dan pilihan di cerita, baca kartu dalil, tulis refleksi, bagikan atau ikuti saluran, lanjut Episode 2.
2. Pembaca kembali: buka app atau PWA, daftar episode menampilkan yang baru, sampul episode mengingat pilihan sebelumnya.
3. Pembaca selama Ramadan: notifikasi (WA atau push) tiap malam, satu episode 3–5 menit, refleksi, kembali esok malam.

## 9. Konten

Season 1: 12 episode sesuai story bible (Tangkapan Layar, Transferan Nyasar, Grup Keluarga, Target, Hijrah, Dimas, Siapa Bram?, Wali, Pinjaman Ibu, Sarah, Sembilan Puluh Sembilan, Rumah Bapak). Episode 1 dan 2 sudah ditulis dan ada di `content/episodes`.

Ramadan "30 Malam": keputusan format diambil paling lambat 1 Desember 2026 berdasarkan kapasitas produksi: 30 mikro-episode (3 menit, satu pilihan) atau 15 episode penuh dua hari sekali. Campuran genre mengikuti bible (dilema, kisah, misteri berantai, komedi, satu refleksi di malam ke-27).

Semua episode melewati pipeline: kartu dilema, draf, baca Gen Z, review ulama, lint, rilis. Tidak ada episode yang rilis publik dengan badge "Belum direview" (pengecualian sementara selama Tahap 0: ADR-012).

## 10. Platform dan distribusi

- Web/PWA di qissa.id (Easypanel di VPS, nginx, konten statis).
- Android lewat Capacitor, Play Store, rating 17+; akun developer dan pendaftaran PSE sebelum Desember.
- Distribusi: poll "Lu bakal gimana?" di TikTok dan Instagram, grup WhatsApp dan komunitas kampus, Saluran WhatsApp sebagai kanal retensi, kampanye Kitabisa sebelum Ramadan.

## 11. Monetisasi (setelah MVP)

Inti gratis selamanya tanpa iklan. Qissa Plus (langganan, harga regional Rp19–29 ribu per bulan), waqf "sponsor satu episode", dan lisensi institusi (sekolah Islam, rohis, MSA) dengan panduan diskusi. Tidak ada gacha, loot box, atau timer yang memaksa bayar. Tidak dibangun sebelum angka retensi pasca-Ramadan terlihat.

## 12. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Konten dianggap bermasalah secara agama atau dipelintir di luar konteks | Review dua ulama berbeda latar sebelum rilis; aturan "berani tapi beradab"; nama pereview tampil |
| Adegan judol atau pinjol jadi tutorial | Aturan konten nomor 1; linter menolak nama aplikasi dan nominal taruhan |
| Produksi konten tidak terkejar oleh satu orang | Format mikro-episode; AI mendraf dari kartu dilema; penulis lepas setelah ada dana |
| Tebing retensi pasca-Ramadan | Metrik diputuskan di muka; rencana B: produk musiman plus B2B |
| Rating Play Store dan kebijakan konten | Deklarasi jujur 17+; tidak ada konten eksplisit |
| Satu orang sakit atau kehabisan waktu | Konten 10 malam pertama Ramadan dibekukan sebelum 20 Januari 2027 |

## 13. Jadwal

Lihat `docs/ROADMAP.md`. Tonggak utama: qissa.id live (4 November), Tahap 0 selesai (18 November), Android closed testing (9 Desember), konten Ramadan dibekukan (20 Januari), rilis (7 Februari 2027).

## 14. Pertanyaan terbuka

- Format "30 Malam": mikro atau penuh? (keputusan 1 Desember)
- Push notification masuk MVP atau cukup Saluran WA?
- Nama pereview ditampilkan dengan nama lengkap, inisial, atau lembaga?
- Apakah Dion (Episode 2) kembali di Episode 11?
