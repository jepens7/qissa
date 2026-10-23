// Capacitor membungkus build web mode `android` (SRS AND-1, ADR-020). Folder `android/` hasil `cap add android`;
// yang diedit manual hanya konfigurasi.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.qissah.app',
  appName: 'Qissa',
  webDir: '../web/dist-android',
};

export default config;
