# Progres pengerjaan

Pelacak tugas BACKLOG, keputusan per sesi, dan pertanyaan yang masih terbuka. Setiap commit tugas memperbarui barisnya sendiri di sini. Ringkasan status tetap ada di `CLAUDE.md` bagian "Status saat ini".

## Epik A dan B

| Tugas | Status | Bukti terima |
| --- | --- | --- |
| A0 Catat keputusan ke dokumen | selesai | QISSA-SCRIPT, ARCHITECTURE, DATA-CONTRACTS, SRS, PRD, dan CLAUDE.md diperbarui; ADR-010 sampai ADR-014 |
| A1 Scaffold monorepo | selesai | `pnpm install`, `typecheck`, `lint`, `test`, dan `build` hijau pada kode kosong (Node 22.20, pnpm 11.17); aturan batas paket di ESLint diuji dengan pelanggaran sengaja; vite dipin ke 8.3.4 karena 8.3.5 baru berumur beberapa jam (`minimumReleaseAge` pnpm) |
| A2 CI GitHub Actions | selesai, bukti GitHub tertunda | `.github/workflows/ci.yml`: install `--frozen-lockfile`, typecheck, lint, test, build, `pnpm audit --prod --audit-level=high`, unggah artefak `web-dist`; action dipin ke SHA. GitHub menerima workflow-nya tetapi tidak menjalankan job karena billing organisasi tertahan. Sebagai gantinya, semua langkah `run:` dijalankan dari arsip commit di container `node:22-bookworm-slim` dan hijau. "Badge hijau di PR" dicatat setelah billing beres. Langkah `qs lint` dan `qs compile` ditambahkan di B6 |
| A3 `.env.example` dan `lib/config.ts` | selesai | `vite build` tanpa `VITE_SITE_URL` gagal dengan pesan “Konfigurasi apps/web belum lengkap: VITE_SITE_URL kosong; …” dan petunjuk menyalin `.env.example`; dibuktikan otomatis oleh `apps/web/test/build.node.test.ts` (build sungguhan) dan unit test `config.test.ts`. `VITE_CONTENT_BASE` juga wajib; `vite dev` hanya memberi peringatan. Catatan Windows: Git Bash mengubah `/content` di variabel inline menjadi path Windows; pakai `.env` atau `MSYS_NO_PATHCONV=1` |
| B1 `types.ts` dan JSON Schema | belum | |
| B2 Parser | belum | |
| B3 Emitter dan golden test | belum | |
| B4 Linter S1, L1–L7, W1–W4 | belum | |
| B5 `compileDalil` | belum | |
| B6 CLI `qs compile`, `qs lint`, `qs walk` | belum | |

## Keputusan sesi 21 Oktober 2026

Disetujui pemilik sebelum kode ditulis:
1. Node 22 ke atas (minimal 22.18) dan TypeScript 6.0 (ADR-010).
2. `ts-json-schema-generator` dan `ajv` sebagai devDependency `packages/script`; front matter dibaca parser subset YAML sendiri (ADR-011).
3. W1 dihitung per jalur. Peringatan tidak memerahkan CI, dan "2 tes positif" di B4 berarti ep01 dan ep02 tanpa error. Per jalur, ep02 mendapat 3 peringatan W1: Pakai dulu > Aman, Pakai dulu > Nanti aja, dan Balikin sebagian > Nanti aja. Naskahnya tidak diubah.
4. Nama aplikasi judi disimpan sebagai hash; daftarnya dimulai kosong (ADR-013).
5. Gerbang "hanya reviewed di main" dibuat sebagai `qs lint --wajib-review`, belum dinyalakan di CI (ADR-012).
6. `versi_konten` dihitung lewat `content/versi-konten.lock.json` (ADR-014).
7. Rujukan dalil juga dikenali dari kata "HR" (entri "Ihsan" di ep02).
8. Keputusan dicatat ke dokumen sebelum A1 (commit A0); progres dilacak di berkas ini.
9. Repo GitHub `jepens7/qissa`. Satu tugas = satu branch = satu commit = satu PR; merge dengan rebase setelah CI hijau.

Default yang dipakai tanpa keberatan (rinciannya di QISSA-SCRIPT §1, §2, §4, §5, dan §6):
- `from` hanya ada di tampilan grup, mengikuti objek `EPISODES` di prototipe; `dalil` masuk JSON episode.
- Kode S1 untuk kesalahan sintaks dan struktur yang tidak tercakup L1–L7.
- Tes paritas membandingkan 9 jalur × 2 episode dengan `EPISODES` prototipe.

## Pertanyaan terbuka di luar Epik A dan B
- GitHub Actions di organisasi `jepens7` tidak menjalankan job karena billing ("recent account payments have failed or your spending limit needs to be increased"). Setelah dibereskan pemilik: jalankan ulang CI di `main` dan catat hasilnya sebagai bukti A2. Sampai saat itu, setiap PR diverifikasi lokal dan di container Linux.
- Versi format di JSON episode, supaya shell lama bisa menolak episode untuk engine yang lebih baru. Paling murah diputuskan sebelum service worker (M3a) dan APK pertama.
- Blok "ulama berbeda" yang diwajibkan CONTENT-RULES §7 belum punya `kind` di struktur `Dalil` (DATA-CONTRACTS §4).
- Tes jelajah engine (C2) perlu mengompilasi `content/`, jadi butuh pengecualian khusus tes atas aturan "engine hanya memakai tipe dari script" (ARCHITECTURE §3).
- Tiga teks prototipe belum punya sumber di naskah atau i18n: opsi poll "Tegur yang ngirim", memo sampul ep2 ("Minggu lalu kamu memilih …"), dan "Episode 3 … menyusul" (Epik D).
- Aturan CLAUDE.md "perubahan `dalil.md` wajib mengosongkan `reviewed_at`" belum punya pemeriksaan otomatis.
- Epik E: `infra/easypanel.md` langkah 4 meminta mengisi `.env` lalu push, padahal `.env` diabaikan git; Dockerfile juga perlu membangun `apps/web` sendiri karena `dist/` diabaikan.
- SRS §5.3 menulis kunci penyimpanan tanpa awalan `qissa.v1.`, berbeda dengan DATA-CONTRACTS §5 (Epik D).
