# Desain sistem — Qissa v1.0

Dokumen ini menjelaskan bagaimana sistem dibagi, bagaimana data mengalir, dan antarmuka antar-bagian, supaya setiap bagian bisa dibangun dan diuji terpisah. Melengkapi `docs/SRS.md` (apa yang harus ada) dengan "bagaimana".

## 1. Prinsip desain
1. Konten adalah data statis; aplikasi adalah pemutar. Tidak ada teks cerita di kode.
2. Engine murni dan deterministik: tanpa DOM, tanpa timer, tanpa I/O. Semua waktu dan penyimpanan ada di lapisan UI.
3. Tanpa backend untuk membaca. Server hanya menyajikan berkas statis dan (opsional) menerima masukan.
4. Satu berkas konfigurasi lingkungan; tidak ada rahasia di klien.
5. Hal yang bisa salah karena konten (knot hilang, variabel tak dikenal) ditangkap saat kompilasi, bukan saat pembaca membuka episode.

## 2. Diagram konteks

```
                  ┌────────────────────────────────────────────────────┐
                  │ VPS (Easypanel)                                    │
  Pembaca ──HTTPS─┤ nginx: qissah.id ─ app shell + /content/*.json     │
  (PWA/Android)   │ Umami: umami.qissah.id ─ event agregat             │
                  │ PocketBase (setelah Ramadan): api.qissah.id        │
                  └────────────────────────────────────────────────────┘
                         ▲ image Docker dari GitHub (CI: lint, test, build)
  Founder ── git push ───┘
  Pereview ── PR ke content/ (dalil.md: status reviewed)
```

## 3. Struktur monorepo dan aturan dependensi

```
packages/script   → tidak bergantung pada paket lain (hanya Node untuk CLI)
packages/engine   → bergantung pada tipe dari packages/script (types saja)
apps/web          → bergantung pada engine + script/types; tidak boleh mengimpor compiler
apps/android      → membungkus hasil build apps/web
backend/pocketbase→ mandiri (migrasi dan hooks; setelah Ramadan)
```

Aturan: `engine` dan `script` tidak boleh mengimpor `react` atau memakai `window` dan `document`. ESLint (`no-restricted-imports` dan `no-restricted-globals`) serta tsconfig tanpa lib DOM menegakkannya. `apps/web` hanya boleh mengimpor `@qissa/script/types`. Pengecualian satu-satunya: tes engine dan tes Node apps/web membaca golden snapshot `packages/script/__snapshots__/*.json` dengan `node:fs` (ADR-016).

## 4. packages/script

Pipeline: `episode.qs.md` → `parseFrontMatter` → `tokenize` (per baris) → `parse` (knots, shots, blok kondisional, blok pilihan) → `validate` (aturan S1, L1–L7, W1–W4) → `emit` (JSON `Episode`, termasuk `dalil` dari `compileDalil`).

Antarmuka:
```ts
compileEpisode(source: string, opts: { file: string; dalil: string; dalilFile: string }): { episode: Episode | null; diagnostics: Diagnostic[] }  // null bila ada error
lintEpisode(source: string, dalil: string, opts: { file: string; dalilFile: string; wajibReview?: boolean }): Diagnostic[]
compileDalil(source: string, opts: { file: string }): { dalil: Dalil | null; diagnostics: Diagnostic[] }
walkEpisode(episode: Episode): Jalur[]        // semua kombinasi pilihan; dipakai linter, tes paritas, qs walk
type Diagnostic = { level: 'error' | 'warn'; code: string; file: string; line: number; message: string }
```

Pemeriksaan lintas berkas (`berikutnya`, `id` dan nama folder, kesesuaian dengan `content/manifest.json`) dijalankan `qs lint` dan `qs compile` atas seluruh `content/`.

CLI (`packages/script/src/cli.ts`) dijalankan langsung oleh Node lewat type stripping: `pnpm qs …` sama dengan `node packages/script/src/cli.ts …`. Path bawaan dihitung dari akar repo.
- `qs compile [--in content] [--out apps/web/public/content] [--check]`: kompilasi semua episode. Bila ada error, tidak ada berkas yang ditulis dan keluar dengan kode 1. Folder keluaran tidak boleh berada di dalam folder konten. Menulis `epNN.json` (format §4 QISSA-SCRIPT, sama persis dengan golden snapshot) dan `manifest.json`: gabungan `content/manifest.json`, `rating` dari front matter, dan `versi_konten` dari `content/versi-konten.lock.json` (DATA-CONTRACTS §9). `--check` tidak menulis apa pun dan gagal bila berkas kunci basi.
- `qs lint [--wajib-review]`: hanya diagnostik; keluar dengan kode 1 bila ada error.
- `qs walk epNN`: cetak semua jalur (nama pendek dipisah ` > `), panjangnya dalam baris terlihat, dan akhirnya (END, berputar, buntu, atau lebih dari 300 baris); keluar dengan kode 1 bila ada jalur yang tidak sampai END. Error lain di episode itu dicetak sebagai konteks dan tidak mengubah kode keluar.

Golden test: `content/**/episode.qs.md` dikompilasi dan dibandingkan dengan `packages/script/__snapshots__/epNN.json` (lewat `toMatchFileSnapshot`). Perubahan naskah memperbarui snapshot lewat `pnpm test -u` dengan review di PR. Selama prototipe masih ada, tes paritas membandingkan setiap jalur ep01 dan ep02 dengan objek `EPISODES` di `infra/prototype/index.html`: urutan yang terlihat pembaca, objek baris per jalur, dan meta.

## 5. packages/engine

State machine tanpa efek samping.

```ts
createStory(episode: Episode): Story

interface Story {
  readonly state: Readonly<StoryState>;
  next(): Step;                 // majukan satu langkah yang terlihat
  choose(index: number): Step;  // hanya sah saat state.waiting
  snapshot(key: string): void;  // dipanggil UI saat menerima Step 'choice'
  restore(key: string): boolean;
}

type StoryState = {
  knot: string; idx: number; vars: Record<string, boolean>;
  path: string[]; header: Header | null; waiting: boolean; ended: boolean;
  rendered: number;             // jumlah langkah terlihat yang sudah dikeluarkan
};

type Step =
  | { kind: 'render'; line: VisibleLine; header: Header | null }
  | { kind: 'typing'; ms: number }     // UI menunggu lalu memanggil next()
  | { kind: 'choice'; line: ChoiceLine }
  | { kind: 'end'; path: string[] }
  | { kind: 'wait' };                  // dipanggil saat waiting/ended; tidak ada perubahan
```

Perilaku:
- `next()` memproses baris tak terlihat (`view`, `set`, `go`, `branch`, baris dengan `cond` yang salah) secara berulang sampai menemukan baris terlihat, `typing`, `choice`, atau `end`. `view` memperbarui `header` dan mengeluarkan `render` untuk pil label.
- `typing` dikeluarkan sebagai langkah tersendiri dengan durasi (950 ms; 350 bila `reducedMotion` di-set lewat opsi). Engine tidak menunggu; UI yang menunggu lalu memanggil `next()` lagi.
- Snapshot menyimpan `StoryState` penuh termasuk `rendered`. UI menyimpan daftar item yang dirender; saat `restore`, UI memotong daftarnya ke `rendered` dari snapshot. Dengan begitu tidak ada HTML yang disimpan.
- Semua kesalahan konten (knot tidak ada) melempar `StoryContentError` dengan nama knot; UI menampilkannya di error boundary. Dalam praktik ini tidak terjadi karena compiler menolaknya.

Tes: setiap jenis baris; `cond` dan `cases`; branch default; snapshot/restore; tes jelajah untuk semua episode di `content/` (semua kombinasi pilihan mencapai `end`), dengan JSON dari golden snapshot packages/script (ADR-016).

## 6. apps/web

Struktur:
```
src/
  main.tsx, app.tsx            # bootstrap, routing berbasis hash (#home, #epNN; #debug hanya di vite dev)
  features/home/               # poll, daftar episode, saluran
  features/reader/             # Reader (memuat episode) dan Pemutar: memegang Story, daftar item, ketukan, kartu tamat
  features/ending/             # Dalil, Refleksi, Bagikan, Saluran, Lanjut (di luar region aria-live)
  features/debug/              # #debug: semua komponen dengan data contoh, hanya di vite dev
  components/                  # Header, Bubble, NarrationCard, Pill, ShotCard, NotifCard, BankCard, TypingDots, ChoiceBlock, Cover, EpisodeCard, PaperCard
  lib/content.ts               # muat manifest + episode (fetch, cache, versi)
  lib/storage.ts               # kunci localStorage, try/catch, versi skema
  lib/analytics.ts             # track(); antre selama Umami dimuat, no-op bila tidak ada
  lib/share.ts                 # Web Share, fallback clipboard, Capacitor Share bila native
  i18n/id.json
  styles/tokens.css, base.css
```

State:
- `Pemutar` memegang `Story` dan `items` di `useState`. Setiap `next()` menambah item; `restore` memotong.
- Tidak ada state manager global. Konteks React hanya untuk tema dan konfigurasi.
- Progres per episode (akhir yang sudah dibaca, jalur terakhir, refleksi) ditulis ke `storage.ts` pada peristiwa, bukan pada setiap render.

Rendering teks: semua teks naskah dirender sebagai teks (React escaping). Kartu dalil dirender dari struktur `Dalil` (bagian, entri, baris Arab) menjadi komponen, bukan `dangerouslySetInnerHTML`.

Routing: `#home`, `#epNN`, dan `#debug` yang hanya ada saat `vite dev` (halaman itu menampilkan kartu dalil semua episode, jadi tidak boleh ikut build produksi; prinsip 2). Hash dibaca saat muat; `history.replaceState` saat berpindah (tidak menambah riwayat untuk setiap ketukan).

Tema: `tokens.css` mendefinisikan token terang di `:root` dan gelap di `@media (prefers-color-scheme: dark)` serta `[data-theme="dark"]`. Komponen hanya memakai token.

## 7. Konten: pengiriman, versi, cache

- Build menyalin hasil `qs compile` ke `apps/web/public/content/`: `manifest.json` dan `epNN.json`. Nama berkas tidak memuat versi; app memakai `versi_konten` dari manifest sebagai bagian kunci cache (ADR-017).
- `manifest.json` dan episode disajikan `Cache-Control: no-cache`. `lib/content.ts` memuat manifest network-first dengan timeout 3 detik, lalu memakai salinan terakhir di localStorage. Timeout hanya berlaku bila salinan ada, dan mencakup header serta body; tanpa salinan (kunjungan pertama), jawaban jaringan ditunggu. Manifest dimuat sekali per muat halaman. Saringan rilis memakai tanggal Jakarta yang dihitung saat manifest tiba, saat halaman kembali terlihat, dan saat hash berubah, sehingga sesi yang masih hidup melewati 00.00 WIB menampilkan episode yang sudah ada di manifest; episode yang baru ditambahkan lewat deploy baru tampil setelah Qissa dibuka ulang.
- Episode: cache-first di Cache Storage oleh `lib/content.ts`, dengan kunci `url?v=versi_konten`. Bila manifest menunjuk versi baru, versi itu diunduh utuh dan disimpan saat episode dibuka, baru kemudian versi lama episode yang sama dihapus. Bila unduhan gagal (offline, putus di tengah, galat server, atau JSON rusak), versi lama yang masih tersimpan dan formatnya dikenal shell tetap dipakai. Bila versi lama itu ada, unduhan versi baru diberi timeout 3 detik seperti manifest, termasuk untuk body, supaya jaringan yang tersambung tapi macet tidak membuat pembaca menunggu layar kosong.
- Penyaringan rilis: app menyembunyikan episode dengan `rilis` di masa depan (zona waktu Asia/Jakarta). JSON-nya tetap bisa diakses langsung; diterima untuk MVP (tidak ada spoiler yang bernilai).
- Service worker (Workbox lewat `vite-plugin-pwa`, ADR-017) hanya untuk app shell: precache HTML (termasuk `/privasi/` dan `/tentang/`), JS, CSS, ikon, dan manifest web, tanpa `navigateFallback`, dan query string diabaikan saat mencocokkan precache. Font di-host sendiri di `/fonts/` dan ikut di-precache (ADR-019). Konten tidak dirute service worker. Pembaruan: `registerType: 'prompt'`; `components/update-bar.tsx` menampilkan baris "Versi baru tersedia" tanpa memaksa.

## 8. Penyimpanan perangkat

`lib/storage.ts` adalah satu-satunya yang menyentuh `localStorage`. Setiap kunci punya versi skema (`qissa.v1.*`); migrasi sederhana saat versi berubah. Semua akses dibungkus try/catch; kegagalan diam-diam kecuali untuk simpan refleksi (ada pesan).

## 9. Analitik

`lib/analytics.ts`: `track(name: EventName, data?: Record<string, string>)`. `EventName` adalah union tujuh nama tetap. Skrip Umami dimuat dari konfigurasi dengan `data-exclude-search="true"`, supaya parameter URL dari tautan media sosial tidak ikut terkirim. Selama skrip dimuat, event diantre lalu dikirim berurutan begitu termuat (misalnya `mulai` pada kunjungan pertama lewat `#epNN`); bila Umami tidak dikonfigurasi, diblokir, atau gagal dimuat, `track` no-op. Tidak ada identitas perangkat yang dibuat oleh app.

## 10. Android (Capacitor)

- `apps/android` berisi `capacitor.config.ts` (`appId: 'id.qissah.app'`, `webDir` ke build web) dan folder `android/` hasil `cap add`.
- Plugin: `@capacitor/share` (dipakai `lib/share.ts` bila `Capacitor.isNativePlatform()`), `@capacitor/app` (deep link `https://qissah.id/#epNN` lewat App Links), `@capacitor/status-bar`.
- Push (ditunda setelah Ramadan, keputusan 23 Oktober): `@capacitor/push-notifications` + FCM; topik `ramadan`; opt-in dari layar pengaturan sederhana.
- Build: `pnpm build && pnpm cap:sync`, lalu Android Studio untuk AAB. Keystore disimpan di luar repo dan dicadangkan (lihat RUNBOOK).

## 11. Backend (PocketBase)

Ditunda setelah Ramadan (keputusan 23 Oktober 2026): MVP tidak memakai PocketBase, dan masukan dikirim lewat lembar bagikan (SRS SHR-2). Rancangan di bawah dipakai bila form dibangun.

MVP: koleksi `feedback` dengan aturan API: create `@request.auth.id = "" || @request.auth.id != ""` (siapa pun), list/view admin saja. Hook `pb_hooks/feedback.pb.js` membatasi 5 create per IP per jam dan menolak payload > 4 KB. Migrasi di `pb_migrations/` dikomit.

Fase 2 (dirancang, tidak dibangun): `users` (OAuth Google), `progress`, `circles`, `subscriptions`. Semua akses dari web lewat SDK PocketBase; tidak ada server kustom.

## 12. Build, CI, deploy

GitHub Actions `ci.yml` (setiap PR dan push): `pnpm install --frozen-lockfile`, `typecheck`, `lint`, `test`, `qs lint`, `qs compile --check`, `qs compile`, `vite build`, `pnpm audit --prod --audit-level=high`, E2E Playwright (ADR-018), unggah artefak. Action pihak ketiga dipin ke SHA commit. Push baru ke PR membatalkan run PR sebelumnya; run di `main` dan `staging` tidak pernah dibatalkan. Easypanel membangun image dari `infra/nginx/Dockerfile` setelah push ke `main` (produksi) atau `staging`. Image dibangun multi-tahap: Node 22 menjalankan `pnpm build`, lalu nginx menyajikan `apps/web/dist` dengan header keamanan dan CSP (PRIVACY-SECURITY §3). Tidak ada rahasia yang dibutuhkan untuk build web; konfigurasi `VITE_*` per lingkungan diisi di Environment service Easypanel dan masuk sebagai build arg, bukan `.env` yang di-commit (`.env` hanya untuk lokal).

## 13. Penanganan error dan observabilitas

- Error konten dicegah di compile time; sisa kemungkinan ditangani `ErrorBoundary` dengan pesan berbahasa Indonesia dan tombol "Kembali ke daftar episode".
- Tidak ada pelaporan error otomatis ke pihak ketiga (privasi). Bila dibutuhkan nanti: GlitchTip self-hosted, dicatat sebagai ADR baru.
- Kesehatan: endpoint `/healthz` dijawab nginx langsung (`200 ok`, tanpa aplikasi), dipantau uptime eksternal.

## 14. Anggaran kinerja
- App shell ≤ 150 KB gzip (tanpa font). React + React DOM ≈ 45 KB; sisanya untuk app. Tidak ada library UI, tidak ada markdown parser besar (dalil diparse di compile time, bukan di klien).
- Font: di-host sendiri (ADR-019), subset Latin untuk Plus Jakarta Sans dan Newsreader, Amiri hanya Arab, `font-display: swap`; Plus Jakarta Sans di-preload.
- Episode JSON ≤ 60 KB. Gambar hanya ikon dan OG.

## 15. Alur utama

Membuka episode: Home → `#epNN` → `muatEpisode` di `lib/content.ts` (cache, lalu jaringan) → `createStory` → Cover → ketukan pertama → `next()` berulang → `choice` → `snapshot('p1')` → `choose(i)` → … → `end` → Ending.

Pembaruan konten: manifest baru membawa `versi_konten` baru → saat episode dibuka, `muatEpisode` mengunduh versi itu lalu menghapus versi lama dari cache. Pembaruan app shell: service worker baru menunggu → baris "Versi baru tersedia" → pembaca mengetuk "Muat ulang" (ADR-017).

## 16. Utang teknis yang diterima di MVP
- Progres hanya di perangkat.
- Episode dengan tanggal rilis mendatang bisa diakses langsung lewat URL JSON.
- Tidak ada pelaporan error otomatis.
- Prototipe satu berkas (`infra/prototype`) tetap dipertahankan sampai apps/web mencapai paritas, lalu dihapus (ADR baru saat itu).
