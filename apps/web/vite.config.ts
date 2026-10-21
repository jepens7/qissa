import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };
import { ConfigError, cekEnv } from './src/lib/config.ts';

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
  plugins: [react(), cekKonfigurasi()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // SRS NFR-6: Android Chrome 90+, Samsung Internet 15+ (setara Chrome 90), Safari iOS 15+.
    target: ['chrome90', 'safari15'],
  },
});
