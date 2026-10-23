// SRS AND-1 (BACKLOG H1): Capacitor membungkus build web dengan appId id.qissah.app. AndroidManifest diedit
// manual (ADR-020): tanpa cadangan otomatis, dan deep link hanya untuk path akar qissah.id (SRS AND-2).
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import config from '../capacitor.config.ts';

test('appId, nama, dan folder web sesuai SRS AND-1 dan ARCHITECTURE §10', () => {
  expect(config).toMatchObject({
    appId: 'id.qissah.app',
    appName: 'Qissa',
    webDir: '../web/dist-android',
  });
});

test('AndroidManifest: allowBackup mati, dan /privasi serta /tentang tidak dibuka APK', () => {
  const manifest = readFileSync(
    new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url),
    'utf8',
  );
  expect(manifest).toContain('android:allowBackup="false"');
  expect(manifest).toContain(
    '<data android:scheme="https" android:host="qissah.id" android:path="/" />',
  );
});
