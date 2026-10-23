// pnpm cap:sync (BACKLOG H1, H2): build web mode `android`, lalu `cap sync android`. APK memuat konten dari
// qissah.id, jadi bawaannya VITE_SITE_URL https://qissah.id dan VITE_CONTENT_BASE https://qissah.id/content;
// nilai dari lingkungan dipakai bila ada. cekEnv (apps/web/src/lib/config.ts) menolak VITE_CONTENT_BASE selain
// https di mode ini, sehingga build berhenti sebelum `cap sync`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AKAR = fileURLToPath(new URL('../../../', import.meta.url));
const ANDROID = fileURLToPath(new URL('../', import.meta.url));

const env = {
  ...process.env,
  VITE_SITE_URL: process.env['VITE_SITE_URL'] ?? 'https://qissah.id',
  VITE_CONTENT_BASE: process.env['VITE_CONTENT_BASE'] ?? 'https://qissah.id/content',
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
