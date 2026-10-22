# SRS — Qissa v1.0

Spesifikasi kebutuhan perangkat lunak untuk MVP. Kata "wajib" berarti harus ada sebelum rilis publik; "sebaiknya" berarti dikerjakan bila waktu ada; "nanti" berarti fase 2.

## 1. Pendahuluan

### 1.1 Lingkup
Sistem terdiri dari: (a) konten episode dalam Qissa Script yang dikompilasi menjadi JSON, (b) aplikasi web PWA yang memutar episode, (c) bungkus Android lewat Capacitor, (d) PocketBase untuk masukan pembaca, (e) Umami untuk analitik, (f) nginx di Easypanel untuk menyajikan semuanya.

### 1.2 Definisi
- Episode: satu cerita 3–8 menit dengan dua titik pilihan dan tiga akhir.
- Knot: blok baris bernama di dalam episode; cerita berpindah antar-knot lewat divert, branch, atau pilihan.
- Baris: satu unit yang dirender per ketukan (gelembung, kartu narasi, kartu khusus) atau instruksi tak terlihat (set, go, branch, view).
- Snapshot: salinan state saat titik pilihan, untuk "ulang dari Pilihan 2".
- Kartu dalil: bagian penutup episode berisi ayat, hadis, catatan prinsip, status review.
- Qissa Script (QS): format teks naskah; lihat `docs/QISSA-SCRIPT.md`.
- Manifest: daftar episode yang dirilis beserta versi dan URL JSON-nya.

## 2. Gambaran sistem

```
content/*.qs.md ──(qs compile)──> content JSON ──┐
                                                 ▼
  nginx (Easypanel, qissa.id) ── serves ── apps/web (PWA) ──> Umami (events)
                                   │                └──> PocketBase (feedback, fase 2: akun)
                                   └── /content/manifest.json + /content/epNN.json
  apps/android (Capacitor) = apps/web + WebView + plugin (share, push nanti)
```

Prinsip: konten statis dan ter-cache; aplikasi bekerja tanpa backend; backend hanya untuk hal yang benar-benar butuh server.

## 3. Persyaratan fungsional

### 3.1 Konten (CNT)
- CNT-1 (wajib) Naskah ditulis dalam Qissa Script dan dikompilasi menjadi JSON sesuai skema di QISSA-SCRIPT.md §4.
- CNT-2 (wajib) `content/manifest.json` memuat daftar episode: id, nomor, judul, teaser, durasi, versi konten, URL JSON, status review, tanggal rilis. Episode dengan `rilis` di masa depan tidak ditampilkan.
- CNT-3 (wajib) `dalil.md` per episode dirender ke kartu dalil; front matter memuat `status` (draft/reviewed), `reviewed_by`, `reviewed_at`.
- CNT-4 (wajib) Linter konten (`qs lint`) berjalan di CI dan menolak pelanggaran aturan di QISSA-SCRIPT.md §6.
- CNT-5 (wajib) Aplikasi memuat manifest dari server saat dibuka dan memakai cache bila offline; episode JSON diunduh saat dibuka pertama kali dan disimpan untuk offline.

### 3.2 Mesin cerita (ENG)
- ENG-1 (wajib) `packages/engine` mengekspos `createStory(episode)` dengan API: `next()`, `choose(optionIndex)`, `snapshot(key)`, `restore(key)`, `state`, dan langkah `render` (nilai balik `next()`, ARCHITECTURE §5) untuk setiap baris yang harus dirender. Tanpa ketergantungan DOM.
- ENG-2 (wajib) Mendukung jenis baris: view, nar (dengan cases), in, out (dengan attach), typing, shot, sys, notif, bank, set, go, branch, choice, end.
- ENG-3 (wajib) Baris tak terlihat (view, set, go, branch) diproses otomatis sampai bertemu baris yang dirender atau pilihan.
- ENG-4 (wajib) `typing` memblokir input selama durasi (950 ms; 350 ms bila reduced motion) lalu otomatis merender baris berikutnya.
- ENG-5 (wajib) Snapshot disimpan pada setiap `choice` dengan kunci dari naskah (`p1`, `p2`); restore mengembalikan log, variabel, header, dan jalur.
- ENG-6 (wajib) Engine mencatat `jalur` (nama pendek tiap opsi yang dipilih) untuk analitik dan kartu tamat.
- ENG-7 (wajib) Engine diuji unit dengan vitest; setiap episode di `content/` punya tes yang menjelajahi semua kombinasi pilihan dan memastikan tiap jalur mencapai `end` tanpa knot yang hilang.

### 3.3 Pemutar (UI)
- UI-1 (wajib) Satu ketukan di area cerita atau tombol "Ketuk untuk lanjut" merender satu baris; Space, Enter, dan panah kanan melakukan hal yang sama untuk keyboard.
- UI-2 (wajib) Header menampilkan nama chat aktif, inisial avatar, dan status ("online", "mengetik…", teks lain dari naskah); berubah saat `view`.
- UI-3 (wajib) Jenis tampilan: gelembung masuk (dengan nama pengirim di grup), gelembung keluar (dengan label lampiran), kartu narasi (serif), pil sistem, kartu tangkapan layar (tertutup, chat bersarang, komentar), kartu notifikasi, kartu m-banking, indikator mengetik, blok pilihan.
- UI-4 (wajib) Blok pilihan: label (mis. "Pilihan 1 dari 2") dan tiga tombol; setelah dipilih, tombol terpilih ditandai, yang lain diredupkan; tidak ada tanda benar atau salah.
- UI-5 (wajib) Setelah `end`: kartu tamat (jalur, jumlah akhir yang sudah dibaca, catatan poll bila ada), kartu dalil, refleksi, bagikan dan masukan, lanjut ke episode berikutnya, ulang dari Pilihan 2, ulang dari awal, daftar episode.
- UI-6 (wajib) Halaman otomatis menggulir ke baris terbaru; menghormati `prefers-reduced-motion`.
- UI-7 (wajib) Tema terang dan gelap mengikuti sistem lewat token CSS; kartu dalil memakai permukaan "kertas" yang berbeda di kedua tema.
- UI-8 (wajib) Tipografi: Plus Jakarta Sans (UI dan chat), Newsreader (narasi, dalil), Amiri (Arab), semua dengan fallback sistem; font dimuat dengan `display=swap`.

### 3.4 Daftar episode (LIB)
- LIB-1 (wajib) Landing menampilkan poll Episode 1 (tiga opsi), lalu daftar episode dari manifest dengan status per perangkat: belum dibaca, selesai, jumlah akhir yang sudah dibaca dari 3.
- LIB-2 (wajib) Jawaban poll disimpan di perangkat dan dibandingkan dengan pilihan pertama saat Episode 1 tamat.
- LIB-3 (sebaiknya) Sampul episode N menampilkan satu kalimat yang mengingat jalur pembaca di episode N-1.
- LIB-4 (wajib) Tautan `#epNN` membuka episode itu langsung.

### 3.5 Kartu dalil (DLL)
- DLL-1 (wajib) Kartu merender `dalil.md` dengan urutan: judul, riwayat sejarah (bila ada, ditandai bukan hadis), ayat (Arab, terjemahan Kemenag, rujukan), hadis (terjemahan, perawi, nomor, derajat), catatan prinsip, hukum negara (bila ada), status review.
- DLL-2 (wajib) Bila `status` bukan `reviewed`, badge "Belum direview ulama" tampil; bila `reviewed`, tampil "Direview oleh {nama}, {tanggal}".
- DLL-3 (wajib) Teks Arab dirender RTL dengan font Amiri; terjemahan tidak dipotong.
- DLL-4 (wajib) Tidak ada elemen UI yang menilai pilihan pembaca di kartu dalil.

### 3.6 Refleksi (REF)
- REF-1 (wajib) Satu pertanyaan per episode dari front matter naskah; textarea; tombol simpan menyimpan ke `localStorage` kunci `qissa.v1.{ep}.refleksi`; tidak ada pengiriman ke server.
- REF-2 (wajib) Gagal menyimpan (storage penuh atau diblokir) ditangani dengan pesan, tanpa crash.

### 3.7 Bagikan dan masukan (SHR)
- SHR-1 (wajib) "Bagikan dilemanya" memakai Web Share API dengan teks dari front matter `bagikan` plus `siteUrl#epNN`; fallback salin ke clipboard dengan pesan.
- SHR-2 (wajib) "Kirim masukan" membuka Web Share atau salin dengan templat lima pertanyaan dan jalur pembaca.
- SHR-3 (sebaiknya) Form masukan in-app mengirim ke PocketBase koleksi `feedback` (aturan create publik, read admin), tanpa login, dengan rate limit.
- SHR-4 (wajib) Teks bagikan tidak pernah memuat pilihan pembaca atau isi refleksi.

### 3.8 Saluran WhatsApp (WA)
- WA-1 (wajib) Tombol "Ikuti saluran" di landing dan di akhir episode, membuka URL saluran dari konfigurasi; klik dicatat sebagai event `saluran`.

### 3.9 PWA dan offline (PWA)
- PWA-1 (wajib) Manifest web app, ikon 192 dan 512, `display: standalone`, warna tema.
- PWA-2 (wajib) Service worker: app shell precache; manifest konten network-first dengan fallback cache; episode JSON cache-first setelah pernah diunduh; font dan gambar stale-while-revalidate.
- PWA-3 (wajib) Pembaruan app shell: setelah build baru terdeteksi, tampilkan satu baris "Versi baru tersedia, muat ulang" tanpa memaksa.
- PWA-4 (wajib) Semua fitur inti bekerja tanpa jaringan untuk episode yang sudah pernah dibuka.

### 3.10 Android (AND)
- AND-1 (wajib) Capacitor membungkus apps/web; `appId` `id.qissa.app`; target Android 8.0 ke atas.
- AND-2 (wajib) Plugin: Share (native share sheet), App (deep link `qissa.id/#epNN`), StatusBar (warna mengikuti tema).
- AND-3 (sebaiknya) Push notification FCM untuk pengingat harian Ramadan; opt-in eksplisit; tidak ada notifikasi rasa bersalah.
- AND-4 (wajib) Play Store listing: rating konten 17+, kebijakan privasi di qissa.id/privasi, deklarasi data (tidak ada data yang dikumpulkan selain analitik agregat).
- AND-5 (wajib) Pendaftaran PSE Komdigi sebelum rilis produksi.

### 3.11 Analitik (ANL)
Lihat §8. Semua event dikirim lewat `umami.track` bila skrip Umami termuat; bila tidak, diabaikan tanpa error.

## 4. Persyaratan non-fungsional

- NFR-1 Kinerja: app shell ≤ 150 KB gzip tanpa font; first interaction ≤ 2 detik di koneksi 4G lambat (Fast 3G di Chrome DevTools); satu episode JSON ≤ 60 KB.
- NFR-2 Offline: episode yang pernah dibuka bisa dibaca penuh tanpa jaringan, termasuk kartu dalil dan refleksi.
- NFR-3 Aksesibilitas: WCAG 2.1 AA untuk kontras dan fokus; semua interaksi bisa dengan keyboard; `aria-live` untuk baris baru; `prefers-reduced-motion` dihormati.
- NFR-4 Privasi: tidak ada cookie, tidak ada fingerprinting, tidak ada data pribadi di event; refleksi tidak pernah meninggalkan perangkat; kebijakan privasi berbahasa Indonesia; mematuhi UU PDP untuk data minimal yang ada (feedback opsional).
- NFR-5 Keamanan: konten dirender lewat escaping (tidak ada `innerHTML` dengan teks naskah; kartu dalil dirender dari struktur `Dalil` hasil compile, bukan dari HTML); CSP dasar; dependensi dipindai di CI.
- NFR-6 Kompatibilitas: Android Chrome 90+, Samsung Internet 15+, Safari iOS 15+ (web saja), desktop Chrome, Firefox, Safari terbaru.
- NFR-7 Internasionalisasi: semua string UI lewat i18n (`id` dulu); konten per bahasa di folder terpisah nanti; tanggal dan angka memakai format Indonesia.
- NFR-8 Tema: terang dan gelap lewat token; kontras tiap pasangan warna diuji.
- NFR-9 Keandalan: tidak ada state cerita yang hilang karena render ulang; error konten (knot hilang) memunculkan pesan yang jelas, bukan layar kosong.
- NFR-10 Pemeliharaan: menambah episode baru = menambah folder di `content/` dan satu entri manifest, tanpa menyentuh kode aplikasi.

## 5. Model data

### 5.1 Episode JSON
Skema lengkap di `docs/QISSA-SCRIPT.md` §4. Ringkasnya: `{ id, nomor, judul, pov, meta{teaser, sampul, durasi_menit, rating, refleksi, bagikan, berikutnya}, vars[], start, knots{ nama: Baris[] }, shots{ nama: Shot } }`.

### 5.2 Manifest
```json
{
  "versi": 1,
  "episodes": [
    { "id": "ep01", "nomor": 1, "judul": "Tangkapan Layar", "teaser": "…", "durasi_menit": 5,
      "url": "/content/ep01.json", "versi_konten": "2026-11-01.1",
      "review": { "status": "draft", "oleh": null, "tanggal": null },
      "rilis": "2026-11-04" }
  ]
}
```

### 5.3 Penyimpanan perangkat (localStorage)
Kunci, tipe, dan contohnya ada di DATA-CONTRACTS §5 (awalan `qissa.v1.`): akhir yang sudah dibaca, jalur terakhir, dan refleksi per episode; jawaban poll landing; salinan manifest terakhir; versi app shell.

### 5.4 PocketBase (MVP)
Koleksi `feedback`: `episode` (text), `jalur` (text), `jawaban` (json, lima pertanyaan), `versi_app` (text), `dibuat` (auto). Aturan: create publik dengan rate limit, list dan view hanya admin. Tidak ada kolom identitas.

### 5.5 PocketBase (fase 2, dirancang sekarang, tidak dibangun)
`users` (auth Google), `progress` (user, episode, akhir[], jalur, updated), `circles` dan `circle_members` (halaqah), `subscriptions` (status langganan dari webhook). Refleksi tetap di perangkat kecuali pengguna memilih sinkronisasi terenkripsi (keputusan terpisah).

## 6. Antarmuka eksternal
- Konten: `https://qissa.id/content/manifest.json` dan `/content/epNN.json`, `Cache-Control: no-cache` untuk manifest, `max-age=31536000, immutable` untuk JSON berversi (nama berkas memuat versi).
- Umami: skrip `https://umami.qissa.id/script.js` dengan `data-website-id`; event lewat `umami.track(nama, data)`.
- Saluran WhatsApp: URL dari konfigurasi.
- Play Store dan FCM (nanti).

## 7. Pipeline konten
1. Kartu dilema (lima baris) di PR.
2. Draf naskah `.qs.md` dan `dalil.md` (status `draft`).
3. Baca Gen Z (2–3 orang), revisi bahasa.
4. Review ulama: pereview mengisi `reviewed_by`, `reviewed_at`, `status: reviewed` di `dalil.md` lewat PR atau founder mencatatkannya atas nama pereview dengan bukti tertulis.
5. `pnpm qs lint` dan `pnpm qs compile` hijau di CI.
6. Tambah ke manifest dengan tanggal rilis; deploy.

Episode dengan `status: draft` boleh ada di manifest hanya di lingkungan staging. Pengecualian sementara selama Tahap 0: lihat ADR-012.

## 8. Spesifikasi analitik

| Event | Data | Kapan |
| --- | --- | --- |
| `poll` | `pilih` | Tombol poll di landing ditekan |
| `mulai` | `ep` | Episode dibuka (sampul tampil) |
| `pilihan` | `ep`, `titik` (p1/p2), `pilih` | Opsi dipilih |
| `selesai` | `ep`, `jalur` (nama pendek dipisah `>`) | Baris `end` tercapai |
| `bagikan` | `ep` | Tombol bagikan ditekan |
| `masukan` | `ep` | Tombol kirim masukan ditekan |
| `saluran` | `dari` (home/epNN) | Tombol ikuti saluran ditekan |

Metrik turunan: completion = selesai ÷ mulai; share rate = bagikan ÷ selesai; retensi = mulai(epN+1) ÷ selesai(epN); konversi saluran = saluran ÷ pengunjung unik. Tidak ada ID pengguna; Umami menghitung pengunjung unik secara agregat.

## 9. Pengujian
- Unit (vitest): engine (semua jenis baris, branch, snapshot/restore), compiler (golden test: setiap `.qs.md` di `content/` menghasilkan JSON yang sama dengan snapshot yang di-commit), linter (kasus positif dan negatif).
- Jelajah otomatis: untuk setiap episode, jelajahi semua kombinasi pilihan dan pastikan setiap jalur mencapai `end` dalam ≤ 300 baris, tidak ada knot yang hilang, tidak ada variabel yang tidak dideklarasikan.
- E2E (Playwright, viewport 360×780): landing, poll, satu episode sampai tamat, refleksi tersimpan, bagikan fallback salin, offline reload.
- Manual sebelum rilis: checklist QA di `docs/CONTENT-RULES.md` §6 untuk tiap episode; uji di dua HP Android nyata (satu kelas menengah bawah).

## 10. Deployment dan rilis
- Build: GitHub Actions menjalankan typecheck, lint, test, `qs lint`, `qs compile`, `vite build`, lalu Easypanel membangun image dari `infra/nginx/Dockerfile` (konten dan app shell dalam satu image).
- Staging: `staging.qissa.id` dari branch `staging` dengan manifest yang memuat episode draft.
- Produksi: branch `main`; manifest hanya episode `reviewed` (gerbang `qs lint --wajib-review` dinyalakan setelah review ep01–02; ADR-012).
- Versi: app shell `MAJOR.MINOR.PATCH`; konten `YYYY-MM-DD.n` per episode.
- Android: build lokal `pnpm cap:sync` lalu Android Studio; internal testing → closed testing → production. Pendaftaran PSE Komdigi sebelum production.
- Rollback: Easypanel menyimpan image sebelumnya; manifest bisa diubah tanpa build.

## 11. Kriteria penerimaan MVP
- Semua FR berlabel wajib terpenuhi dan diuji.
- Episode 1 dan 2 berstatus `reviewed` dengan nama pereview di kartu dalil.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, PWA installable.
- Offline: Episode yang pernah dibuka bisa ditamatkan dalam mode pesawat.
- Umami menerima tujuh event dari sesi uji dan metrik turunan bisa dihitung dari dasbor.
- Play Store closed testing lolos dengan 12 penguji selama 14 hari (persyaratan Google untuk akun pribadi baru).
