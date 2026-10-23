// BACKLOG D7: nama event hanya dari union tujuh nama SRS §8, dan track diam bila Umami tidak ada.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { pasangUmami, track, type EventName } from '../src/lib/analytics.ts';

const g = globalThis as { window?: unknown; document?: unknown };

afterEach(() => {
  delete g.window;
  delete g.document;
});

describe('pasangUmami', () => {
  test('tanpa parameter URL (PRIVACY-SECURITY §1), dan tidak dipasang bila konfigurasi kosong', () => {
    const atribut = new Map<string, string>();
    const el = {
      defer: false,
      src: '',
      setAttribute: (k: string, v: string) => {
        atribut.set(k, v);
      },
    };
    const dipasang: unknown[] = [];
    g.document = {
      createElement: () => el,
      head: {
        appendChild: (x: unknown) => {
          dipasang.push(x);
        },
      },
    };
    pasangUmami(null, 'abc');
    pasangUmami('https://umami.qissah.id/script.js', null);
    expect(dipasang).toHaveLength(0);

    pasangUmami('https://umami.qissah.id/script.js', 'abc');
    expect(dipasang).toEqual([el]);
    expect(el).toMatchObject({ defer: true, src: 'https://umami.qissah.id/script.js' });
    expect(Object.fromEntries(atribut)).toEqual({
      'data-website-id': 'abc',
      'data-exclude-search': 'true',
    });
  });
});

describe('track', () => {
  test('union nama event persis tujuh nama SRS §8', () => {
    const semua: Record<EventName, true> = {
      poll: true,
      mulai: true,
      pilihan: true,
      selesai: true,
      bagikan: true,
      masukan: true,
      saluran: true,
    };
    expect(Object.keys(semua)).toHaveLength(7);
  });

  test('nama atau isi event di luar SRS §8 ditolak typecheck', () => {
    const umami = { track: vi.fn() };
    g.window = { umami };
    // @ts-expect-error nama event harus dari union
    track('klik', { ep: 'ep01' });
    // @ts-expect-error isi event mengikuti SRS §8
    track('mulai', { episode: 'ep01' });
    expect(umami.track).toHaveBeenCalledTimes(2);
  });

  test('meneruskan nama dan isi ke Umami bila termuat', () => {
    const umami = { track: vi.fn() };
    g.window = { umami };
    track('pilihan', { ep: 'ep01', titik: 'p1', pilih: 'Tutup' });
    expect(umami.track).toHaveBeenCalledWith('pilihan', {
      ep: 'ep01',
      titik: 'p1',
      pilih: 'Tutup',
    });
  });

  test('diam tanpa error bila Umami belum termuat, tidak ada window, atau track melempar', () => {
    expect(() => {
      track('mulai', { ep: 'ep01' });
    }).not.toThrow();
    g.window = {};
    expect(() => {
      track('mulai', { ep: 'ep01' });
    }).not.toThrow();
    g.window = {
      umami: {
        track: () => {
          throw new Error('diblokir');
        },
      },
    };
    expect(() => {
      track('mulai', { ep: 'ep01' });
    }).not.toThrow();
  });
});
