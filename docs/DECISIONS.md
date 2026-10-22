# Keputusan arsitektur (ADR)

Format: konteks, keputusan, konsekuensi. Keputusan baru ditambahkan di bawah dengan nomor berikutnya; keputusan lama tidak dihapus, hanya ditandai "digantikan oleh".

## ADR-001 Stack: React + Vite + TypeScript, PocketBase
Konteks: satu founder, VPS dengan Easypanel, target PWA dan Android, backend minimal di MVP.
Keputusan: apps/web dengan React 18, Vite, TypeScript strict, CSS vanilla dengan token; PocketBase sebagai backend (satu binary, SQLite, auth Google bawaan) di Easypanel; Capacitor untuk Android.
Konsekuensi: sedikit bagian bergerak; PocketBase cukup sampai puluhan ribu pengguna; migrasi ke Postgres bila melewati itu. Tidak memakai Next.js karena tidak butuh SSR.

## ADR-002 Format naskah: Qissa Script, bukan Ink
Konteks: naskah sudah ditulis dalam notasi `Nama:`, `>`, `[Pilihan]`; penulis adalah founder dibantu AI, bukan programmer naratif.
Keputusan: bakukan notasi itu sebagai Qissa Script dengan compiler sendiri (packages/script). Ink tidak dipakai.
Konsekuensi: naskah dari dokumen bisa langsung dikompilasi; fitur bahasa sengaja dibatasi (kondisi hanya variabel boolean). Bila kebutuhan logika tumbuh, pertimbangkan Ink saat itu, bukan sekarang.

## ADR-003 Tanpa login di MVP
Konteks: install dan login memutus viral loop "Lu bakal gimana?"; data pribadi membawa kewajiban UU PDP.
Keputusan: semua fitur inti tanpa akun; progres dan refleksi di perangkat; PocketBase hanya untuk masukan tanpa identitas.
Konsekuensi: progres hilang bila ganti HP (diterima untuk MVP); akun dan sinkronisasi di fase 2 dengan opsi masuk Google.

## ADR-004 Analitik: Umami self-hosted
Konteks: prinsip tanpa pelacak pihak ketiga dan tanpa cookie; VPS tersedia.
Keputusan: Umami di Easypanel; tujuh event tetap tanpa data pribadi.
Konsekuensi: tidak ada funnel per pengguna; cukup untuk metrik agregat yang ditetapkan PRD.

## ADR-005 Konten sebagai data yang dimuat dari server
Konteks: "30 Malam" butuh episode baru tiap hari tanpa rilis app store.
Keputusan: manifest + JSON episode disajikan nginx, di-cache oleh service worker; app shell dan konten berversi terpisah.
Konsekuensi: rilis konten = commit ke content/ dan deploy; app store hanya untuk perubahan shell.

## ADR-006 Tidak ada gamifikasi keimanan
Konteks: leaderboard dan skor amal memicu riya dan membuat orang berhenti jujur saat memilih.
Keputusan: tidak ada poin, skor, leaderboard, atau streak publik; yang dilacak hanya akhir yang sudah dibaca dan jalur.
Konsekuensi: engagement mengandalkan tokoh dan cerita, bukan mekanik; streak privat boleh dipertimbangkan di fase 2.

## ADR-007 Dua pereview berbeda latar, nama tampil
Konteks: kepercayaan adalah moat; krisis kepercayaan pada konten hadis tanpa sumber.
Keputusan: setiap episode direview minimal satu orang berlatar syariah (target dua, NU dan Muhammadiyah), nama dan tanggal tampil di kartu dalil; badge "Belum direview" sampai saat itu.
Konsekuensi: biaya per episode; episode tidak rilis publik tanpa review.

## ADR-008 Rating 17+ dan "berani tapi beradab"
Konteks: tema nyata (judol, pinjol, relasi) dibutuhkan agar cerita terasa sungguhan.
Keputusan: tampilkan tarikan dan harga, bukan mekanisme; linter memblokir kata terlarang; rating 17+ dideklarasikan.
Konsekuensi: segmen di bawah 17 tahun bukan target; kampanye menyebut batas usia.

## ADR-009 CSS vanilla dengan token, tanpa Tailwind
Konteks: UI kecil dan sangat spesifik (chat, kartu), dua tema, prioritas ukuran bundel.
Keputusan: token di `tokens.css`, komponen dengan CSS modul biasa; tidak ada framework CSS.
Konsekuensi: lebih sedikit dependensi; disiplin penamaan diperlukan.

## ADR-010 Toolchain: Node 22, TypeScript 6.0, ESLint, Prettier, vitest
Konteks: Node 20 sudah EOL sejak 30 April 2026. pnpm 11 butuh Node 22.13 ke atas dan vitest 5 butuh 22.12 ke atas. TypeScript 7.0 belum didukung typescript-eslint (batasnya di bawah 6.1). BACKLOG A1 mewajibkan ESLint, Prettier, dan vitest. Mesin penulis Windows, sedangkan CI dan Docker Linux.
Keputusan: Node 22.18 ke atas di lokal dan CI. pnpm 11.17.0 dipin lewat `packageManager`, dengan `shellEmulator: true` supaya skrip sama di Windows dan Linux. Paket: `typescript` 6.0; `eslint` 10 dengan `@eslint/js` dan `typescript-eslint` (preset `strictTypeChecked`); `prettier` 3 hanya untuk kode; `vitest` 5; `vite` 8 dengan `@vitejs/plugin-react`; `react` dan `react-dom` 18.3; `@types/react`, `@types/react-dom`, `@types/node`. CLI `qs` dijalankan langsung dari TypeScript lewat type stripping Node, tanpa tsx dan tanpa langkah build. `apps/web` ditulis tangan, tidak dari create-vite. GitHub Actions dipin ke SHA commit.
Konsekuensi: impor relatif memakai ekstensi `.ts`; `enum`, `namespace`, dan parameter property dilarang (`erasableSyntaxOnly`). Naik ke TypeScript 7 menunggu dukungan typescript-eslint.

## ADR-011 JSON Schema dihasilkan dari tipe
Konteks: DATA-CONTRACTS §3 menjadikan `types.ts` sumber kebenaran dan meminta JSON Schema hasil generate untuk validasi di CI. BACKLOG B1 meminta skema yang valid.
Keputusan: `ts-json-schema-generator` menghasilkan `packages/script/schema/episode.schema.json` dari `types.ts`. `ajv` memvalidasi skema itu terhadap meta-skema dan memvalidasi JSON hasil compile di tes. Keduanya devDependency `packages/script` saja dan tidak ikut ke bundel app. Front matter dibaca parser subset YAML buatan sendiri (QISSA-SCRIPT §1), tanpa paket `yaml`.
Konsekuensi: tes gagal bila skema yang dikomit basi terhadap `types.ts`. `ts-json-schema-generator` membawa salinan TypeScript-nya sendiri, hanya di devDependency.

## ADR-012 Tahap 0 boleh menayangkan episode draft
Konteks: DATA-CONTRACTS §2, SRS §7 dan §10, serta PRD §9 hanya mengizinkan episode `reviewed` di produksi. ROADMAP menayangkan ep01–02 di minggu 2, review ulama selesai di minggu 4, dan staging baru ada di minggu 5. Easypanel membangun `main` setiap push tanpa menunggu CI.
Keputusan: gerbang review dibuat sebagai `qs lint --wajib-review` lengkap dengan tes, tetapi belum dinyalakan di CI. Selama Tahap 0, episode draft tayang dengan badge "Belum direview ulama". Setelah review ep01–02 selesai, gerbang dinyalakan di CI dan di build Docker; hanya build Docker yang bisa benar-benar menahan deploy.
Konsekuensi: pengecualian sementara atas aturan "hanya reviewed di produksi", dengan tanggal berakhir yang jelas (review ep01–02).

## ADR-013 Nama aplikasi judi disimpan sebagai hash
Konteks: L5 butuh daftar nama aplikasi judi, sedangkan CLAUDE.md melarang nama itu muncul di kode maupun fixture test.
Keputusan: `packages/script/src/forbidden.ts` menyimpan SHA-256 dari nama yang dinormalkan sama seperti teks naskah lewat `hashNama`: huruf kecil, tanda baca dan batas huruf-angka menjadi pemisah kata, kata dipisah satu spasi. Teks naskah dicocokkan per kata dan per frasa sampai tiga kata. Istilah umum ("deposit", "gacor" di luar "Gacor Family") dan pola (tautan, tag HTML, nominal taruhan) ditulis apa adanya. "slot" dan "withdraw" tidak dilarang karena dipakai story bible sebagai tema. Satu tes memindai berkas repo di luar `content/` dengan pencocok yang sama.
Konsekuensi: daftar hash dimulai kosong. Menambah nama berarti menambah hash; cara menghitungnya ada di komentar `forbidden.ts`.

## ADR-014 `versi_konten` dihitung lewat berkas kunci
Konteks: DATA-CONTRACTS §9 meminta `versi_konten` berformat `YYYY-MM-DD.n` dihitung dari tanggal dan hash isi. Itu butuh state yang disimpan, sedangkan `qs compile` tidak boleh mengubah teks di `content/`. Nama berkas berversi dijadwalkan di M3a (minggu 5).
Keputusan: `qs compile` mengelola `content/versi-konten.lock.json` berisi hash SHA-256 JSON episode yang disajikan (termasuk dalil) dan versinya. Bila hash berubah, versi baru memakai tanggal hari itu (WIB). CI menjalankan `qs compile --check`, yang gagal bila berkas kunci basi. Sampai M3a, URL tetap `/content/epNN.json`.
Konsekuensi: perubahan naskah dikomit bersama berkas kunci; nilai awal diambil dari `versi_konten` di `content/manifest.json` (`2026-10-21.1`). Berkas kunci adalah riwayat versi: entri tidak dihapus walau episode keluar dari manifest, dan berkasnya tidak boleh dihapus karena versi akan dihitung ulang dari nilai awal.

## ADR-015 Versi format JSON episode
Konteks: setelah service worker (M3a) dan APK pertama (M3b), shell lama bisa menerima JSON episode yang ditulis untuk engine lebih baru. ADR-005 membuat konten dimuat dari server tanpa rilis app, jadi ketidakcocokan itu harus bisa dikenali.
Keputusan: JSON episode memuat `format: 1` sebagai key pertama, dari konstanta `FORMAT_EPISODE` di `packages/script/src/types.ts` yang juga dipakai engine. `createStory` menolak format yang tidak dikenalnya dengan `StoryContentError`, dan UI meminta pembaca memperbarui aplikasi. Format naik hanya bila engine lama tidak bisa memutar JSON baru dengan benar (jenis baris baru, makna field berubah); field opsional yang aman diabaikan tidak menaikkannya. Format tidak ditulis di manifest.
Konsekuensi: satu kali kenaikan `versi_konten` untuk ep01–02 saat field ditambahkan. Episode baru dengan format lebih tinggi tetap tampil di daftar app lama, tetapi menolak dibuka dengan pesan yang jelas.

## ADR-016 Strategi tes engine dan UI di minggu 1–2
Konteks: tes jelajah engine (BACKLOG C2) dan tes logika reader (D3) butuh JSON semua episode, sedangkan engine dan apps/web hanya boleh memakai tipe dari packages/script (ARCHITECTURE §3), dan `apps/web/public/content` baru dibuat oleh `pnpm build` sesudah tes. Tes komponen React dan E2E (SRS §9) butuh dependensi DOM atau browser yang belum ada.
Keputusan: tes engine dan tes Node apps/web membaca golden snapshot `packages/script/__snapshots__/*.json`, yang sama persis dengan keluaran `qs compile` dan dijaga golden test. Satu-satunya pengecualian aturan dependensi adalah `node:fs` di folder tes. Di minggu 1–2 tidak ada dependensi tes DOM: logika reader, konten, dan penyimpanan ditulis sebagai modul murni dan diuji vitest, sedangkan UI diperiksa manual di Chrome DevTools pada 360×780 dan di HP Android oleh pemilik. E2E Playwright diajukan di M3a bersama offline, dengan ADR sendiri.
Konsekuensi: tidak ada tes otomatis untuk DOM sampai M3a, jadi PR UI wajib mencantumkan pemeriksaan manualnya.
