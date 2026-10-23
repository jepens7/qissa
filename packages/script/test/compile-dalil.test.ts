import { describe, expect, test } from 'vitest';
import { compileDalil, compileEpisode } from '../src/compile.ts';
import { adalahArab } from '../src/dalil.ts';
import type { Dalil } from '../src/types.ts';
import { DALIL, NASKAH, bacaRepo, ringkas } from './bantuan.ts';

function dalil(id: keyof typeof DALIL): Dalil {
  const hasil = compileDalil(bacaRepo(DALIL[id]), { file: DALIL[id] });
  expect(ringkas(hasil.diagnostics)).toEqual([]);
  if (hasil.dalil === null) {
    throw new Error(`${id} tidak terkompilasi`);
  }
  return hasil.dalil;
}

/** Jenis setiap baris per entri, untuk membaca struktur sekilas. */
const jenis = (d: Dalil) =>
  d.sections.map((s) => [s.kind, s.entries.map((e) => e.lines.map((l) => l.kind).join(' '))]);

describe('compileDalil (BACKLOG B5)', () => {
  test('ep01: 2 ayat, 2 hadis, 1 catatan, 1 hukum', () => {
    const d = dalil('ep01');
    expect(d.sections.map((s) => [s.kind, s.entries.length])).toEqual([
      ['ayat', 2],
      ['hadis', 2],
      ['catatan', 1],
      ['hukum', 1],
    ]);
    expect(d).toMatchObject({ status: 'draft', reviewed_by: null, reviewed_at: null });
  });

  test('ep01: baris Arab terdeteksi, terjemahan teks, baris terakhir rujukan', () => {
    const d = dalil('ep01');
    expect(jenis(d)).toEqual([
      ['ayat', ['arab teks rujukan', 'arab teks rujukan']],
      ['hadis', ['teks rujukan', 'teks rujukan']],
      ['catatan', ['teks']],
      ['hukum', ['teks']],
    ]);
    const baris = bacaRepo(DALIL.ep01).split('\n');
    const arab = d.sections
      .flatMap((s) => s.entries.flatMap((e) => e.lines))
      .filter((l) => l.kind === 'arab');
    expect(arab.map((l) => l.text)).toEqual([baris[7], baris[12]]);
    expect(d.sections[0]?.entries.map((e) => e.title)).toEqual([
      'QS Al-Hujurat 49:12',
      'QS An-Nur 24:16',
    ]);
  });

  test('ep02: riwayat, dua ayat Arab, tiga hadis termasuk “Ihsan” berujukan', () => {
    const d = dalil('ep02');
    expect(jenis(d)).toEqual([
      ['riwayat', ['teks rujukan']],
      ['ayat', ['arab teks rujukan', 'arab teks rujukan']],
      ['hadis', ['teks rujukan', 'teks rujukan', 'teks rujukan']],
      ['catatan', ['teks']],
      ['hukum', ['teks']],
    ]);
    const ihsan = d.sections.find((s) => s.kind === 'hadis')?.entries[2];
    expect(ihsan).toEqual({
      title: 'Ihsan',
      lines: [
        {
          kind: 'teks',
          text: '“Engkau beribadah kepada Allah seakan-akan engkau melihat-Nya; jika engkau tidak melihat-Nya, sesungguhnya Dia melihatmu.”',
        },
        { kind: 'rujukan', text: 'Bagian dari hadis Jibril, HR Muslim no. 8, sahih' },
      ],
    });
  });

  test('teks diambil apa adanya, termasuk awalan “Sumber:”', () => {
    const riwayat = dalil('ep02').sections[0]?.entries[0]?.lines[1]?.text;
    expect(riwayat).toBe(
      'Sumber: riwayat sejarah, bukan hadis. Dinukil antara lain oleh Ibnul Jauzi; sanad perlu diverifikasi pereview.',
    );
  });

  test('status reviewed membawa pereview dan tanggalnya', () => {
    const sumber = bacaRepo(DALIL.ep01)
      .replace('status: draft', 'status: reviewed')
      .replace('reviewed_by:', 'reviewed_by: Pereview Uji')
      .replace('reviewed_at:', 'reviewed_at: 2026-11-10');
    const hasil = compileDalil(sumber, { file: DALIL.ep01 });
    expect(ringkas(hasil.diagnostics)).toEqual([]);
    expect(hasil.dalil).toMatchObject({
      status: 'reviewed',
      reviewed_by: 'Pereview Uji',
      reviewed_at: '2026-11-10',
    });
  });

  test('hanya baris terakhir entri yang menjadi rujukan; bagian tanpa entri dihilangkan', () => {
    const hasil = compileDalil(
      [
        '---',
        'status: draft',
        'reviewed_by:',
        'reviewed_at:',
        '---',
        '## Riwayat',
        '## Hadis',
        '### Uji',
        'Sumber yang disebut di tengah tetap teks.',
        'HR Uji no. 1',
      ].join('\n'),
      { file: 'dalil.md' },
    );
    expect(ringkas(hasil.diagnostics)).toEqual([]);
    expect(hasil.dalil?.sections).toEqual([
      {
        kind: 'hadis',
        entries: [
          {
            title: 'Uji',
            lines: [
              { kind: 'teks', text: 'Sumber yang disebut di tengah tetap teks.' },
              { kind: 'rujukan', text: 'HR Uji no. 1' },
            ],
          },
        ],
      },
    ]);
  });

  test('null bila ada error', () => {
    const hasil = compileDalil('---\nstatus: draft\n---\n## Tafsir\nTeks.', { file: 'dalil.md' });
    expect(hasil.dalil).toBeNull();
    expect(ringkas(hasil.diagnostics)[0]).toContain('S1@4: Judul bagian “Tafsir” tidak dikenal');
  });
});

test('compileEpisode mengembalikan null bila hanya dalil.md yang error', () => {
  const { episode, diagnostics } = compileEpisode(bacaRepo(NASKAH.ep01), {
    file: NASKAH.ep01,
    dalil: '---\nstatus: draft\n---\n## Tafsir\nTeks.',
    dalilFile: 'dalil.md',
  });
  expect(episode).toBeNull();
  expect(diagnostics.filter((d) => d.level === 'error').map((d) => d.file)).toContain('dalil.md');
});

describe('adalahArab', () => {
  const ayat = bacaRepo(DALIL.ep02).split('\n')[17] ?? '';
  test.each([
    ['baris ayat dari dalil.md', ayat, true],
    ['ayat dengan nomor dan tanda kurung hias', `${ayat} ﴿٥٨﴾`, true],
    [
      'terjemahan yang mengutip satu kata Arab',
      `“Sungguh, Allah menyuruhmu…” (${ayat.split(' ')[0] ?? ''})`,
      false,
    ],
    ['teks Latin', 'Terjemahan Kemenag', false],
  ])('%s', (_nama, teks, harapan) => {
    expect(adalahArab(teks)).toBe(harapan);
  });
});

test('“Ulama berbeda” menjadi bagian ikhtilaf: dua pendapat, masing-masing berujukan (BACKLOG F2)', () => {
  const hasil = compileDalil(
    [
      '---',
      'status: draft',
      'reviewed_by:',
      'reviewed_at:',
      '---',
      '## Hadis',
      '### Uji',
      'Teks hadis uji.',
      'HR Uji no. 1',
      '## Catatan',
      'Catatan uji.',
      '## Ulama berbeda',
      '### Pendapat pertama',
      'Sebagian ulama berpendapat A.',
      'Sumber: Kitab Uji A',
      '### Pendapat kedua',
      'Sebagian ulama lain berpendapat B.',
      'Sumber: Kitab Uji B',
      '## Hukum negara',
      'Hukum uji.',
    ].join('\n'),
    { file: 'dalil.md' },
  );
  expect(ringkas(hasil.diagnostics)).toEqual([]);
  expect(hasil.dalil?.sections.map((s) => s.kind)).toEqual([
    'hadis',
    'catatan',
    'ikhtilaf',
    'hukum',
  ]);
  expect(hasil.dalil?.sections[2]).toEqual({
    kind: 'ikhtilaf',
    entries: [
      {
        title: 'Pendapat pertama',
        lines: [
          { kind: 'teks', text: 'Sebagian ulama berpendapat A.' },
          { kind: 'rujukan', text: 'Sumber: Kitab Uji A' },
        ],
      },
      {
        title: 'Pendapat kedua',
        lines: [
          { kind: 'teks', text: 'Sebagian ulama lain berpendapat B.' },
          { kind: 'rujukan', text: 'Sumber: Kitab Uji B' },
        ],
      },
    ],
  });
});

test('bagian diurutkan menurut urutan baku kartu, apa pun urutannya di berkas (SRS DLL-1)', () => {
  const hasil = compileDalil(
    [
      '---',
      'status: draft',
      'reviewed_by:',
      'reviewed_at:',
      '---',
      '## Hukum negara',
      'Hukum uji.',
      '## Ulama berbeda',
      '### Pendapat pertama',
      'Pendapat A.',
      'Sumber: Kitab Uji A',
      '## Catatan',
      'Catatan uji.',
      '## Hadis',
      '### Uji',
      'Teks hadis uji.',
      'HR Uji no. 1',
    ].join('\n'),
    { file: 'dalil.md' },
  );
  expect(ringkas(hasil.diagnostics)).toEqual([]);
  expect(hasil.dalil?.sections.map((s) => s.kind)).toEqual([
    'hadis',
    'catatan',
    'ikhtilaf',
    'hukum',
  ]);
});
