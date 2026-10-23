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
Konsekuensi: rilis konten = commit ke content/ dan deploy; app store hanya untuk perubahan shell. Bagian "di-cache oleh service worker" digantikan ADR-017: konten di-cache `lib/content.ts`.

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
Konsekuensi: perubahan naskah dikomit bersama berkas kunci; nilai awal diambil dari `versi_konten` di `content/manifest.json` (`2026-10-21.1`). Berkas kunci adalah riwayat versi: entri tidak dihapus walau episode keluar dari manifest, dan berkasnya tidak boleh dihapus karena versi akan dihitung ulang dari nilai awal. Rencana nama berkas berversi di M3a dibatalkan oleh ADR-017; URL tetap `/content/epNN.json`.

## ADR-015 Versi format JSON episode
Konteks: setelah service worker (M3a) dan APK pertama (M3b), shell lama bisa menerima JSON episode yang ditulis untuk engine lebih baru. ADR-005 membuat konten dimuat dari server tanpa rilis app, jadi ketidakcocokan itu harus bisa dikenali.
Keputusan: JSON episode memuat `format: 1` sebagai key pertama, dari konstanta `FORMAT_EPISODE` di `packages/script/src/types.ts` yang juga dipakai engine. `createStory` menolak format yang tidak dikenalnya dengan `StoryContentError`, dan UI meminta pembaca memperbarui aplikasi. Format naik hanya bila engine lama tidak bisa memutar JSON baru dengan benar (jenis baris baru, makna field berubah); field opsional yang aman diabaikan tidak menaikkannya. Format tidak ditulis di manifest.
Konsekuensi: satu kali kenaikan `versi_konten` untuk ep01–02 saat field ditambahkan. Episode baru dengan format lebih tinggi tetap tampil di daftar app lama, tetapi menolak dibuka dengan pesan yang jelas.

## ADR-016 Strategi tes engine dan UI di minggu 1–2
Konteks: tes jelajah engine (BACKLOG C2) dan tes logika reader (D3) butuh JSON semua episode, sedangkan engine dan apps/web hanya boleh memakai tipe dari packages/script (ARCHITECTURE §3), dan `apps/web/public/content` baru dibuat oleh `pnpm build` sesudah tes. Tes komponen React dan E2E (SRS §9) butuh dependensi DOM atau browser yang belum ada.
Keputusan: tes engine dan tes Node apps/web membaca golden snapshot `packages/script/__snapshots__/*.json`, yang sama persis dengan keluaran `qs compile` dan dijaga golden test. Satu-satunya pengecualian aturan dependensi adalah `node:fs` di folder tes. Di minggu 1–2 tidak ada dependensi tes DOM: logika reader, konten, dan penyimpanan ditulis sebagai modul murni dan diuji vitest, sedangkan UI diperiksa manual di Chrome DevTools pada 360×780 dan di HP Android oleh pemilik. E2E Playwright diajukan di M3a bersama offline, dengan ADR sendiri.
Konsekuensi: tidak ada tes otomatis untuk DOM sampai M3a, jadi PR UI wajib mencantumkan pemeriksaan manualnya.

## ADR-017 Service worker hanya untuk app shell; konten tetap di lib/content.ts
Konteks: PWA-2 sampai PWA-4 (M3a, dimajukan sebelum deploy) menuntut app bisa dibuka ulang saat offline dan memberi tahu bila versi baru tersedia. ADR-005 dan ARCHITECTURE §7 semula merencanakan service worker yang juga meng-cache konten, dengan nama berkas episode berversi dan retensi 30 hari (ADR-014). Sejak D6, `lib/content.ts` sudah menyimpan manifest (network-first, cadangan localStorage) dan episode (cache-first di Cache Storage dengan `versi_konten` sebagai bagian kunci), dan cara itu juga berjalan di APK tanpa service worker. Image Docker hanya berisi build terbaru, jadi retensi berkas lama butuh arsip terpisah. Pemilik menyetujui `vite-plugin-pwa` pada 23 Oktober.
Keputusan:
- `vite-plugin-pwa` 2.0.0 (dipin), mode generateSW, `registerType: 'prompt'`, dan `injectRegister: false`. Registrasi lewat `virtual:pwa-register/react` di `components/update-bar.tsx`, jadi tanpa skrip inline (CSP `script-src 'self'`). `workbox-window` 7.4.1 dipasang di apps/web karena modul registrasi itu mengimpornya; ia peer dependency plugin yang tidak diangkat pnpm.
- Precache: HTML (termasuk `/privasi/` dan `/tentang/`), JS, CSS, ikon, dan `manifest.webmanifest`. `og.png` dan `content/` tidak. `navigateFallback` dimatikan karena routing memakai hash; dengan fallback, `/privasi` tanpa garis miring akan jatuh ke app. Query string diabaikan saat mencocokkan precache (`ignoreURLParametersMatching`), karena app tidak memakainya; tautan berparameter pelacak dari aplikasi lain tetap terbuka offline.
- Font Google: CSS stale-while-revalidate, berkas font cache-first. `connect-src` ditambah `https://fonts.googleapis.com` dan `https://fonts.gstatic.com`, karena fetch dari service worker tunduk pada `connect-src`. `https://api.qissah.id` dihapus karena PocketBase ditunda. (Digantikan ADR-019: font di-host sendiri dan di-precache; origin Google dihapus dari CSP.)
- Konten tidak dirute service worker. Nama berkas episode tetap `/content/epNN.json` dengan `Cache-Control: no-cache`, tanpa retensi 30 hari. Kunci `qissa.v1.shell` dihapus dari kontrak karena tidak dipakai.
- Baris "Versi baru tersedia" tidak memaksa; pembaca memilih kapan memuat ulang. Komponennya dirender di root React sendiri (`#pembaruan` di `main.tsx`), supaya jalan pembaruan tetap ada walau App gagal render.
- `workbox-window` berada di `dependencies` karena ikut ke browser, sehingga diperiksa `pnpm audit --prod` di CI. Runtime Workbox di `sw.js` berasal dari `workbox-build` (dev) dan tidak tercakup `--prod`; dipantau lewat pembaruan dependensi bulanan (PRIVACY-SECURITY §3).
Konsekuensi: ADR-005 (bagian "di-cache oleh service worker") dan rencana nama berkas berversi di ADR-014 digantikan. Versi baru sebuah episode diunduh dengan validasi (`no-cache`), bukan `immutable`; selisihnya kecil, karena satu episode sekitar 5 KB gzip dan diunduh sekali per versi. Plugin menambah sekitar 300 paket dev (Workbox build) yang tidak masuk bundel; bundel app bertambah `workbox-window` sekitar 2 KB gzip yang dimuat terpisah. Di `vite dev` service worker tidak aktif. Muat ulang biasa tidak mengganti app shell selama service worker lama mengendalikan tab: shell baru atau hasil rollback dipakai setelah pembaca mengetuk "Muat ulang" atau menutup semua tab Qissa (RUNBOOK §1). Header nginx ikut tersimpan bersama HTML yang di-precache, jadi perubahan header saja tidak sampai ke pembaca lama (RUNBOOK §8). Pesan `galat.format` kini meminta pembaca menutup lalu membuka lagi Qissa.

## ADR-018 E2E dengan Playwright
Konteks: SRS §9 menuntut E2E di 360×780: landing, poll, satu episode tamat, refleksi tersimpan, bagikan dengan cadangan salin, dan muat ulang offline. ADR-016 menundanya ke M3a. Tes vitest tanpa DOM tidak bisa menguji service worker dan alur di browser. Pemilik menyetujui `@playwright/test` pada 23 Oktober.
Keputusan: `@playwright/test` 1.64.1 (dipin, dev) dengan Chromium saja. Satu spec `apps/web/e2e/pembaca.e2e.ts` (bukan `*.test.ts`, jadi tidak ikut vitest) berjalan terhadap `vite preview` dari build produksi. Jam diset dengan `page.clock.setFixedTime` ke `rilis` terakhir di manifest yang disajikan, bukan tanggal tertulis, sehingga PR yang memajukan `rilis` saat insiden (RUNBOOK §7) tidak memerahkan E2E. Asersi tidak mengunci status review dalil, yang akan berubah setelah review ulama. `navigator.share` dan clipboard dipalsukan supaya cadangan salin teruji sama di Windows dan Linux. `reducedMotion: 'reduce'` memperpendek typing tanpa mengubah alur. Di CI, `playwright install --with-deps chromium` dan `pnpm e2e` berjalan di job yang sama sesudah langkah yang lebih murah (sejak 23 Oktober tanpa `--with-deps`, karena unduhan apt-nya beberapa kali tertahan 11–12 menit; PROGRESS keputusan 23 Oktober butir 11). `QISSA_E2E_URL` mengarahkan spec ke server lain, misalnya image Docker `:8788`.
Konsekuensi: CI bertambah sekitar satu sampai dua menit untuk mengunduh Chromium; trace kegagalan diunggah sebagai artefak `e2e-test-results` (7 hari) hanya bila E2E gagal. Hasil uji (`test-results/`, `playwright-report/`) diabaikan Git, ESLint, Prettier, Docker, dan pemindai repo. Firefox dan WebKit tidak diuji otomatis; NFR-6 diperiksa manual di QA lokal.

## ADR-019 Font di-host sendiri
Konteks: QA lokal (PLAN §6) mengukur Lighthouse mobile pada image Docker produksi: Performance 75, di bawah target 85 (SRS §11). Penyebab terbesarnya stylesheet Google Fonts yang memblokir render (sekitar 0,8 detik pada simulasi Slow 4G), ditambah koneksi ke dua origin Google. Font juga baru tersedia offline setelah diambil sekali lewat service worker, dan setiap kunjungan menghubungi server Google.
Keputusan: subset yang dipakai diunduh sekali dari Google Fonts lalu disajikan dari `apps/web/public/fonts/`: Plus Jakarta Sans latin (variabel, 27 KB), Newsreader latin (variabel dengan sumbu ukuran optik, 132 KB), dan Amiri arab (109 KB). Lisensi SIL OFL 1.1 tiap keluarga ikut di folder yang sama. Newsreader miring tidak diambil karena tidak dipakai. `@font-face` ada di `src/styles/fonts.css` untuk app dan di `public/halaman.css` untuk halaman statis, dengan `font-display: swap`. Plus Jakarta Sans di-preload dari `index.html`. Service worker mem-precache ketiga berkas, menggantikan runtime caching font di ADR-017. CSP tanpa origin Google: `style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://umami.qissah.id`.
Konsekuensi: Lighthouse mobile menjadi Performance 99 (FCP 1,5 detik, LCP 1,9 detik, CLS 0) di dua kali pengukuran. Tidak ada lagi permintaan ke pihak ketiga selain Umami. Precache bertambah sekitar 270 KB, diunduh sekali saat service worker dipasang. Memperbarui font berarti mengunduh ulang berkasnya secara manual.
