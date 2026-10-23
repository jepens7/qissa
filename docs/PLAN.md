# Rencana kerja

Urutan dan cara pengerjaan sejak 22 Oktober 2026: minggu 1–2 (§1–§5: tindak lanjut Epik A–B, lalu Epik C, D, dan E), kemudian fase lokal sebelum deploy (§6: Epik F dan G, lalu Epik H sesudah deploy). Kriteria terima tetap milik `docs/BACKLOG.md`. Status tugas dicatat di `docs/PROGRESS.md`, keputusan sesi di `docs/PROGRESS.md`, dan keputusan arsitektur di `docs/DECISIONS.md`.

## 1. Cara kerja
- Satu tugas = satu branch = satu commit = satu PR ke `main`, merge dengan rebase setelah CI GitHub Actions hijau.
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
| D1 | `tokens.css` dan `base.css` dari CSS prototipe, font Google Fonts sesuai CSP (PRIVACY-SECURITY §3; sejak ADR-019 font di-host sendiri), serta tema mengikuti sistem dan `data-theme`. Ikon, `manifest.webmanifest`, dan meta OG disalin dari prototipe. PR D1 mencocokkan token dengan CSS prototipe; screenshot home dan reader menyusul di PR D3 dan D5, dan baris D1 ditutup setelahnya. |
| D2 | Komponen DESIGN-SYSTEM §4, satu per berkas. Halaman `#debug` menampilkan semuanya dengan data contoh. String UI diambil dari `i18n/id.json` lewat fungsi `t()` kecil, tanpa library. |
| D6 | `lib/content.ts`: manifest network-first dengan batas 3 detik dan cadangan `qissa.v1.manifest`; manifest dengan `versi` selain 1 memakai cadangan. Episode cache-first di Cache Storage dengan `versi_konten` sebagai kunci; bila `caches` tidak ada, langsung dari jaringan. `rilis` di masa depan disembunyikan menurut tanggal Asia/Jakarta, kecuali saat `vite dev`; fungsi saringnya menerima tanggal sebagai parameter dan diuji. `lib/storage.ts` memakai kunci DATA-CONTRACTS §5. Diuji dengan manifest palsu. |
| D7 | `lib/analytics.ts`: `track(nama: EventName, data)` dengan union tujuh nama. Setiap panggilan memeriksa `window.umami?.track`, jadi diam bila Umami tidak dikonfigurasi atau belum termuat. Sejak keputusan 23 Oktober (PROGRESS butir 12), event selama skrip dimuat diantre lalu dikirim begitu termuat. |
| D8 | Routing hash `#home`, `#epNN`, dan `#debug` dengan `history.replaceState`. `#epNN` hanya berlaku untuk episode yang lolos saringan D6; selain itu kembali ke `#home`. Selesai bila `#ep02` memuat ep02 dan menampilkan sampulnya; episode lengkap lewat `#ep02` diperiksa ulang di PR D3. |
| D3 | `features/reader` memegang `Story` di `useRef` dan daftar item di state. Isinya: ketukan dan Space/Enter/panah kanan, typing dengan status header "mengetik…", pilihan, dan restore. Langkah `render` untuk `view` langsung diikuti `next()`, sehingga pil dan baris berikutnya muncul dalam satu ketukan, sama seperti prototipe. Juga: sampul dengan memo (templat generik), tombol "Daftar episode" di Header, ErrorBoundary dengan pesan "perbarui aplikasi" untuk format tak dikenal, dan pesan gagal muat dengan "Coba lagi". Logikanya ada di modul murni yang diuji untuk semua jalur ep01 dan ep02. |
| D4 | `features/ending`: tamat dengan catatan poll, kartu dalil dari struktur `Dalil`, refleksi, bagikan, masukan, saluran, lanjut, ulang dari Pilihan 2, ulang dari awal, dan daftar. "Lanjut" hanya untuk episode berikutnya yang sudah rilis; bila belum, tampil templat "menyusul". Aturan ESLint `no-restricted-syntax` melarang `dangerouslySetInnerHTML`. |
| D5 | `features/home`: poll dari i18n, daftar episode dari manifest dengan status "selesai, N dari 3", kartu saluran, dan footer (teks prototipe lewat i18n). Satu tes memastikan nama pendek poll sama dengan opsi p1 ep01 di golden snapshot. |

### Epik E: qissah.id live
| ID | Cara |
| --- | --- |
| E1 | `infra/nginx/Dockerfile` multi-tahap. Tahap build Node 22 dan pnpm menjalankan `pnpm install --frozen-lockfile` dan `pnpm build`, dengan `VITE_*` sebagai build arg; tahap nginx menyalin `apps/web/dist`. `nginx.conf` memuat header keamanan dan CSP (PRIVACY-SECURITY §3), `/healthz`, serta aturan cache: `index.html`, manifest, dan episode `no-cache` (nama berkas episode tanpa versi, ADR-017); aset ber-hash `immutable`. Verifikasi dengan `docker build`, `docker run`, dan `curl -I`, termasuk `/privasi`. `infra/easypanel.md` dan ARCHITECTURE §12 menyebut `VITE_*` sebagai build arg Easypanel, bukan `.env` yang di-commit. |
| E2 | `apps/web/public/privasi/index.html` dan `tentang/index.html` sebagai HTML statis. Teks privasi diambil dari PRIVACY-SECURITY §6; teks "Tentang" didraf dari PRD §1 dan disetujui pemilik. Keduanya ditautkan dari footer. Tanpa konversi markdown; wording BACKLOG E2 diselaraskan di PR-nya. |
| E3 | Skrip Umami dimuat dari konfigurasi. Sesi uji tujuh event dijalankan di situs live pada atau setelah tanggal `rilis`. |

### Pemicu di luar minggu 1–2
Sejak 23 Oktober keempatnya terjadwal di §6: P1 menjadi I2, `ikhtilaf` menjadi F2, gerbang `--wajib-review` menjadi I1, dan Playwright menjadi G3.
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
1. Minggu 1: arahkan record A `qissah.id` ke IP VPS Easypanel (per 23 Oktober masih ke halaman parkir Hostinger) dan buat `umami.qissah.id`. Domain sudah terdaftar 22 Oktober; email kontak `halo@qissah.id` sudah aktif.
2. Sebelum E1 di-merge: buat service Easypanel dari `infra/nginx/Dockerfile` dengan build arg `VITE_SITE_URL` dan `VITE_CONTENT_BASE`. Ini harus lebih dulu, karena Easypanel membangun `main` di setiap push dan `vite build` gagal bila keduanya kosong.
3. Sebelum E3: instance Umami beserta Website ID, dan URL Saluran WhatsApp, sebagai build arg.
4. Uji di HP Android sungguhan pada 360 px. Caranya: port forwarding USB dari Chrome (`chrome://inspect`) ke dev server, karena `localhost` termasuk secure context; atau satu sesi setelah E1 live di HTTPS. Baris D ditutup setelah uji HP.
5. E3: jalankan sesi uji dan kirim screenshot dasbor Umami pada atau setelah 4 November (`rilis` ep01–02). Cara lain: majukan `rilis` di `content/manifest.json`.
6. Hubungi pereview pertama (ROADMAP minggu 2), dan setujui draf halaman "Tentang" (E2).

## 5. Risiko
- M1b bergantung pada DNS dan Easypanel di luar repo. Bila langkah §4 butir 1–2 terlambat, E1 dan E3 ikut mundur, walau kodenya siap.
- Epik D paling besar dan paling bergantung pada pemeriksaan visual; prioritas di §3 menjaga yang Must selesai lebih dulu.

## 6. Fase lokal sebelum deploy (keputusan 23 Oktober)

Pemilik memutuskan semua bagian web diselesaikan dan diuji di lokal lebih dulu, baru kemudian deploy. Android dikerjakan sesudah deploy, paralel dengan Tahap 0 (keputusan sesi 23 Oktober di `docs/PROGRESS.md`). Kriteria terima singkat ada di `docs/BACKLOG.md` Epik F–H; cara pengerjaannya di bawah. Cara kerja §1 tetap berlaku.

### Selesai sebelum deploy
- Semua FR wajib web terpenuhi, termasuk PWA-2, PWA-3, dan PWA-4 (SRS §3), dan diuji (SRS §9, §11).
- NFR yang bisa diukur lokal lolos: kontras dan aksesibilitas (NFR-3, NFR-8), offline (NFR-2), anggaran kinerja (NFR-1, ARCHITECTURE §14).
- Prinsip 2 juga berlaku di build produksi: `#debug` hanya ada di dev.
- Bagian dalil `ikhtilaf` sudah masuk `format: 1` sebelum ada shell yang tersimpan di HP pembaca.

Tidak termasuk: DNS, Easypanel, Umami live, staging, sesi E3, Android, Play Store, PSE, review ulama (ADR-012 mengizinkan Tahap 0 dengan badge "Belum direview ulama"), konten Ramadan, dan fitur "Setelah Ramadan" di ROADMAP.

### Epik F: merapikan web
| ID | Cara |
| --- | --- |
| F0 | Rencana ini dan keputusan 23 Oktober dicatat di PLAN, BACKLOG, PROGRESS, ROADMAP, PRD, SRS, dan CLAUDE.md; rujukan PocketBase dan FCM ditandai "setelah Ramadan". Rujukan usang lain dibereskan di PR yang menyentuh bagiannya (F1: ARCHITECTURE §6; G1: SRS §5.3 dan §6, DATA-CONTRACTS §2 dan §5, ARCHITECTURE §7 dan §15). |
| F1 | `--muted` terang menjadi `#5F686F` (4,60–5,68:1 terhadap keempat latar) di DESIGN-SYSTEM §1, `tokens.css`, dan `public/halaman.css`; border textarea memakai `--muted` (≥ 3:1). Rasio dihitung sekali dan dicatat di DESIGN-SYSTEM §1. Di pemutar, hanya kartu tamat yang tetap di region `aria-live`; kartu dalil, refleksi, bagikan, saluran, dan lanjut dirender di luar region. Rute `#debug` hanya ada saat `import.meta.env.DEV`, sehingga modulnya tidak ikut bundel produksi. `sampul.memo` menjadi "Di episode sebelumnya kamu memilih {pertama}, lalu {kedua}." (disetujui pemilik). |
| F2 | Judul `## Ulama berbeda` di `dalil.md` menjadi jenis bagian `ikhtilaf` (`compileDalil`, tipe, skema) dan dirender PaperCard dengan label dan kalimat penutup dari i18n. Masuk `format: 1` karena belum ada shell yang beredar (ADR-015); golden snapshot ep01–02 tidak berubah. QISSA-SCRIPT §5, DATA-CONTRACTS §4, dan SRS DLL-1 menyebutnya. |

### Epik G: PWA dan offline (M3a)
| ID | Cara |
| --- | --- |
| G1 | ADR baru: `vite-plugin-pwa` (versi dipin, mode generateSW, `registerType: 'prompt'`). Precache app shell: HTML termasuk `/privasi/` dan `/tentang/`, JS, CSS, dan ikon. `navigateFallback` dimatikan karena routing memakai hash. Konten tetap di-cache `lib/content.ts` tanpa rute service worker; nama berkas episode tidak berversi dan tanpa retensi 30 hari (dicatat di ADR yang sama). Font Google: CSS stale-while-revalidate, berkas font cache-first; `connect-src` ditambah `https://fonts.googleapis.com` dan `https://fonts.gstatic.com`, sedangkan `https://api.qissah.id` dihapus karena PocketBase ditunda (PRIVACY-SECURITY §3 dan `nginx.conf`). Bagian font digantikan ADR-019: font di-host sendiri dan di-precache, tanpa origin Google. Registrasi lewat `virtual:pwa-register/react` di `components/update-bar.tsx`, yang dirender di root React sendiri dari `main.tsx`, tanpa skrip inline. Satu baris "Versi baru tersedia" dengan tombol muat ulang, tidak memaksa. Kunci `qissa.v1.shell` yang tidak terpakai dihapus dari DATA-CONTRACTS §5. |
| G2 | Bila `versi_konten` baru belum tersimpan dan jaringan gagal, `muatEpisode` memakai versi lama episode yang sama dari Cache Storage; versi lama baru dihapus setelah versi baru tersimpan. Diuji dengan cache dan fetch palsu. |
| G3 | ADR baru: `@playwright/test` dengan Chromium. Satu spec di 360×780 untuk enam skenario SRS §9 (landing, poll, satu episode tamat, refleksi tersimpan, bagikan dengan cadangan salin, muat ulang offline) terhadap `vite preview`; `navigator.share` distub dan jam browser diset melewati `rilis` dengan clock Playwright. Langkah `playwright install --with-deps chromium` (kemudian tanpa `--with-deps`, ADR-018) dan `pnpm e2e` ditambahkan ke job CI yang ada, sesudah `pnpm build`; ARCHITECTURE §12 diperbarui. Folder hasil Playwright diabaikan Git, ESLint, Prettier, dan pemindai repo. Spec juga dijalankan sekali terhadap image Docker `:8788` lewat `baseURL`. |

### QA lokal
Bukan PR; hasilnya dicatat di PROGRESS. Perbaikan hanya untuk yang gagal, masing-masing PR `fix:`.
- Lighthouse mobile pada image Docker `:8788`: Performance ≥ 85 dan Accessibility ≥ 95 (SRS §11). Installable diperiksa di DevTools Application → Manifest, karena Lighthouse tidak lagi punya kategori PWA.
- Anggaran ARCHITECTURE §14: app shell ≤ 150 KB gzip tanpa font, episode ≤ 60 KB.
- First interaction (NFR-1): waktu dari navigasi sampai tombol poll bisa ditekan, di panel Performance dengan throttling "Slow 4G" (nama baru preset Fast 3G) dan CPU 4×.
- Keyboard, TalkBack, `prefers-reduced-motion`, dan mode pesawat (episode yang pernah dibuka bisa ditamatkan).
- Dua HP nyata lewat port forwarding `chrome://inspect`, dengan Chrome dan Samsung Internet, serta Firefox desktop (NFR-6).

### Cara uji lokal
- `pnpm dev` untuk kerja harian; semua episode tampil.
- Image Docker di `localhost:8788` (`infra/easypanel.md`) untuk build produksi: header, CSP, service worker, dan offline.
- HP lewat `chrome://inspect` → port forwarding ke 5173 atau 8788. `localhost` adalah secure context, jadi Web Share berjalan. Service worker hanya ada di 8788 (di `vite dev` tidak aktif, ADR-017), jadi mode pesawat dan baris "Versi baru tersedia" diuji di 8788. Mode pesawat tidak memutus port forwarding; untuk offline sungguhan, hentikan container.
- Event analitik diperiksa dengan stub `window.umami` di Console; Umami lokal tidak perlu.
- Sampai 4 November build produksi menyembunyikan ep01–02 (`rilis`). Uji dengan `pnpm dev` atau geser jam browser; jangan mengubah `rilis` di manifest.
- Saat menguji service worker, centang "Update on reload" atau hapus data situs di antara percobaan. Untuk menguji baris "Versi baru tersedia", "Update on reload" dimatikan, karena opsi itu melewati fase waiting sehingga baris tidak muncul.

### Sesudah deploy web
- Daftar periksa (RELEASE dan `infra/easypanel.md`): DNS, TLS, dan `/healthz`; `curl -I` untuk CSP (sama persis dengan PRIVACY-SECURITY §3, tanpa origin Google sejak ADR-019) dan cache; pembaruan service worker lewat HTTPS; sesi E3; log nginx tanpa alamat IP (keputusan 24 Oktober menggantikan retensi 7 hari, sehingga tidak perlu cron di VPS); pemantau uptime dan cadangan Umami; Lighthouse di situs live; tampilan Safari iOS; tag `web-v*`.
- Epik H (Android, M3b) dimulai paralel dengan Tahap 0, dengan ADR Capacitor yang disetujui pemilik saat itu. Bagian web dan infra H2 (CORS `/content/`, URL episode di-resolve terhadap URL manifest, skrip `cap:sync` yang menolak `VITE_CONTENT_BASE` selain https) dikerjakan lebih dulu karena tidak butuh Android Studio.
- Saklar pratinjau untuk staging (episode dengan `rilis` di masa depan) dibuat bersama service staging.

### Pemicu
- I1 gerbang review: setelah review ulama ep01–02 tercatat lewat PR `content:`, langkah `pnpm qs lint` di CI menjadi `pnpm qs lint --wajib-review`, dan Dockerfile menjalankan perintah yang sama sebelum `pnpm build`. Sesudahnya naskah draft (misalnya ep03) menunggu di branch sampai direview.
- I2 pensiun prototipe: segera setelah pemilik memastikan paritas di HP, sebelum naskah direvisi dari baca Gen Z atau review, supaya revisi tidak ditulis di dua tempat. ADR baru; `infra/prototype` dan tes paritasnya dihapus.

### Perkiraan waktu
| Minggu | Rencana |
| --- | --- |
| 1, sisa (23–28 Okt) | E2 (selesai), F0, F1, F2 |
| 2 (29 Okt–4 Nov) | G1, G2, G3 |
| 3 (5–11 Nov) | QA lokal dan perbaikannya; deploy web (sasaran 12 November, batas 1 Desember) |
| 4–5 (12–25 Nov) | Tahap 0; Epik H paralel |

### Butuh pemilik
1. Sekarang: uji paritas di HP pada 360 px lewat port forwarding. Hasilnya menutup Epik D dan memicu I2.
2. Sekarang: hubungi pereview dan kirim naskah serta `dalil.md` ep01–02. Titik yang perlu diverifikasi ada di ep01 `dalil.md` baris 20 dan 24, serta ep02 `dalil.md` baris 9, 25, 29, dan 39. Pasal UU di baris 39 sebaiknya juga dicek orang yang paham hukum.
3. Minggu 2–3: naskah Episode 3 (ROADMAP).
4. Sebelum deploy: Saluran WhatsApp (URL-nya dibutuhkan saat build), lalu langkah §4 butir 1–3.
5. Sebelum Epik H: Android Studio terpasang, USB debugging menyala, dan akun Play Console dibuat lebih awal karena verifikasinya lama.

### Risiko
- Tahap 0 mundur sekitar satu minggu. Keputusan lanjut atau perbaiki cerita jatuh sekitar 26 November, masih sebelum keputusan format "30 Malam" (1 Desember).
- Jalur Play Store: closed testing butuh 12 penguji selama 14 hari dan URL `/privasi` yang publik, jadi deploy web paling lambat 1 Desember.
- Service worker: `navigateFallback` yang menelan `/privasi`, `connect-src` untuk font (tidak relevan lagi sejak ADR-019), dan cache basi saat uji. Ketiganya menjadi kriteria terima G1.
