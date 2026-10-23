import { describe, expect, test } from 'vitest';
import { ConfigError, cekEnv, parseConfig } from '../src/lib/config.ts';

const LENGKAP = {
  VITE_SITE_URL: 'https://qissah.id/',
  VITE_CONTENT_BASE: '/content/',
  VITE_UMAMI_SCRIPT: 'https://umami.qissah.id/script.js',
  VITE_UMAMI_ID: '',
  VITE_WA_CHANNEL: '  ',
};

describe('parseConfig', () => {
  test('membaca variabel lengkap dan membuang garis miring di akhir', () => {
    expect(parseConfig(LENGKAP, '0.1.0')).toEqual({
      siteUrl: 'https://qissah.id',
      contentBase: '/content',
      umamiScript: 'https://umami.qissah.id/script.js',
      umamiId: null,
      waChannel: null,
      pbUrl: null,
      appVersion: '0.1.0',
    });
  });

  test('VITE_APP_VERSION mengalahkan versi dari package.json', () => {
    expect(parseConfig({ ...LENGKAP, VITE_APP_VERSION: '1.2.0' }, '0.1.0').appVersion).toBe(
      '1.2.0',
    );
  });

  test('melempar ConfigError yang menyebut VITE_SITE_URL bila kosong', () => {
    expect(() => parseConfig({ ...LENGKAP, VITE_SITE_URL: '' }, '0.1.0')).toThrow(ConfigError);
    expect(() => parseConfig({ ...LENGKAP, VITE_SITE_URL: undefined }, '0.1.0')).toThrow(
      'VITE_SITE_URL kosong',
    );
  });
});

describe('cekEnv', () => {
  test('melaporkan semua masalah sekaligus', () => {
    expect(cekEnv({})).toEqual([
      'VITE_SITE_URL kosong; isi dengan URL situs, misalnya https://qissah.id.',
      'VITE_CONTENT_BASE kosong; isi dengan lokasi konten, misalnya /content.',
    ]);
  });

  test('menolak URL situs tanpa skema dan lokasi konten relatif', () => {
    expect(cekEnv({ VITE_SITE_URL: 'qissah.id', VITE_CONTENT_BASE: 'content' })).toEqual([
      'VITE_SITE_URL harus URL lengkap yang diawali https://, bukan “qissah.id”.',
      'VITE_CONTENT_BASE harus diawali / atau https://, bukan “content”.',
    ]);
  });

  test('menerima lokasi konten berupa URL penuh', () => {
    expect(
      cekEnv({ VITE_SITE_URL: 'https://qissah.id', VITE_CONTENT_BASE: 'https://cdn.qissah.id/c' }),
    ).toEqual([]);
  });

  test('APK (mode android) hanya menerima lokasi konten https (BACKLOG H2)', () => {
    const apk = { MODE: 'android', VITE_SITE_URL: 'https://qissah.id' };
    for (const base of ['/content', 'http://qissah.id/content']) {
      expect(cekEnv({ ...apk, VITE_CONTENT_BASE: base })).toEqual([
        `VITE_CONTENT_BASE untuk APK (mode android) harus diawali https://, bukan “${base}”; misalnya https://qissah.id/content.`,
      ]);
    }
    expect(cekEnv({ ...apk, VITE_CONTENT_BASE: 'https://qissah.id/content' })).toEqual([]);
  });
});
