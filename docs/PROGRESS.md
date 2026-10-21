# Progres pengerjaan

Pelacak tugas BACKLOG, keputusan per sesi, dan pertanyaan yang masih terbuka. Setiap commit tugas memperbarui barisnya sendiri di sini. Ringkasan status tetap ada di `CLAUDE.md` bagian "Status saat ini".

## Epik A dan B

| Tugas | Status | Bukti terima |
| --- | --- | --- |
| A0 Catat keputusan ke dokumen | selesai | QISSA-SCRIPT, ARCHITECTURE, DATA-CONTRACTS, SRS, PRD, dan CLAUDE.md diperbarui; ADR-010 sampai ADR-014 |
| A1 Scaffold monorepo | selesai | `pnpm install`, `typecheck`, `lint`, `test`, dan `build` hijau pada kode kosong (Node 22.20, pnpm 11.17); aturan batas paket di ESLint diuji dengan pelanggaran sengaja; vite dipin ke 8.3.4 karena 8.3.5 baru berumur beberapa jam (`minimumReleaseAge` pnpm) |
| A2 CI GitHub Actions | selesai, bukti GitHub tertunda | `.github/workflows/ci.yml`: install `--frozen-lockfile`, typecheck, lint, test, build, `pnpm audit --prod --audit-level=high`, unggah artefak `web-dist`; action dipin ke SHA. GitHub menerima workflow-nya tetapi tidak menjalankan job karena billing organisasi tertahan. Sebagai gantinya, semua langkah `run:` dijalankan dari arsip commit di container `node:22-bookworm-slim` dan hijau. "Badge hijau di PR" dicatat setelah billing beres. Langkah `qs lint` dan `qs compile` ditambahkan di B6 |
| A3 `.env.example` dan `lib/config.ts` | selesai | `vite build` tanpa `VITE_SITE_URL` gagal dengan pesan “Konfigurasi apps/web belum lengkap: VITE_SITE_URL kosong; …” dan petunjuk menyalin `.env.example`; dibuktikan otomatis oleh `apps/web/test/build.node.test.ts` (build sungguhan) dan unit test `config.test.ts`. `VITE_CONTENT_BASE` juga wajib; `vite dev` hanya memberi peringatan. Catatan Windows: Git Bash mengubah `/content` di variabel inline menjadi path Windows; pakai `.env` atau `MSYS_NO_PATHCONV=1` |
| B1 `types.ts` dan JSON Schema | selesai | `tsc` hijau; `schema/episode.schema.json` (draft-07, `additionalProperties: false`) dihasilkan `ts-json-schema-generator` dan diuji `test/schema.test.ts`: sama dengan hasil generate terbaru (perbarui dengan `pnpm test -u`), lolos meta-skema `ajv`, menerima episode contoh, menolak narasi yang punya `text` sekaligus `cases`, jenis baris tak dikenal, dan key tambahan |
| B2 Parser | selesai | ep01 dan ep02 terparse tanpa diagnostik (`test/parse.test.ts`); AST lengkap tiap jenis pernyataan diuji dengan nomor baris; front matter subset YAML, tokenizer setiap jenis baris, dan lebih dari 40 kasus S1 diuji, termasuk pemulihan setelah error serta CRLF dan BOM. Sebelum merge ditinjau tiga reviewer (kepatuhan spesifikasi, input adversarial, kecukupan tes) dan satu verifikator; temuan yang sah sudah diperbaiki, antara lain front matter yang tidak ditutup, `[…]` di luar `vars`, kunci pilihan kembar, `?? END`, dan regex opsi yang bisa lambat |
| B3 Emitter dan golden test | selesai | Golden snapshot `packages/script/__snapshots__/ep01.json` dan `ep02.json` (lolos JSON Schema). Paritas dengan `EPISODES` prototipe di 9 jalur × 2 episode (`test/paritas-prototipe.test.ts`): urutan yang dilihat pembaca, baris yang dijalankan, meta, dan isi shot sama; sisi prototipe dijalankan tiruan `step()` prototipe, bukan walker yang sama. Jalur ep01 Tutup → Ketemu dulu diuji tersendiri (50 baris, sama persis). Panjang setiap jalur diuji (ep01 44–51, ep02 45–58 baris terlihat; `@typing` tidak dihitung). Golden test membaca semua folder `content/episodes`. Setelah review B3–B6: walker mengenali putaran (jalur yang masuk lagi ke knot dengan nilai variabel yang sama berhenti sebagai `putar` di baris atau opsi yang kembali), sehingga naskah yang berputar lewat pilihan tidak lagi menghabiskan memori; jumlah jalur dibatasi 1.000 |
| B4 Linter S1, L1–L7, W1–W4 | selesai | `test/validate.test.ts`: 31 kasus negatif, minimal satu per subaturan S1 dan L1–L7, ditambah satu per W1–W4. Tes positif: ep01 tanpa diagnostik; ep02 tanpa error dengan tiga peringatan W1 yang sudah diketahui (baris 195, 207, 211). Pemeriksaan lintas berkas di `test/proyek.test.ts` (id dan folder, berikutnya, manifest dibanding front matter dan dalil, dalil.md hilang, `--wajib-review`). `test/repo-bebas-judi.test.ts` memindai repo di luar `content/`. Nama judi dan kata taruhan di tes memakai istilah sintetis. Setelah review B3–B6: L2 melaporkan putaran di baris atau opsi yang kembali dan knot dihitung tercapai dari knot yang dimasuki; L5 mengenali angka uang lintas kata (Rp 50 ribu, 2,5 jt), tidak lagi menganggap jam, hitungan, dan nomor pasal sebagai nominal, memperluas pengenalan tautan dan tag HTML, serta menangkap klitika (depositnya); manifest yang bukan objek ber-`id`, entri kembar, dan `url` yang salah ditolak; pencocok diuji tersendiri di `test/kata-terlarang.test.ts`, dan pemindai repo membaca semua berkas teks kecuali `content/` di akar |
| B5 `compileDalil` | selesai | `test/compile-dalil.test.ts`: dalil.md ep01 menghasilkan 2 ayat, 2 hadis, 1 catatan, 1 hukum; baris Arab (baris 8 dan 13) terdeteksi lewat `\p{Script=Arabic}` tanpa huruf Latin; entri “Ihsan” ep02 berujukan. `compileEpisode` menggabungkan dalil ke JSON episode; golden snapshot kini memuat `dalil` (diff hanya penambahan) dan lolos JSON Schema. Setelah review B3–B6 ditambah tes: `status: reviewed` membawa pereview dan tanggal ke JSON, hanya baris terakhir entri yang bisa menjadi rujukan, bagian tanpa entri dihilangkan, dan `compileEpisode` mengembalikan null bila hanya dalil.md yang error |
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
