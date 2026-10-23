import { defineConfig } from '@playwright/test';

/**
 * E2E SRS §9 (BACKLOG G3, ADR-018): satu spec di 360×780 terhadap build produksi lewat `vite preview`, jadi
 * jalankan `pnpm build` lebih dulu. QISSA_E2E_URL mengarahkan spec ke server lain, misalnya image Docker :8788.
 */
const urlLuar = process.env.QISSA_E2E_URL;
const ci = process.env.CI !== undefined;

export default defineConfig({
  testDir: 'e2e',
  // Bukan *.test.ts, supaya tidak ikut dijalankan vitest.
  testMatch: '**/*.e2e.ts',
  forbidOnly: ci,
  workers: 1,
  reporter: ci ? 'github' : 'list',
  use: {
    baseURL: urlLuar ?? 'http://localhost:4173',
    browserName: 'chromium',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // Durasi typing jadi pendek (engine: 350 ms), tanpa mengubah alur cerita.
    reducedMotion: 'reduce',
    locale: 'id-ID',
    trace: 'retain-on-failure',
  },
  ...(urlLuar === undefined
    ? {
        webServer: {
          command: 'pnpm exec vite preview --port 4173 --strictPort',
          url: 'http://localhost:4173',
          // Jangan memakai server lain yang kebetulan ada di 4173 (port bawaan `vite preview`).
          reuseExistingServer: false,
        },
      }
    : {}),
});
