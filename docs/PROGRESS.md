# Progres pengerjaan

Pelacak tugas BACKLOG, keputusan per sesi, dan pertanyaan yang masih terbuka. Urutan dan cara kerja minggu 1–2 ada di `docs/PLAN.md`. Setiap commit tugas memperbarui barisnya sendiri di sini. Ringkasan status tetap ada di `CLAUDE.md` bagian "Status saat ini".

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
| B6 CLI `qs compile`, `qs lint`, `qs walk` | selesai | `pnpm qs walk ep02` mencetak 9 jalur, semuanya END (panjang 45–58 baris terlihat). `qs lint`: 0 error, 3 peringatan W1, keluar 0; `--wajib-review` keluar 1. `qs compile` menulis `epNN.json` berindentasi dua spasi sesuai QISSA-SCRIPT §4, sama persis dengan golden snapshot (18,5 KB dan 24,2 KB), dan `manifest.json` ke `apps/web/public/content`; `content/versi-konten.lock.json` dibuat (keduanya `2026-10-21.1`); `--check` gagal bila naskah berubah tanpa memperbarui berkas kunci. CI menjalankan `qs lint` dan `qs compile --check`; `pnpm build` menjalankan `qs compile` lebih dulu. Diuji di `test/cli.test.ts` dengan proses Node sungguhan. Setelah review B3–B6: JSON episode tidak lagi ringkas (berkas kunci dibuat ulang, versi tetap `2026-10-21.1` karena belum pernah dirilis); `url` diturunkan dari berkas yang ditulis; entri kunci episode yang keluar dari manifest disimpan, dan versi baru selalu lebih besar dari versi sebelumnya; berkas kunci yang rusak atau versinya tidak sah ditolak dengan pesan yang menyebut berkasnya; `--out` di dalam folder konten ditolak; `qs walk` keluar 1 hanya karena akhir jalur; anotasi GitHub di-escape; naskah yang berputar lewat pilihan (dulu kehabisan memori) kini dilaporkan dalam waktu kurang dari satu detik |

## Minggu 1–2: tindak lanjut, Epik C, D, dan E

Urutan sesuai `docs/PLAN.md` §2. Status: belum, sedang, menunggu (butuh keputusan pemilik), terblokir (butuh tindakan di luar repo), selesai.

| Tugas | Status | Bukti terima |
| --- | --- | --- |
| T1 Bukti CI A2 di `main` | terblokir | Rerun CI `main` 22 Oktober masih ditolak GitHub: "recent account payments have failed or your spending limit needs to be increased". Repo privat milik organisasi `jepens7`; billing organisasi perlu dicek |
| T2 `content:` rapikan W1 ep02 | selesai | Opsi pilihan pemilik: `@sys Senin, 03.10` membuka `penutup` (narasinya menjadi “Gelap. Lalu layar HP-mu menyala.”), pil “Chat dengan Dion” di `nanti_dipakai`, dan pil “Komentar dinonaktifkan” di `nanti_sebagian`. `qs lint` 0 error dan 0 peringatan; `qs walk ep02` 9 jalur END (47–59 baris terlihat); `EPISODES` prototipe disamakan dan tes paritas lulus; golden snapshot ep02 hanya berubah di tiga tempat itu; `versi_konten` ep02 naik ke `2026-10-22.1` |
| T3 Daftar L5 dan W4 dari riset | selesai | Dua peneliti per daftar (berita dan sumber resmi; komunitas dan perspektif Gen Z), lalu satu verifikator adversarial yang membuka setiap sumber. Hasilnya: 15 nama aplikasi judi dalam 35 bentuk ternormalisasi, hanya hash-nya yang masuk `forbidden.ts`; 16 kata ketuaan dalam 19 ejaan di `dated-words.ts`. Kata umum yang menjadi bagian nama (nama dewa, kata Inggris biasa) dan kata gaul yang masih dipakai Gen Z ditolak. `qs lint` tetap 0 error dan 0 peringatan; pemindai repo bersih; tes memastikan setiap hash berformat SHA-256 dan setiap kata ketuaan memicu W4 |
| T4 `format: 1` di JSON episode | belum | |
| C1 `createStory` | belum | |
| C2 Tes jelajah engine | belum | |
| C3 Tes snapshot dan restore | belum | |
| D1 Token, CSS dasar, font, tema | belum | |
| D2 Komponen dan halaman `#debug` | belum | |
| D6 `lib/content.ts` dan `lib/storage.ts` | belum | |
| D7 `lib/analytics.ts` | belum | |
| D8 Routing hash | belum | |
| D3 `features/reader` | belum | |
| D4 `features/ending` | belum | |
| D5 `features/home` | belum | |
| E1 Dockerfile, header keamanan, CSP | belum | Deploy Easypanel oleh pemilik |
| E2 Halaman `/privasi` dan `/tentang` | belum | |
| E3 Umami dan tujuh event | belum | Dasbor dan screenshot oleh pemilik |

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

## Keputusan sesi 22 Oktober 2026

Jawaban pemilik atas ringkasan Epik B:
1. Billing GitHub Actions dinyatakan sudah dibereskan. Job masih ditolak saat rerun 22 Oktober (T1).
2. Tiga peringatan W1 ep02 dirapikan oleh Claude (T2). Pemilik memilih opsi "pil waktu di penutup": `@sys Senin, 03.10` di awal penutup, pil "Chat dengan Dion" di `nanti_dipakai`, dan pil "Komentar dinonaktifkan" di `nanti_sebagian`.
3. Daftar yang kosong (hash nama aplikasi judi, kata ketuaan) diisi dari riset (T3).
4. Keputusan review B3–B6 disetujui: JSON episode berindentasi, nama akun `cmt:` berbentuk domain dihitung tautan, dan angka polos dianggap uang mulai lima digit.
5. Rekomendasi untuk pertanyaan terbuka didelegasikan kepada Claude. Hasilnya:
   - Versi format episode: `format: 1` di JSON episode; engine menolak format lain (ADR-015, T4).
   - Blok "ulama berbeda": jenis bagian `ikhtilaf` ditunda sampai `dalil.md` pertama membutuhkannya, paling lambat sebelum APK pertama (M3b). Story bible baru memakainya di ep04.
   - Tes engine dan logika apps/web membaca golden snapshot dengan `node:fs`; tidak ada dependensi tes DOM sampai M3a (ADR-016).
   - Tiga teks prototipe:
     - poll landing masuk `i18n/id.json`, dengan tes pencocok nama pendek p1 ep01;
     - memo sampul dan "menyusul" menjadi templat i18n generik tanpa teks episode.
   - Aturan `reviewed_at` tetap diperiksa saat review PR `content` yang menyentuh `dalil.md`. Tidak ada pemeriksaan CI, karena dokumen tidak memintanya, dan PR review pertama justru mengubah isi dan status sekaligus.
   - Epik E: Dockerfile membangun apps/web sendiri, dan `VITE_*` masuk lewat build arg Easypanel (E1).
   - Kunci penyimpanan mengikuti DATA-CONTRACTS §5; SRS §5.3 dan REF-1 diselaraskan. Kunci prototipe tidak dimigrasi.
   - SRS ENG-1 "event `line`" diwujudkan sebagai langkah `render` dari `next()`.
   - Daftar L5 dan W4 diisi dari riset dua sudut yang diverifikasi adversarial (T3).
6. Tidak boleh ada overengineering: bangun yang diminta dokumen dengan cara paling sederhana yang benar.

## Pertanyaan terbuka
- Billing GitHub Actions organisasi `jepens7` (T1). Sampai beres, setiap PR diverifikasi lokal dan di container Linux.
- Pendaftaran domain `qissa.id` (RDAP registri .id menjawab 404 per 22 Oktober) dan langkah Easypanel, berurutan di `docs/PLAN.md` §4.
