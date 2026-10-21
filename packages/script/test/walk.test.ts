import { describe, expect, test } from 'vitest';
import type { Line } from '../src/types.ts';
import { BATAS_BARIS_TERLIHAT, BATAS_JALUR, panjang, walkEpisode } from '../src/walk.ts';
import { NASKAH, bacaRepo, kompilasi } from './bantuan.ts';

const jalurDari = (path: string) => walkEpisode(kompilasi(bacaRepo(path)).isi);
const nama = (j: { pilihan: { name: string }[] }) => j.pilihan.map((p) => p.name).join(' > ');

describe('walkEpisode pada naskah di content/', () => {
  test('ep01: 9 jalur berurutan seperti opsi di naskah, semuanya END', () => {
    const jalur = jalurDari(NASKAH.ep01);
    expect(jalur.map(nama)).toEqual([
      'Buka > Ga tau',
      'Buka > Cerita semuanya',
      'Buka > Ketemu dulu',
      'Tutup > Ga tau',
      'Tutup > Cerita semuanya',
      'Tutup > Ketemu dulu',
      'Tegur > Ga tau',
      'Tegur > Cerita semuanya',
      'Tegur > Ketemu dulu',
    ]);
    expect(jalur.every((j) => j.akhir === 'END')).toBe(true);
  });

  test('ep02: 9 jalur, semuanya END, dan setiap knot dimasuki', () => {
    const { isi } = kompilasi(bacaRepo(NASKAH.ep02));
    const jalur = walkEpisode(isi);
    expect(jalur).toHaveLength(9);
    expect(jalur.every((j) => j.akhir === 'END')).toBe(true);
    const dimasuki = new Set(jalur.flatMap((j) => j.masuk));
    expect([...dimasuki].sort()).toEqual(Object.keys(isi.knots).sort());
  });

  test('typing paling banyak dua per jalur; maksimum di ep01 Tegur > Cerita semuanya', () => {
    const jumlah = (path: string) =>
      jalurDari(path).map(
        (j) => [nama(j), j.langkah.filter((l) => l.item.t === 'typing').length] as const,
      );
    expect(Math.max(...jumlah(NASKAH.ep02).map(([, n]) => n))).toBe(0);
    expect(jumlah(NASKAH.ep01).filter(([, n]) => n === 2)).toEqual([
      ['Tegur > Cerita semuanya', 2],
    ]);
  });

  test('panjang setiap jalur dalam baris terlihat (W3, qs walk): typing tidak dihitung', () => {
    // Jalur ep01 yang memuat @typing (Cerita semuanya dan Tegur) ikut diuji di sini.
    expect(jalurDari(NASKAH.ep01).map(panjang)).toEqual([50, 44, 47, 51, 48, 49, 48, 45, 46]);
    expect(jalurDari(NASKAH.ep02).map(panjang)).toEqual([48, 58, 45, 49, 52, 49, 48, 52, 46]);
  });
});

describe('walkEpisode pada episode buatan', () => {
  const ep = (knots: Record<string, Line[]>) => walkEpisode({ start: 'a', knots });
  const pilihan = (key: string, tujuan: Record<string, string>): Line => ({
    t: 'choice',
    key,
    label: 'P',
    options: Object.entries(tujuan).map(([name, go]) => ({ text: name, go, name })),
  });

  test('knot yang tidak ada dan knot tanpa penutup berakhir buntu', () => {
    expect(ep({ a: [{ t: 'go', to: 'hilang' }] })[0]).toMatchObject({
      akhir: 'buntu',
      berhenti: { knot: 'hilang', idx: 0 },
      masuk: ['a'],
    });
    expect(ep({ a: [{ t: 'nar', text: 'X' }] })[0]).toMatchObject({
      akhir: 'buntu',
      berhenti: { knot: 'a', idx: 1 },
    });
  });

  test('knot tanpa baris tetap tercatat dimasuki', () => {
    expect(ep({ a: [{ t: 'go', to: 'b' }], b: [] })[0]).toMatchObject({
      akhir: 'buntu',
      berhenti: { knot: 'b', idx: 0 },
      masuk: ['a', 'b'],
    });
  });

  test('perulangan tanpa pilihan berhenti di baris -> yang kembali', () => {
    const [jalur] = ep({
      a: [
        { t: 'nar', text: 'X' },
        { t: 'go', to: 'a' },
      ],
    });
    expect(jalur).toMatchObject({
      akhir: 'putar',
      berhenti: { knot: 'a', idx: 1 },
      putarKe: 'a',
    });
    expect(jalur === undefined ? 0 : panjang(jalur)).toBe(1);
  });

  test('putaran lewat pilihan berhenti di opsi yang kembali dengan variabel yang sama', () => {
    // Masuk pertama ke a tanpa variabel, kedua dengan x: belum putaran. Ketiga dengan x lagi: putaran.
    const jalur = ep({
      a: [{ t: 'set', v: 'x' }, pilihan('p1', { Lagi: 'a', Diam: 'a', Tutup: 'b' })],
      b: [{ t: 'end' }],
    });
    expect(jalur.map((j) => [nama(j), j.akhir])).toEqual([
      ['Lagi > Lagi', 'putar'],
      ['Lagi > Diam', 'putar'],
      ['Lagi > Tutup', 'END'],
      ['Diam > Lagi', 'putar'],
      ['Diam > Diam', 'putar'],
      ['Diam > Tutup', 'END'],
      ['Tutup', 'END'],
    ]);
    expect(jalur[1]).toMatchObject({ berhenti: { knot: 'a', idx: 1, opsi: 1 }, putarKe: 'a' });
  });

  test('jalur lebih dari 300 baris terlihat berhenti sebagai panjang', () => {
    const narasi = Array.from({ length: BATAS_BARIS_TERLIHAT + 1 }, (): Line => ({
      t: 'nar',
      text: 'X',
    }));
    const [jalur] = ep({ a: [...narasi, { t: 'end' }] });
    expect(jalur).toMatchObject({ akhir: 'panjang', berhenti: { knot: 'a', idx: 300 } });
    expect(jalur === undefined ? 0 : panjang(jalur)).toBe(BATAS_BARIS_TERLIHAT + 1);
  });

  test('penjelajahan berhenti setelah BATAS_JALUR jalur', () => {
    // Tujuh titik pilihan berurutan memberi 3^7 = 2187 jalur.
    const knots: Record<string, Line[]> = { k7: [{ t: 'end' }] };
    for (let i = 0; i < 7; i++) {
      const lanjut = `k${String(i + 1)}`;
      knots[`k${String(i)}`] = [pilihan(`p${String(i)}`, { A: lanjut, B: lanjut, C: lanjut })];
    }
    const jalur = walkEpisode({ start: 'k0', knots });
    expect(jalur).toHaveLength(BATAS_JALUR + 1);
    expect(jalur.slice(0, -1).every((j) => j.akhir === 'END')).toBe(true);
    expect(jalur.at(-1)?.akhir).toBe('batas');
  });

  test('blok pilihan tanpa opsi berakhir buntu di baris pilihannya', () => {
    expect(ep({ a: [{ t: 'choice', key: 'p1', label: 'P', options: [] }] })).toMatchObject([
      { akhir: 'buntu', berhenti: { knot: 'a', idx: 0 } },
    ]);
  });

  test('cond, negasi, cases, dan branch dievaluasi dengan variabel jalur', () => {
    const [jalur] = ep({
      a: [
        { t: 'nar', text: 'tanpa syarat' },
        { t: 'in', text: 'belum', cond: '!x' },
        { t: 'set', v: 'x' },
        { t: 'out', text: 'sudah', cond: 'x' },
        { t: 'nar', cases: [{ cond: 'y', text: 'y' }, { text: 'lainnya' }] },
        {
          t: 'branch',
          cases: [{ cond: 'y', to: 'salah' }, { cond: 'x', to: 'b' }, { to: 'salah' }],
        },
      ],
      b: [{ t: 'end' }],
    });
    expect(jalur?.langkah.map((l) => l.item)).toEqual([
      { t: 'nar', text: 'tanpa syarat' },
      { t: 'in', text: 'belum' },
      { t: 'out', text: 'sudah' },
      { t: 'nar', text: 'lainnya' },
      { t: 'end' },
    ]);
    expect(jalur?.langkah[3]).toMatchObject({ knot: 'a', idx: 4, kasus: 1 });
  });

  test('negasi variabel yang sudah di-set dan cond salah di out serta sys disembunyikan', () => {
    const [jalur] = ep({
      a: [
        { t: 'set', v: 'x' },
        { t: 'nar', text: 'n', cond: '!x' },
        { t: 'in', text: 'i', cond: '!x' },
        { t: 'out', text: 'o', cond: '!x' },
        { t: 'sys', text: 's', cond: '!x' },
        { t: 'out', text: 'o2', cond: 'y' },
        { t: 'sys', text: 's2', cond: 'y' },
        { t: 'end' },
      ],
    });
    expect(jalur?.langkah.map((l) => l.item)).toEqual([{ t: 'end' }]);
  });

  test('typing dan penutup END tidak dihitung dalam panjang jalur', () => {
    const [jalur] = ep({
      a: [
        { t: 'view', name: 'G', initial: 'G', sub: 'online', pill: 'Chat', group: false },
        { t: 'typing' },
        { t: 'in', text: 'halo' },
        { t: 'end' },
      ],
    });
    expect(jalur === undefined ? 0 : panjang(jalur)).toBe(2);
  });
});
