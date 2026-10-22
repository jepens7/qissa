# Rencana kerja minggu 1–2

Urutan dan cara pengerjaan M1a dan M1b (`docs/ROADMAP.md`, 22 Oktober–4 November 2026): tindak lanjut Epik A–B, lalu Epik C, D, dan E. Kriteria terima tetap milik `docs/BACKLOG.md`. Status tugas dicatat di `docs/PROGRESS.md`, keputusan sesi di `docs/PROGRESS.md`, dan keputusan arsitektur di `docs/DECISIONS.md`.

## 1. Cara kerja
- Satu tugas = satu branch = satu commit = satu PR ke `main`, merge dengan rebase setelah CI hijau. Selama GitHub Actions tertahan, setiap PR diverifikasi lokal dan dengan semua langkah `ci.yml` di container `node:22-bookworm-slim`.
- Sebelum commit: `pnpm verify` dan `pnpm qs compile --check`.
- Tidak ada overengineering. Bangun yang diminta dokumen dengan cara paling sederhana yang benar; dependensi baru hanya dengan ADR.
- Setiap PR UI memeriksa secara manual di Chrome DevTools, pada 360×780 berdampingan dengan prototipe, dalam tema terang dan gelap:
  - keyboard (Space, Enter, panah kanan), dengan fokus yang terlihat;
  - `aria-live` di log cerita;
  - gulir ke baris terbaru;
  - `prefers-reduced-motion`;
  - tidak ada `console.error`.
- Tes yang butuh JSON episode (engine dan logika apps/web) membaca golden snapshot `packages/script/__snapshots__/*.json` (ADR-016).

## 2. Urutan tugas

### Tindak lanjut Epik A–B
| ID | Tugas | Selesai bila |
| --- | --- | --- |
| T1 | Bukti CI A2 | Job GitHub Actions di `main` hijau |
| T2 | `content:` rapikan tiga peringatan W1 ep02 dengan teks pilihan pemilik | `qs lint` 0 peringatan; `EPISODES` prototipe, golden snapshot, dan berkas kunci diperbarui |
| T3 | Isi daftar L5 (hash nama aplikasi judi) dan W4 (kata ketuaan) dari riset | Daftar terisi; `qs lint` dan pemindai repo bersih; nama judi tidak tertulis di repo; QISSA-SCRIPT §6 W4 menyebut sumber daftarnya |
| T4 | `format: 1` di JSON episode (ADR-015) | Tipe, skema, emitter, snapshot, dan berkas kunci diperbarui; QISSA-SCRIPT §4, DATA-CONTRACTS §3, dan SRS §5.1 menyebutnya |

### Epik C: packages/engine
| ID | Cara |
| --- | --- |
| C1 | `createStory(episode, { reducedMotion })` sesuai ARCHITECTURE §5. `next()` memproses baris tak terlihat sampai bertemu baris terlihat, `typing` (950/350 ms), `choice`, atau `end`. `choose(i)` mencatat nama pendek ke `path`, lalu mengembalikan langkah berikutnya. Format selain 1 dan knot yang hilang melempar `StoryContentError`. Snapshot menyimpan state tepat sebelum baris pilihan; `rendered` menghitung langkah `render` dan `choice`. Tes per jenis baris. |
| C2 | Tes jelajah semua episode dari golden snapshot: semua kombinasi pilihan mencapai `end`, dan setiap knot dimasuki. |
| C3 | `restore('p2')` lalu memilih opsi lain menghasilkan akhir berbeda, dan `rendered` sama dengan saat snapshot. |

### Epik D: apps/web paritas prototipe
Urutannya D1, D2, D6, D7, D8, lalu D3, D4, D5. Reader dan layar akhir memakai pemuat konten, analitik, dan routing, jadi ketiganya dibuat lebih dulu.

| ID | Cara |
| --- | --- |
| D1 | `tokens.css` dan `base.css` dari CSS prototipe, font Google Fonts sesuai CSP (PRIVACY-SECURITY §3), serta tema mengikuti sistem dan `data-theme`. Ikon, `manifest.webmanifest`, dan meta OG disalin dari prototipe. PR D1 mencocokkan token dengan CSS prototipe; screenshot home dan reader menyusul di PR D3 dan D5, dan baris D1 ditutup setelahnya. |
| D2 | Komponen DESIGN-SYSTEM §4, satu per berkas. Halaman `#debug` menampilkan semuanya dengan data contoh. String UI diambil dari `i18n/id.json` lewat fungsi `t()` kecil, tanpa library. |
| D6 | `lib/content.ts`: manifest network-first dengan batas 3 detik dan cadangan `qissa.v1.manifest`; manifest dengan `versi` selain 1 memakai cadangan. Episode cache-first di Cache Storage dengan `versi_konten` sebagai kunci; bila `caches` tidak ada, langsung dari jaringan. `rilis` di masa depan disembunyikan menurut tanggal Asia/Jakarta, kecuali saat `vite dev`; fungsi saringnya menerima tanggal sebagai parameter dan diuji. `lib/storage.ts` memakai kunci DATA-CONTRACTS §5. Diuji dengan manifest palsu. |
| D7 | `lib/analytics.ts`: `track(nama: EventName, data)` dengan union tujuh nama. Setiap panggilan memeriksa `window.umami?.track`, jadi diam bila Umami tidak dikonfigurasi atau belum termuat. |
| D8 | Routing hash `#home`, `#epNN`, dan `#debug` dengan `history.replaceState`. `#epNN` hanya berlaku untuk episode yang lolos saringan D6; selain itu kembali ke `#home`. Selesai bila `#ep02` memuat ep02 dan menampilkan sampulnya; episode lengkap lewat `#ep02` diperiksa ulang di PR D3. |
| D3 | `features/reader` memegang `Story` di `useRef` dan daftar item di state. Isinya: ketukan dan Space/Enter/panah kanan, typing dengan status header "mengetik…", pilihan, dan restore. Langkah `render` untuk `view` langsung diikuti `next()`, sehingga pil dan baris berikutnya muncul dalam satu ketukan, sama seperti prototipe. Juga: sampul dengan memo (templat generik), tombol "Daftar episode" di Header, ErrorBoundary dengan pesan "perbarui aplikasi" untuk format tak dikenal, dan pesan gagal muat dengan "Coba lagi". Logikanya ada di modul murni yang diuji untuk semua jalur ep01 dan ep02. |
| D4 | `features/ending`: tamat dengan catatan poll, kartu dalil dari struktur `Dalil`, refleksi, bagikan, masukan, saluran, lanjut, ulang dari Pilihan 2, ulang dari awal, dan daftar. "Lanjut" hanya untuk episode berikutnya yang sudah rilis; bila belum, tampil templat "menyusul". Aturan ESLint `no-restricted-syntax` melarang `dangerouslySetInnerHTML`. |
| D5 | `features/home`: poll dari i18n, daftar episode dari manifest dengan status "selesai, N dari 3", kartu saluran, dan footer (teks prototipe lewat i18n). Satu tes memastikan nama pendek poll sama dengan opsi p1 ep01 di golden snapshot. |

### Epik E: qissa.id live
| ID | Cara |
| --- | --- |
| E1 | `infra/nginx/Dockerfile` multi-tahap. Tahap build Node 22 dan pnpm menjalankan `pnpm install --frozen-lockfile` dan `pnpm build`, dengan `VITE_*` sebagai build arg; tahap nginx menyalin `apps/web/dist`. `nginx.conf` memuat header keamanan dan CSP (PRIVACY-SECURITY §3), `/healthz`, serta aturan cache: `index.html`, manifest, dan episode `no-cache` sampai M3a; aset ber-hash `immutable`. Verifikasi dengan `docker build`, `docker run`, dan `curl -I`, termasuk `/privasi`. `infra/easypanel.md` dan ARCHITECTURE §12 menyebut `VITE_*` sebagai build arg Easypanel, bukan `.env` yang di-commit. |
| E2 | `apps/web/public/privasi/index.html` dan `tentang/index.html` sebagai HTML statis. Teks privasi diambil dari PRIVACY-SECURITY §6; teks "Tentang" didraf dari PRD §1 dan disetujui pemilik. Keduanya ditautkan dari footer. Tanpa konversi markdown; wording BACKLOG E2 diselaraskan di PR-nya. |
| E3 | Skrip Umami dimuat dari konfigurasi. Sesi uji tujuh event dijalankan di situs live pada atau setelah tanggal `rilis`. |

### Pemicu di luar minggu 1–2
- P1 Pensiunkan prototipe: hapus `infra/prototype` dan tes paritasnya dengan ADR baru (ARCHITECTURE §16), setelah pemilik memastikan paritas di HP.
- Bagian dalil `ikhtilaf` ("ulama berbeda", CONTENT-RULES §7) dibuat saat `dalil.md` pertama membutuhkannya, paling lambat sebelum APK pertama (M3b).
- Gerbang `qs lint --wajib-review` dinyalakan di CI dan Dockerfile setelah review ulama ep01–02 (ADR-012).
- E2E Playwright diajukan bersama offline di M3a, dengan ADR sendiri (ADR-016).

## 3. Perkiraan waktu
- Minggu 1 (22–28 Oktober): T2, T3, T4, C1–C3, D1, D2, D6, D7, D8.
- Minggu 2 (29 Oktober–4 November): D3, D4, D5, E1, E2, E3.

Bila waktu kurang, reader, layar akhir, dan home (Must di PRD §7) didahulukan di atas kesamaan piksel D1.

## 4. Butuh pemilik
Berurutan, dengan tenggat:
1. Sekarang: billing GitHub Actions organisasi `jepens7` (T1).
2. Minggu 1:
   - daftarkan domain `qissa.id`. Per 22 Oktober, RDAP registri .id menjawab 404 dan DNS-nya NXDOMAIN;
   - buat record DNS untuk `qissa.id` dan `umami.qissa.id`;
   - berikan alamat email kontak untuk kebijakan privasi (E2).
3. Sebelum E1 di-merge: buat service Easypanel dari `infra/nginx/Dockerfile` dengan build arg `VITE_SITE_URL` dan `VITE_CONTENT_BASE`. Ini harus lebih dulu, karena Easypanel membangun `main` di setiap push dan `vite build` gagal bila keduanya kosong.
4. Sebelum E3: instance Umami beserta Website ID, dan URL Saluran WhatsApp, sebagai build arg.
5. Uji di HP Android sungguhan pada 360 px. Caranya: port forwarding USB dari Chrome (`chrome://inspect`) ke dev server, karena `localhost` termasuk secure context; atau satu sesi setelah E1 live di HTTPS. Baris D ditutup setelah uji HP.
6. E3: jalankan sesi uji dan kirim screenshot dasbor Umami pada atau setelah 4 November (`rilis` ep01–02). Cara lain: majukan `rilis` di `content/manifest.json`.
7. Hubungi pereview pertama (ROADMAP minggu 2), dan setujui draf halaman "Tentang" (E2).

## 5. Risiko
- M1b bergantung pada pendaftaran domain, DNS, dan Easypanel di luar repo. Bila langkah §4 butir 2–3 terlambat, E1 dan E3 ikut mundur, walau kodenya siap.
- Tanpa CI GitHub, PR tidak punya badge hijau; verifikasi container tetap berjalan.
- Epik D paling besar dan paling bergantung pada pemeriksaan visual; prioritas di §3 menjaga yang Must selesai lebih dulu.
