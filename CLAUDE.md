# Qissa — panduan untuk Claude Code

## Apa ini
Qissa adalah aplikasi cerita pendek interaktif berbentuk chat (chat fiction) untuk Muslim Indonesia usia 17–40. Pembaca memilih, konsekuensinya terasa di dalam cerita, dan dalil (Al-Qur'an dan hadis beserta derajatnya) muncul **setelah** cerita, bukan sebelum. Qissa bukan aplikasi ibadah, bukan kuis, bukan ceramah.

Dokumen yang menjadi sumber kebenaran (baca sesuai kebutuhan tugas):
- Produk: `docs/PRD.md`
- Persyaratan: `docs/SRS.md`
- Desain sistem (batas modul, API engine, caching, alur): `docs/ARCHITECTURE.md`
- Kontrak data (manifest, env, storage, PocketBase, versi): `docs/DATA-CONTRACTS.md`
- Design system (token, komponen, microcopy, aksesibilitas): `docs/DESIGN-SYSTEM.md`
- Format naskah dan linter: `docs/QISSA-SCRIPT.md`
- Aturan konten: `docs/CONTENT-RULES.md`; story bible lengkap: `docs/STORY-BIBLE.md`
- Privasi, keamanan, CSP, kebijakan privasi: `docs/PRIVACY-SECURITY.md`
- Keputusan arsitektur: `docs/DECISIONS.md`
- Jadwal: `docs/ROADMAP.md`; tugas minggu 1–2 dengan kriteria terima: `docs/BACKLOG.md`; urutan dan cara pengerjaannya: `docs/PLAN.md`
- Operasional dan insiden: `docs/RUNBOOK.md`; checklist rilis: `docs/RELEASE.md`
- Progres tugas, keputusan per sesi, dan pertanyaan terbuka: `docs/PROGRESS.md`

Kalau kode dan dokumen bertentangan, dokumen yang benar; perbaiki kodenya, atau ajukan perubahan dokumen lewat PR.

## Tiga prinsip yang tidak boleh dilanggar oleh kode
1. **Tidak ada skor iman.** Tidak ada leaderboard publik, poin ibadah, atau streak yang mempermalukan. Yang boleh: konsekuensi naratif, "akhir yang sudah dibaca", dan (fase 2) streak privat tanpa notifikasi rasa bersalah.
2. **Dalil selalu setelah pilihan.** UI tidak boleh menampilkan kartu dalil, "jawaban benar", tanda centang, atau penilaian moral sebelum episode tamat.
3. **Tanpa iklan, tanpa pelacak pihak ketiga, tanpa cookie.** Analitik hanya Umami self-hosted tanpa data pribadi. Jawaban refleksi disimpan di perangkat dan tidak pernah dikirim.

## Stack
- `apps/web`: React 18 + Vite + TypeScript (strict). PWA. CSS vanilla dengan design token (`apps/web/src/styles/tokens.css`), bukan Tailwind, bukan UI kit.
- `packages/engine`: mesin cerita murni TypeScript tanpa DOM (step, branch, variabel, snapshot). Wajib bisa diuji tanpa browser.
- `packages/script`: parser dan compiler Qissa Script (`.qs.md`) menjadi JSON episode, plus linter konten. CLI: `pnpm qs compile`, `pnpm qs lint`.
- `content/`: naskah `.qs.md`, `dalil.md`, dan `manifest.json`. Konten adalah data; tidak ada teks cerita di dalam kode aplikasi.
- `backend/pocketbase`: PocketBase untuk form masukan (SRS SHR-3), ditunda setelah Ramadan dan belum ada di repo; akun dan progres di fase 2.
- `apps/android`: Capacitor (digenerate; hanya konfigurasi yang diedit manual).
- `infra/`: Dockerfile, nginx.conf, catatan Easypanel, dan `infra/prototype/index.html` sebagai implementasi rujukan satu berkas yang sudah diuji pembaca.
- Package manager: pnpm 11 (workspaces). Node 22 LTS ke atas, minimal 22.18 karena CLI `qs` dijalankan langsung dari TypeScript lewat type stripping Node (ADR-010).

## Perintah
- `pnpm install`
- `pnpm dev` — jalankan apps/web
- `pnpm build` — build semua
- `pnpm test` — vitest semua paket
- `pnpm lint` dan `pnpm typecheck`
- `pnpm verify` — typecheck, lint, test, dan `qs lint` sekaligus; jalankan sebelum commit
- `pnpm qs compile` — `content/` menjadi `apps/web/public/content/*.json`; `--check` hanya memeriksa `content/versi-konten.lock.json`
- `pnpm qs lint` — aturan konten (lihat docs/QISSA-SCRIPT.md §6); `--wajib-review` menolak episode yang belum direview
- `pnpm qs walk epNN` — cetak semua jalur episode beserta panjangnya
- `pnpm e2e` — E2E Playwright di 360×780 terhadap build produksi (jalankan `pnpm build` dulu; sekali di mesin baru: `pnpm --filter @qissa/web exec playwright install chromium`)
- `pnpm cap:sync` — build apps/web mode `android` ke `dist-android`, lalu `cap sync android` (ADR-020); `pnpm cap:open` — buka proyek di Android Studio

## Peta repo
```
qissa/
  CLAUDE.md
  docs/                 PRD, SRS, QISSA-SCRIPT, CONTENT-RULES, DECISIONS, ROADMAP
  content/
    manifest.json       daftar episode yang dirilis
    episodes/epNN-slug/ episode.qs.md + dalil.md
  apps/web/             PWA (React + Vite)
  apps/android/         Capacitor
  packages/engine/      mesin cerita
  packages/script/      compiler + linter Qissa Script
  backend/pocketbase/   pb_migrations, pb_hooks (setelah Ramadan)
  infra/                nginx, Dockerfile, easypanel.md, prototype/
```

## Konvensi kode
- TypeScript strict, tanpa `any` (ESLint `strictTypeChecked`). Tipe JSON episode didefinisikan satu kali di `packages/script/src/types.ts` dan dipakai engine dan web.
- Impor relatif memakai ekstensi berkas (`./parse.ts`); tanpa `enum`, `namespace`, dan parameter property, karena Node menjalankan `.ts` dengan type stripping.
- Komponen fungsional dengan hooks. State cerita hanya di engine; React hanya me-render hasilnya.
- Nama berkas kebab-case, komponen PascalCase, satu komponen per berkas.
- Semua string UI di `apps/web/src/i18n/id.json` (Indonesia dulu; en dan ms menyusul). Jangan hardcode string UI di komponen.
- Tipografi: tanda kutip “ ” dan apostrof ’ di semua teks yang dibaca pengguna; tanda kutip lurus hanya di kode.
- Tanpa emoji di UI. Ikon berupa SVG inline sederhana.
- Aksesibilitas: semua kontrol bisa dioperasikan keyboard, fokus terlihat, `prefers-reduced-motion` dihormati, kontras minimal 4.5:1.
- Mobile-first: viewport 360–430px adalah target utama. Uji di Android Chrome.
- Jangan menambah library tanpa alasan tertulis di `docs/DECISIONS.md`.

## Konten dan dalil
- Jangan pernah mengarang nomor hadis, derajat, atau terjemahan. Kalau tidak yakin, tulis "perlu verifikasi pereview" dan biarkan badge "Belum direview ulama" tampil.
- Nama aplikasi judi, nominal taruhan, dan cara deposit dilarang muncul di konten maupun kode, termasuk fixture test. `pnpm qs lint` menolaknya.
- Pilihan selalu tiga opsi, teks opsi maksimal 8 kata, dan tidak ada opsi yang jelas benar.
- Perubahan pada `dalil.md` wajib mengosongkan `reviewed_at` (butuh review ulang).

## Analitik
Nama event tetap: `poll`, `mulai`, `pilihan`, `selesai`, `bagikan`, `masukan`, `saluran`. Definisi dan data tiap event ada di `docs/SRS.md` §8. Jangan menambah event tanpa memperbarui SRS. Tidak ada data pribadi di event.

## Alur kerja
- Satu tugas BACKLOG = satu branch = satu commit = satu PR ke `main`; merge dengan rebase setelah CI hijau. Commit mengikuti Conventional Commits: `feat:`, `fix:`, `content:`, `docs:`, `chore:`, `test:`.
- Setiap commit tugas memperbarui barisnya di `docs/PROGRESS.md`.
- Perubahan naskah lewat PR berlabel `content` dan harus lolos `pnpm qs lint`.
- Definisi selesai: typecheck, lint, test hijau; diuji manual di Android Chrome 360px; tidak ada string UI hardcode; tidak ada console.error.
- Sebelum menambah fitur: cek `docs/PRD.md` §7 apakah masuk MVP. Kalau tidak, catat di `docs/ROADMAP.md` bagian "Setelah Ramadan", jangan dibangun.
- Perbarui bagian "Status saat ini" di bawah setiap kali milestone berubah.

## Status saat ini
- Selesai: story bible, naskah Episode 1 dan 2 (`content/episodes`), prototipe satu berkas (`infra/prototype/index.html`) yang sudah diuji ke teman, paket deploy nginx. Epik A: scaffold monorepo pnpm, CI GitHub Actions (hijau sejak 23 Oktober), konfigurasi lingkungan apps/web. Epik B: `packages/script` lengkap (parser, emitter, penjelajah jalur, linter S1, L1–L7, dan W1–W4, `compileDalil`, serta CLI `qs compile`, `qs lint`, dan `qs walk`); ep01 dan ep02 terkompilasi dan jalurnya sama dengan prototipe. Epik C: `packages/engine` (`createStory`, tes jelajah semua episode, snapshot dan restore). Epik D: apps/web lengkap (token dan tema, komponen, reader, layar akhir, home, konten offline-first, analitik tujuh event, routing hash), diperiksa terhadap prototipe di 360×780. E1: image nginx multi-tahap dengan CSP dan `/healthz`. E2: halaman `/privasi` dan `/tentang`. Epik F: kontras `--muted`, region live layar akhir, `#debug` hanya di dev, memo sampul, dan bagian dalil `ikhtilaf`. Epik G: service worker app shell dengan baris "Versi baru tersedia" (ADR-017), episode yang pernah dibuka tetap terbaca offline, dan E2E Playwright 360×780 di CI (ADR-018). QA lokal dan audit kesiapan pra-deploy: CLS 0, font di-host sendiri (ADR-019), kartu tamat tidak terlewati, manifest kunjungan pertama tanpa batas 3 detik, teks Arab 25 px, 404 nginx tanpa cache, dan Umami tanpa parameter URL. Keputusan pemilik atas temuan audit (keputusan 23 Oktober butir 12): event Umami diantre selama skrip dimuat, episode yang mencapai tanggal rilis tampil di sesi yang masih hidup (manifest tetap dimuat sekali per muat halaman), unduhan episode berbatas waktu bila versi lama tersimpan (termasuk body), dan poll Episode 1 mengikuti rilis ep01; kartu narasi yang terlalu panjang dipangkas sesudah I2. Keputusan menjelang deploy (butir 13): templat masukan diakhiri `halo@qissah.id`, Saluran WhatsApp dibuat sebelum deploy, dan deploy sesudah uji HP dengan sasaran sekitar 12 November. Rinciannya di `docs/PROGRESS.md`.
- Sedang: qissah.id live sejak 23 Oktober lewat Easypanel (`main` ff156b4, tag `web-v0.1.0`; Lighthouse live 95/100/100/100); ep01–02 tampil 4 November. Log akses nginx tanpa IP dan Referer sejak 24 Oktober; Auto Deploy aktif, jadi merge ke `main` langsung live. Uji HP dijalankan di Docker pada 24 Oktober (emulator Android 14 dengan TalkBack dan Chrome, Firefox desktop, WebKit berprofil iPhone) dan lulus; temuan fokus TalkBack sudah diperbaiki. Menunggu pemilik: tampilan Safari iOS di iPhone, Saluran WhatsApp (`VITE_WA_CHANNEL`), pemantau uptime, cadangan Umami, `docker container prune` untuk log lama, serta event `saluran` dan screenshot dasbor untuk E3. Epik H (Android, ADR-020): H2 bagian web dan infra selesai, proyek Capacitor dan `pnpm cap:sync` siap (H1), dan kode share native, deep link, serta tombol kembali selesai (H3); APK ikut Umami. APK debug dibangun di Docker dan lulus uji di emulator (H1–H3 selesai); build rilis (AAB dan keystore) di Android Studio menjelang Play Store. Kartu narasi ep01–ep02 yang lebih dari tiga kalimat dipangkas saat revisi baca Gen Z sesudah I2.
- Belum: review ulama (badge masih "Belum direview"), Play Store, konten Ramadan, Episode 3.

## Rujukan eksternal
Tautan berikut tidak bisa dibuka dari CLI; isinya sudah disalin ke `content/` dan `docs/`.
- Story bible: https://claude.ai/artifact/KpANnby5rBuxGNGmBQnGTN
- Naskah Episode 1: https://claude.ai/artifact/Gv28ix1zHw98dPyAvusbTn
- Naskah Episode 2: https://claude.ai/artifact/F9mXHZrdu46aD2zjqmVDDB
- Prototipe (teman): https://claude.ai/artifact/8kdrHVn6sTBACYVChKQcXr
