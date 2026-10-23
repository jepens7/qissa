# Roadmap sampai Ramadan 1448 H

Tanggal mulai: 22 Oktober 2026. Ramadan diperkirakan 8 Februari 2027 (menunggu rukyat; rencana memakai 7 Februari sebagai hari rilis). Lima belas minggu, satu orang, dibantu Claude Code dan pereview lepas. Direvisi 23 Oktober: PWA (M3a) dan uji lokal didahulukan sebelum deploy, sehingga qissah.id live dan Tahap 0 bergeser sekitar satu minggu (`docs/PLAN.md` §6).

| Minggu | Tanggal | Milestone | Keluaran |
| --- | --- | --- | --- |
| 1 | 22–28 Okt | M1a Fondasi repo | Monorepo pnpm; packages/script (parser, compiler, linter) dengan golden test untuk ep01 dan ep02; packages/engine dengan tes jelajah semua jalur |
| 2 | 29 Okt–4 Nov | M1b Web lengkap di lokal | apps/web memutar ep01 dan ep02 dari JSON; Epik F; M3a dimajukan: service worker, offline, dan baris versi baru (G1–G2); pereview pertama dihubungi dan menerima naskah; uji paritas di HP |
| 3 | 5–11 Nov | M1c Uji lokal dan qissah.id live | E2E (G3) dan QA lokal; deploy Easypanel, Umami, Saluran WA, dan sesi uji E3 (sasaran 12 November, batas 1 Desember); naskah Episode 3 (Grup Keluarga) ditulis |
| 4 | 12–18 Nov | M2a Tahap 0 dimulai | Poll TikTok/IG dan sebaran komunitas; target 250 pembaca; Android H1 (Capacitor, APK debug) |
| 5 | 19–25 Nov | M2b Tahap 0 selesai | 500 pembaca; keputusan lanjut atau perbaiki cerita berdasarkan completion, share, retensi (sekitar 26 November); review ulama ep01–02 selesai; Android H2–H3; staging.qissah.id |
| 6 | 26 Nov–2 Des | M3b Android | Revisi ep01–02 dari masukan; akun developer Play; dokumen PSE disiapkan; AAB rilis bertanda tangan; keputusan format "30 Malam" (1 Desember) |
| 7 | 3–9 Des | M3c Closed testing | Build ke internal lalu closed testing (12 penguji, 14 hari berjalan); kebijakan privasi di qissah.id/privasi |
| 8 | 10–16 Des | M4a Produksi Ramadan 1 | Kartu dilema untuk seluruh malam; draf malam 1–10; pereview kedua direkrut |
| 9 | 17–23 Des | M4b Produksi Ramadan 2 | Draf malam 11–20; baca Gen Z malam 1–10 |
| 10 | 24–30 Des | M4c Produksi Ramadan 3 | Draf malam 21–30; review ulama malam 1–10; Play Store production |
| 11 | 31 Des–6 Jan | M5a Kampanye | Halaman Kitabisa; materi TikTok/IG; review ulama malam 11–20 |
| 12 | 7–13 Jan | M5b Kampanye berjalan | Kampanye dibuka; Saluran WA diisi tiap dua hari; review malam 21–30 |
| 13 | 14–20 Jan | M5c Pembekuan | Konten malam 1–10 dibekukan dan dimuat ke manifest dengan tanggal rilis; uji di dua HP nyata |
| 14 | 21–27 Jan | M6a Gladi | Latihan rilis harian otomatis lewat tanggal di manifest; pengukuran Umami; perbaikan terakhir |
| 15 | 28 Jan–7 Feb | M6b Rilis | Pengumuman di saluran dan media sosial; rilis 7 Februari; rotasi harian selama Ramadan |

## Selama Ramadan (8 Feb–8 Mar 2027)
Satu episode per malam (atau dua hari sekali, sesuai keputusan 1 Desember), rilis otomatis lewat manifest; pantau completion harian; tanggapi masukan yang masuk ke `halo@qissah.id`; jangan tambah fitur.

## Setelah Ramadan
Ukur retensi 30 hari pasca-Idulfitri (target ≥ 25%). Jika tercapai: fase 2 (akun Google dan sinkronisasi, halaqah kecil, Qissa Plus, B2B sekolah, bahasa Melayu). Jika tidak: Qissa sebagai produk musiman plus B2B; produksi Season 1 dilanjutkan dengan tempo lebih lambat.

## Daftar "Setelah Ramadan" (parkir fitur)
Tambahkan di sini setiap ide yang ditolak dari MVP, dengan satu kalimat alasan.
- Akun dan sinkronisasi progres: menunggu bukti retensi.
- Halaqah (lingkaran 3–7 teman): butuh akun.
- Streak privat: perlu desain yang tidak memicu rasa bersalah.
- iOS: setelah Android terbukti.
- Bahasa Inggris dan Melayu: setelah penulis native tersedia.
- Form masukan PocketBase (SRS SHR-3): masukan lewat lembar bagikan cukup untuk MVP; form butuh layanan baru, rate limit, dan retensi data 12 bulan.
- Push notification FCM (SRS AND-3): bertentangan dengan "tanpa SDK pihak ketiga"; Saluran WhatsApp menggantikan.
- Mode terang/gelap manual: tema sudah mengikuti perangkat.
