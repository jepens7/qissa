import { describe, expect, test } from 'vitest';
import { bacaKunci, hariIniJakarta, hitungVersi, tulisKunci } from '../src/versi.ts';

describe('hitungVersi (DATA-CONTRACTS §9, ADR-014)', () => {
  test('episode baru di kunci memakai versi_konten dari content/manifest.json', () => {
    expect(hitungVersi(undefined, 'sha256:a', '2026-10-25', '2026-10-21.1')).toBe('2026-10-21.1');
  });

  test('versi_konten awal yang tidak sah diganti tanggal hari ini', () => {
    expect(hitungVersi(undefined, 'sha256:a', '2026-10-25', 'kemarin')).toBe('2026-10-25.1');
    expect(hitungVersi(undefined, 'sha256:a', '2026-10-25', undefined)).toBe('2026-10-25.1');
  });

  test('hash sama mempertahankan versi, walau hari berganti', () => {
    expect(
      hitungVersi({ hash: 'sha256:a', versi: '2026-10-21.1' }, 'sha256:a', '2026-12-01', undefined),
    ).toBe('2026-10-21.1');
  });

  test('hash berubah di hari yang sama menaikkan n', () => {
    expect(
      hitungVersi({ hash: 'sha256:a', versi: '2026-10-21.2' }, 'sha256:b', '2026-10-21', undefined),
    ).toBe('2026-10-21.3');
  });

  test('versi sebelumnya bertanggal hari ini atau sesudahnya: n naik pada tanggal itu', () => {
    // Nilai awal di content/manifest.json bisa bertanggal di masa depan (DATA-CONTRACTS §2).
    expect(
      hitungVersi({ hash: 'sha256:a', versi: '2026-11-01.1' }, 'sha256:b', '2026-10-25', undefined),
    ).toBe('2026-11-01.2');
  });

  test('hash berubah di hari lain mulai dari .1', () => {
    expect(
      hitungVersi({ hash: 'sha256:a', versi: '2026-10-21.2' }, 'sha256:b', '2026-10-22', undefined),
    ).toBe('2026-10-22.1');
  });
});

test('tanggal hari ini memakai zona Asia/Jakarta', () => {
  expect(hariIniJakarta(new Date('2026-10-21T16:59:00Z'))).toBe('2026-10-21');
  expect(hariIniJakarta(new Date('2026-10-21T17:00:00Z'))).toBe('2026-10-22');
});

test('berkas kunci terurut, berindentasi dua spasi, dan diakhiri newline', () => {
  const teks = tulisKunci({
    ep02: { hash: 'sha256:b', versi: '2026-10-21.1' },
    ep01: { hash: 'sha256:a', versi: '2026-10-21.1' },
  });
  expect(teks.indexOf('ep01')).toBeLessThan(teks.indexOf('ep02'));
  expect(teks.endsWith('}\n')).toBe(true);
  expect(bacaKunci(teks)).toEqual({
    ep01: { hash: 'sha256:a', versi: '2026-10-21.1' },
    ep02: { hash: 'sha256:b', versi: '2026-10-21.1' },
  });
  expect(bacaKunci(null)).toEqual({});
  expect(() => bacaKunci('{"ep01": {"hash": 1}}')).toThrow(
    'Entri “ep01” di content/versi-konten.lock.json harus punya hash dan versi berformat YYYY-MM-DD.n.',
  );
});

describe('bacaKunci menolak berkas yang tidak sah dengan menyebut berkasnya', () => {
  test('versi yang formatnya salah', () => {
    expect(() => bacaKunci('{"ep01": {"hash": "sha256:a", "versi": "bukan-versi"}}')).toThrow(
      'Entri “ep01” di content/versi-konten.lock.json',
    );
  });

  test('JSON rusak, dengan nomor barisnya bila diketahui', () => {
    expect(() => bacaKunci('{\n  "ep01": ')).toThrow(
      'content/versi-konten.lock.json bukan JSON yang sah',
    );
    expect(() => bacaKunci('{\n  "ep01": {,', 'kunci.json')).toThrow(
      'kunci.json bukan JSON yang sah (baris 2).',
    );
  });

  test('BOM di awal berkas diabaikan', () => {
    const teks = tulisKunci({ ep01: { hash: 'sha256:a', versi: '2026-10-21.1' } });
    expect(bacaKunci(`${String.fromCharCode(0xfeff)}${teks}`)).toEqual({
      ep01: { hash: 'sha256:a', versi: '2026-10-21.1' },
    });
  });
});
