// BACKLOG D7: nama event hanya dari union tujuh nama SRS §8, dan track diam bila Umami tidak ada. Event selama
// skrip Umami dimuat diantre (SRS §3.11).
import { afterEach, describe, expect, test, vi } from 'vitest';
import { pasangUmami, track, type EventName } from '../src/lib/analytics.ts';

const g = globalThis as { window?: unknown; document?: unknown };

type ElemenPalsu = {
  defer: boolean;
  src: string;
  setAttribute: (k: string, v: string) => void;
  onload?: () => void;
  onerror?: () => void;
};

let elTerakhir: ElemenPalsu | undefined;

/** document dan window palsu yang mencatat elemen skrip yang dipasang dan pemanggilan replaceState. */
function dokumenPalsu(search = '') {
  const atribut = new Map<string, string>();
  const el: ElemenPalsu = {
    defer: false,
    src: '',
    setAttribute: (k, v) => {
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
  const replaceState = vi.fn();
  g.window = { location: { pathname: '/', search, hash: '#ep01' }, history: { replaceState } };
  elTerakhir = el;
  return { el, atribut, dipasang, replaceState };
}

afterEach(() => {
  // Antrean modul dikosongkan lewat jalur gagal muat, supaya tes tidak saling memengaruhi.
  elTerakhir?.onerror?.();
  elTerakhir = undefined;
  delete g.window;
  delete g.document;
});

describe('pasangUmami', () => {
  test('tanpa parameter URL (PRIVACY-SECURITY §1), dan tidak dipasang bila konfigurasi kosong', () => {
    const { el, atribut, dipasang, replaceState } = dokumenPalsu();
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
    expect(replaceState).not.toHaveBeenCalled();
  });

  test('query dibuang dari URL sebelum skrip dipasang, karena pageview pertama Umami memakai URL apa adanya', () => {
    const { dipasang, replaceState } = dokumenPalsu('?fbclid=abc&utm_source=wa');
    replaceState.mockImplementation(() => {
      expect(dipasang).toHaveLength(0);
    });
    pasangUmami('https://umami.qissah.id/script.js', 'abc');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/#ep01');
    expect(dipasang).toHaveLength(1);
  });

  test('event selama skrip dimuat diantre, lalu dikirim berurutan begitu termuat', () => {
    const { el } = dokumenPalsu();
    pasangUmami('https://umami.qissah.id/script.js', 'abc');
    track('poll', { pilih: 'Tutup' });
    track('mulai', { ep: 'ep01' });
    const umami = { track: vi.fn() };
    g.window = { umami };
    el.onload?.();
    track('selesai', { ep: 'ep01', jalur: 'Tutup>Ketemu dulu' });
    expect(umami.track).toHaveBeenCalledTimes(3);
    expect(umami.track).toHaveBeenNthCalledWith(1, 'poll', { pilih: 'Tutup' });
    expect(umami.track).toHaveBeenNthCalledWith(2, 'mulai', { ep: 'ep01' });
    expect(umami.track).toHaveBeenNthCalledWith(3, 'selesai', {
      ep: 'ep01',
      jalur: 'Tutup>Ketemu dulu',
    });
  });

  test('skrip gagal dimuat (mis. diblokir): antrean dibuang dan event berikutnya tidak diantre', () => {
    const { el } = dokumenPalsu();
    pasangUmami('https://umami.qissah.id/script.js', 'abc');
    track('mulai', { ep: 'ep01' });
    el.onerror?.();
    track('pilihan', { ep: 'ep01', titik: 'p1', pilih: 'Tutup' });
    const umami = { track: vi.fn() };
    g.window = { umami };
    // Tidak terjadi di browser, tetapi membuktikan antrean sudah kosong: tidak ada event lama yang ikut terkirim.
    el.onload?.();
    track('selesai', { ep: 'ep01', jalur: 'Tutup' });
    expect(umami.track).toHaveBeenCalledTimes(1);
    expect(umami.track).toHaveBeenCalledWith('selesai', { ep: 'ep01', jalur: 'Tutup' });
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
