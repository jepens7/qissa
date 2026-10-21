import { describe, expect, test } from 'vitest';
import { adalahRujukan, parseDalil } from '../src/dalil.ts';
import { pengumpul } from '../src/diagnostics.ts';
import { DALIL, bacaRepo, ringkas } from './bantuan.ts';

function baca(sumber: string) {
  const { daftar, lapor } = pengumpul('dalil.md');
  return { ast: parseDalil(sumber, lapor), diagnostik: ringkas(daftar) };
}

const ringkasan = (sumber: string) =>
  baca(sumber).ast.bagian.map((b) => [b.kind, b.entries.length] as const);

describe('parseDalil pada dalil.md di content/', () => {
  test('ep01: ayat 2, hadis 2, catatan 1, hukum 1, tanpa diagnostik', () => {
    const { diagnostik } = baca(bacaRepo(DALIL.ep01));
    expect(diagnostik).toEqual([]);
    expect(ringkasan(bacaRepo(DALIL.ep01))).toEqual([
      ['ayat', 2],
      ['hadis', 2],
      ['catatan', 1],
      ['hukum', 1],
    ]);
  });

  test('ep02: riwayat 1, ayat 2, hadis 3, catatan 1, hukum 1, tanpa diagnostik', () => {
    expect(baca(bacaRepo(DALIL.ep02)).diagnostik).toEqual([]);
    expect(ringkasan(bacaRepo(DALIL.ep02))).toEqual([
      ['riwayat', 1],
      ['ayat', 2],
      ['hadis', 3],
      ['catatan', 1],
      ['hukum', 1],
    ]);
  });

  test('setiap entri ayat, hadis, dan riwayat berakhir dengan rujukan, termasuk “Ihsan”', () => {
    for (const path of Object.values(DALIL)) {
      for (const bagian of baca(bacaRepo(path)).ast.bagian) {
        if (bagian.kind === 'catatan' || bagian.kind === 'hukum') {
          continue;
        }
        for (const entri of bagian.entries) {
          const terakhir = entri.lines[entri.lines.length - 1]?.text ?? '';
          expect(adalahRujukan(terakhir), `${entri.title?.text ?? ''}: ${terakhir}`).toBe(true);
        }
      }
    }
  });
});

describe('adalahRujukan', () => {
  test.each([
    ['Terjemahan Kemenag', true],
    ['Terjemahan Kemenag. Konteks ayat: peristiwa tuduhan terhadap Aisyah, ayat 11–20.', true],
    ['HR Muslim no. 2589, sahih (perlu verifikasi pereview)', true],
    ['Sumber: riwayat sejarah, bukan hadis.', true],
    ['Bagian dari hadis Jibril, HR Muslim no. 8, sahih', true],
    ['“Tunaikanlah amanah kepada orang yang mempercayaimu.”', false],
    ['Divisi HRD perusahaan itu tutup.', false],
  ])('%s', (teks, harapan) => {
    expect(adalahRujukan(teks)).toBe(harapan);
  });
});

describe('struktur dalil.md yang salah adalah S1', () => {
  const awal = '---\nstatus: draft\nreviewed_by:\nreviewed_at:\n---\n';
  test.each([
    ['judul bagian tak dikenal', '## Tafsir\nTeks.', 'S1@6: Judul bagian “Tafsir” tidak dikenal'],
    [
      'entri sebelum bagian',
      '### QS 1:1\nTeks.',
      'S1@6: Entri ### harus berada di bawah judul bagian ##.',
    ],
    [
      'teks sebelum bagian',
      'Teks lepas.',
      'S1@6: Teks dalil harus berada di bawah judul bagian ##.',
    ],
    ['bagian ganda', '## Ayat\nA.\n## Ayat\nB.', 'S1@8: Bagian “Ayat” ditulis dua kali.'],
    ['tingkat judul lain', '# Dalil\n## Ayat\nA.', 'S1@6: Judul “# Dalil” tidak dikenal'],
  ])('%s', (_nama, isi, harapan) => {
    const { diagnostik } = baca(`${awal}${isi}`);
    expect(diagnostik).toHaveLength(1);
    expect(diagnostik[0]).toContain(harapan);
  });

  test('bagian tanpa ### menjadi satu entri tanpa judul', () => {
    const { ast } = baca(`${awal}## Catatan\nSatu.\nDua.`);
    expect(ast.bagian).toEqual([
      {
        kind: 'catatan',
        line: 6,
        entries: [
          {
            line: 7,
            lines: [
              { text: 'Satu.', line: 7 },
              { text: 'Dua.', line: 8 },
            ],
          },
        ],
      },
    ]);
  });
});
