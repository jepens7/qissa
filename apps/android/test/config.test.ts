// SRS AND-1 (BACKLOG H1): Capacitor membungkus build web dengan appId id.qissah.app.
import { expect, test } from 'vitest';
import config from '../capacitor.config.ts';

test('appId, nama, dan folder web sesuai SRS AND-1 dan ARCHITECTURE §10', () => {
  expect(config).toMatchObject({
    appId: 'id.qissah.app',
    appName: 'Qissa',
    webDir: '../web/dist-android',
  });
});
