// pnpm cap:sync (BACKLOG H1, H2): build web mode `android`, lalu `cap sync android`. APK memuat konten dari
// qissah.id dan ikut Umami yang sama dengan web (PROGRESS, keputusan 24 Oktober butir 4), jadi keempat variabel
// di bawah punya nilai bawaan. Nilai dari shell dipakai bila ada. Nilai bawaan mengalahkan apps/web/.env, karena
// Vite tidak menimpa variabel yang sudah ada di lingkungan proses. cekEnv (apps/web/src/lib/config.ts) menolak
// VITE_CONTENT_BASE selain https di mode ini, sehingga build berhenti sebelum `cap sync`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AKAR = fileURLToPath(new URL('../../../', import.meta.url));
const ANDROID = fileURLToPath(new URL('../', import.meta.url));

const env = {
  VITE_SITE_URL: 'https://qissah.id',
  VITE_CONTENT_BASE: 'https://qissah.id/content',
  VITE_UMAMI_SCRIPT: 'https://umami.qissah.id/script.js',
  VITE_UMAMI_ID: '3a2f0ef7-6bb4-478e-a5b6-bc371b74f881',
  ...process.env,
};

/** Menjalankan perintah pnpm (argumen tetap, tanpa masukan pengguna) dan berhenti bila gagal. */
function jalankan(perintah: string, cwd: string) {
  const hasil = spawnSync(`pnpm ${perintah}`, { cwd, env, stdio: 'inherit', shell: true });
  if (hasil.status !== 0) {
    process.exit(hasil.status ?? 1);
  }
}

jalankan(
  '--filter @qissa/web exec vite build --mode android --outDir dist-android --emptyOutDir',
  AKAR,
);
jalankan('exec cap sync android', ANDROID);
