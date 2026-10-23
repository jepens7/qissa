# Backlog — Minggu 1 dan 2

Tiap tugas punya kriteria terima. Urutan kerja minggu 1–2 mengikuti `docs/PLAN.md` §2. Claude Code: kerjakan satu tugas per branch, jalankan tes, lalu perbarui status di `CLAUDE.md` saat epik selesai.

## Epik A: Fondasi monorepo
- A1 Scaffold pnpm workspaces: `apps/web`, `packages/script`, `packages/engine`; TypeScript strict; ESLint + Prettier; vitest. Terima: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` berjalan hijau pada kode kosong.
- A2 GitHub Actions `ci.yml` menjalankan keempat perintah itu plus `qs lint` dan `qs compile` (setelah B selesai). Terima: badge hijau di PR.
- A3 `.env.example` dan `lib/config.ts` membaca `VITE_*`. Terima: build gagal dengan pesan jelas bila `VITE_SITE_URL` kosong.

## Epik B: packages/script
- B1 `types.ts` sesuai `docs/QISSA-SCRIPT.md` §4; JSON Schema dihasilkan ke `schema/episode.schema.json`. Terima: `tsc` hijau; skema valid.
- B2 Parser front matter + tokenizer baris + parser knot, blok `::: shot`, blok `??`, blok pilihan, kondisional `?`. Terima: ep01 dan ep02 di `content/` terparse tanpa error.
- B3 Emitter JSON. Terima: golden snapshot untuk ep01 dan ep02; jalur `Tutup → Ketemu dulu` ep01 menghasilkan urutan baris persis seperti prototipe.
- B4 Validator L1–L7 dan W1–W4 dengan pesan berbahasa Indonesia dan nomor baris. Terima: 12 tes negatif (satu per aturan) dan 2 tes positif.
- B5 `compileDalil`. Terima: `dalil.md` ep01 menghasilkan 2 ayat, 2 hadis, 1 catatan, 1 hukum; baris Arab terdeteksi.
- B6 CLI `qs compile`, `qs lint`, `qs walk`. Terima: `pnpm qs walk ep02` mencetak 9 jalur, semua berakhir di END.

## Epik C: packages/engine
- C1 `createStory` dengan `next`, `choose`, `snapshot`, `restore` sesuai `docs/ARCHITECTURE.md` §5. Terima: tes unit tiap jenis baris.
- C2 Tes jelajah otomatis untuk semua episode di `content/`. Terima: semua kombinasi pilihan mencapai `end`; tidak ada knot yang tidak terjangkau.
- C3 Tes snapshot/restore: restore `p2` lalu pilih opsi lain menghasilkan akhir berbeda dengan `rendered` yang benar.

## Epik D: apps/web paritas prototipe
- D1 Tokens, base CSS, font loading, tema terang/gelap. Terima: screenshot visual sama dengan prototipe pada 360 px untuk home dan reader.
- D2 Komponen inventaris (`docs/DESIGN-SYSTEM.md` §4). Terima: Storybook tidak diperlukan; halaman `#debug` menampilkan semua komponen dengan data contoh.
- D3 `features/reader` memakai engine; ketukan, keyboard, typing, pilihan, restore. Terima: ep01 dan ep02 bisa ditamatkan di semua jalur.
- D4 `features/ending`: tamat, dalil dari struktur `Dalil`, refleksi tersimpan, bagikan, masukan, lanjut, ulang, daftar. Terima: tidak ada `dangerouslySetInnerHTML`.
- D5 `features/home`: poll, daftar episode dari manifest, saluran. Terima: status "selesai, N dari 3" benar setelah membaca.
- D6 `lib/content.ts` memuat manifest network-first dan episode cache-first; `rilis` masa depan disembunyikan. Terima: tes dengan manifest palsu.
- D7 `lib/analytics.ts` dengan tujuh event. Terima: tes memastikan nama event hanya dari union.
- D8 Routing hash `#home`, `#epNN`; `replaceState`. Terima: tautan `#ep02` membuka episode 2.

## Epik E: qissah.id live
- E1 `infra/nginx/Dockerfile` menyalin `apps/web/dist`; header keamanan dan CSP dari `docs/PRIVACY-SECURITY.md` §3. Terima: `curl -I` menunjukkan header; situs berjalan di Easypanel.
- E2 Halaman `/privasi` dan `/tentang` (HTML statis di `apps/web/public/`, tanpa konversi markdown). Terima: tautan dari footer.
- E3 Umami terpasang dan tujuh event terlihat di dasbor dari sesi uji. Terima: screenshot dasbor di PR.

## Epik F: merapikan web (sebelum deploy)
- F0 Rencana fase lokal dan keputusan 23 Oktober dicatat di dokumen. Terima: PLAN §6, BACKLOG, PROGRESS, ROADMAP, PRD, SRS, dan CLAUDE.md selaras; `pnpm verify` hijau.
- F1 Aksesibilitas, `#debug`, dan memo sampul. Terima: kontras teks ≥ 4,5:1 di kedua tema, dengan rasionya dicatat di DESIGN-SYSTEM §1; region `aria-live` tidak memuat kartu dalil; `#debug` di build produksi kembali ke home; memo sampul tanpa "Minggu lalu".
- F2 Bagian dalil "Ulama berbeda" (`ikhtilaf`) masuk `format: 1`. Terima: tes `compileDalil` dan markup PaperCard; golden snapshot ep01–02 tidak berubah.

## Epik G: PWA dan offline (M3a, sebelum deploy)
- G1 Service worker dan baris "Versi baru tersedia". Terima: dalam mode offline, muat ulang menampilkan home dan episode yang pernah dibuka bisa ditamatkan; tanpa pelanggaran CSP di image Docker; app shell ≤ 150 KB gzip.
- G2 Episode yang pernah dibuka tetap terbaca offline setelah `versi_konten` naik. Terima: tes dengan cache dan fetch palsu.
- G3 E2E Playwright di 360×780 untuk enam skenario SRS §9. Terima: hijau di lokal dan di CI; skenario offline gagal bila service worker dimatikan.

## Epik H: Android (M3b, sesudah deploy web)
- H1 Proyek Capacitor dan APK debug. Terima: ep01 bisa ditamatkan di HP; `pnpm verify` tetap hijau setelah `cap sync`.
- H2 APK memuat konten dari qissah.id. Terima: build Android gagal bila `VITE_CONTENT_BASE` bukan https; header CORS `/content/` terlihat di `curl -I`.
- H3 Share native dan deep link. Terima: lembar bagikan native terbuka; `#ep02` terbuka lewat `adb shell am start`, baik saat aplikasi tertutup maupun terbuka.

## Pemicu
- I1 Gerbang `qs lint --wajib-review` di CI dan Dockerfile, setelah review ulama ep01–02 tercatat. Terima: PR berisi dalil draft ke `main` merah.
- I2 Prototipe dipensiunkan setelah pemilik menguji paritas di HP. Terima: `pnpm verify` hijau tanpa `infra/prototype`. Revisi naskah pertama sesudahnya (baca Gen Z) juga memangkas kartu narasi ep01–ep02 yang lebih dari tiga kalimat (CONTENT-RULES §4; PROGRESS keputusan 23 Oktober butir 12).

Setelah Ramadan (ROADMAP): form masukan PocketBase, push FCM, dan mode tema manual. Episode 3 adalah pekerjaan konten (ROADMAP minggu 3).
