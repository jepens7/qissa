// BACKLOG D8: routing hash #home, #epNN, dan #debug.
import { expect, test } from 'vitest';
import { bacaRute, hashRute } from '../src/lib/route.ts';

test('#epNN membuka episode itu; hash lain kembali ke home', () => {
  expect(bacaRute('#ep02')).toEqual({ nama: 'episode', id: 'ep02' });
  expect(bacaRute('#debug')).toEqual({ nama: 'debug' });
  for (const hash of ['', '#', '#home', '#ep2', '#ep02x', '#lain']) {
    expect(bacaRute(hash)).toEqual({ nama: 'home' });
  }
});

test('hashRute kebalikan bacaRute', () => {
  for (const hash of ['#home', '#ep01', '#ep12', '#debug']) {
    expect(hashRute(bacaRute(hash))).toBe(hash);
  }
});
