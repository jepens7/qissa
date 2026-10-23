// SRS AND-2 (BACKLOG H3): tautan https://qissah.id/#epNN yang membuka APK diarahkan ke episodenya.
import { expect, test } from 'vitest';
import { hashDariTautan } from '../src/lib/native.ts';

test('tautan episode qissah.id menjadi hash rute; tautan lain diabaikan', () => {
  expect(hashDariTautan('https://qissah.id/#ep02')).toBe('#ep02');
  expect(hashDariTautan('https://qissah.id/?fbclid=x#ep01')).toBe('#ep01');
  expect(hashDariTautan('https://qissah.id/')).toBeNull();
  expect(hashDariTautan('https://qissah.id/#home')).toBeNull();
  expect(hashDariTautan('https://contoh.com/#ep02')).toBeNull();
  expect(hashDariTautan('bukan url')).toBeNull();
});
