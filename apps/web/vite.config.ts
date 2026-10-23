import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { ConfigError, cekEnv } from './src/lib/config.ts';

/**
 * Service worker app shell (ADR-017, SRS PWA-2/PWA-3). Konten (manifest dan episode) tidak disentuh service
 * worker: lib/content.ts yang menyimpannya (episode di Cache Storage, salinan manifest di localStorage).
 * Routing memakai hash, jadi tidak ada navigateFallback; /privasi/ dan /tentang/ tetap halaman statis yang
 * di-precache.
 */
function serviceWorker() {
  return VitePWA({
    registerType: 'prompt',
    // Didaftarkan lewat virtual:pwa-register/react di components/update-bar.tsx (root sendiri di main.tsx),
    // tanpa skrip inline (CSP).
    injectRegister: false,
    // public/manifest.webmanifest tetap dipakai apa adanya.
    manifest: false,
    workbox: {
      // Font di-host sendiri ikut di-precache, jadi teks Arab dan serif tampil offline sejak kunjungan pertama.
      globPatterns: ['**/*.{js,css,html,png,webmanifest,woff2}'],
      // og.png hanya untuk pratinjau tautan; konten di-cache lib/content.ts.
      globIgnores: ['og.png', 'content/**'],
      navigateFallback: null,
      // App tidak memakai query string (routing hash), jadi tautan berparameter pelacak dari aplikasi lain tetap
      // dilayani index.html dari precache, termasuk saat offline.
      ignoreURLParametersMatching: [/.*/],
    },
  });
}

/** BACKLOG A3: build gagal dengan pesan jelas bila variabel wajib kosong; dev cukup diberi peringatan. */
function cekKonfigurasi(): Plugin {
  return {
    name: 'qissa:cek-konfigurasi',
    configResolved(config) {
      const masalah = cekEnv(config.env);
      if (masalah.length === 0 || config.mode === 'test') {
        return;
      }
      const pesan = `${new ConfigError(masalah).message}\nSalin apps/web/.env.example menjadi apps/web/.env lalu isi nilainya, atau set variabelnya di lingkungan build.`;
      if (config.command === 'build') {
        throw new Error(pesan);
      }
      config.logger.warn(pesan);
    },
  };
}

export default defineConfig({
  plugins: [react(), cekKonfigurasi(), serviceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // SRS NFR-6: Android Chrome 90+, Samsung Internet 15+ (setara Chrome 90), Safari iOS 15+.
    target: ['chrome90', 'safari15'],
  },
});
