import { Ajv, type SchemaObject } from 'ajv';
import { describe, expect, test } from 'vitest';
import { compileEpisode } from '../src/compile.ts';
import {
  DALIL,
  FRONT_MATTER_UJI,
  NASKAH,
  bacaRepo,
  episodeKonten,
  kompilasi,
  ringkas,
} from './bantuan.ts';

const skema = JSON.parse(bacaRepo('packages/script/schema/episode.schema.json')) as SchemaObject;
const validasi = new Ajv({ strict: true, allErrors: true }).compile(skema);

describe('golden snapshot: JSON episode lengkap dengan dalil (BACKLOG B3, B5)', () => {
  // Semua folder di content/episodes, supaya episode baru otomatis mendapat snapshot.
  test.each(episodeKonten())(
    '$id sama dengan __snapshots__ dan lolos JSON Schema',
    async ({ id, naskah, dalil }) => {
      const { episode, diagnostics } = compileEpisode(bacaRepo(naskah), {
        file: naskah,
        dalil: bacaRepo(dalil),
        dalilFile: dalil,
      });
      expect(diagnostics.filter((d) => d.level === 'error')).toEqual([]);
      expect(validasi(episode), JSON.stringify(validasi.errors)).toBe(true);
      // Perubahan naskah memperbarui snapshot lewat `pnpm test -u`; tinjau diff-nya di PR.
      await expect(`${JSON.stringify(episode, null, 2)}\n`).toMatchFileSnapshot(
        `../__snapshots__/${id}.json`,
      );
    },
  );

  test('compileEpisode mengembalikan null bila ada error', () => {
    const { episode, diagnostics } = compileEpisode(`${FRONT_MATTER_UJI}== a\n-> hilang`, {
      file: 'uji.qs.md',
      dalil: bacaRepo(DALIL.ep01),
      dalilFile: 'dalil.md',
    });
    expect(episode).toBeNull();
    expect(ringkas(diagnostics)).toContain('L2@17: Knot “hilang” tidak ada.');
  });
});

const naskah = (isi: string) => `${FRONT_MATTER_UJI}${isi}`;

describe('emitter', () => {
  test('from hanya ditulis di tampilan grup; gelembung pov menjadi out', () => {
    const { isi, diagnostik } = kompilasi(
      naskah(
        [
          '== a',
          '@view Gilang | G | online | Chat dengan Gilang',
          'Gilang: rak',
          'Raka: apa',
          '@view Sisa UI | S | 12 anggota | Grup Sisa UI',
          'Tika: halo',
          'Raka: [Foto: resi] Udah',
          '-> b',
          '== b',
          'Dimas: tetap grup',
          '-> END',
        ].join('\n'),
      ),
    );
    expect(diagnostik).toEqual([]);
    expect(isi.knots['a']).toEqual([
      {
        t: 'view',
        name: 'Gilang',
        initial: 'G',
        sub: 'online',
        pill: 'Chat dengan Gilang',
        group: false,
      },
      { t: 'in', text: 'rak' },
      { t: 'out', text: 'apa' },
      {
        t: 'view',
        name: 'Sisa UI',
        initial: 'S',
        sub: '12 anggota',
        pill: 'Grup Sisa UI',
        group: true,
      },
      { t: 'in', text: 'halo', from: 'Tika' },
      { t: 'out', text: 'Udah', attach: 'Foto: resi' },
      { t: 'go', to: 'b' },
    ]);
    expect(isi.knots['b']?.[0]).toEqual({ t: 'in', text: 'tetap grup', from: 'Dimas' });
  });

  test('tampilan masuk yang tidak pasti adalah S1', () => {
    const { diagnostik } = kompilasi(
      naskah(
        [
          '== a',
          '@view Gilang | G | online | Chat dengan Gilang',
          '[P] #p1',
          '* Satu -> b #Satu',
          '* Dua -> c #Dua',
          '* Tiga -> c #Tiga',
          '== b',
          '@view Grup | G | 3 anggota | Grup Teman',
          '-> c',
          '== c',
          'Dimas: halo',
          '-> END',
        ].join('\n'),
      ),
    );
    expect(ringkas(diagnostik)).toEqual([
      'S1@26: Knot “c” bisa dimasuki dari tampilan grup maupun bukan grup sebelum @view-nya; tambahkan @view di awal knot.',
    ]);
  });

  test('gelembung masuk sebelum @view pertama adalah S1', () => {
    expect(ringkas(kompilasi(naskah('== a\nGilang: rak\n-> END')).diagnostik)).toEqual([
      'S1@17: Gelembung masuk muncul sebelum @view pertama; tulis @view lebih dulu.',
    ]);
  });

  test('? cond dan blok ?? berisi beberapa baris menjadi baris dengan cond', () => {
    const { isi, diagnostik } = kompilasi(
      naskah(
        [
          '== a',
          '@view Nadia | N | online | Chat dengan Nadia',
          '? !dibaca: @sys Nadia mengetik',
          '?? dibaca',
          '> Kamu tahu.',
          'Nadia: Lu baca?',
          '?? else',
          'Raka: Enggak.',
          '?? end',
          '@set dibaca',
          '-> END',
        ].join('\n'),
      ),
    );
    expect(diagnostik).toEqual([]);
    expect(isi.knots['a']?.slice(1, 5)).toEqual([
      { t: 'sys', text: 'Nadia mengetik', cond: '!dibaca' },
      { t: 'nar', text: 'Kamu tahu.', cond: 'dibaca' },
      { t: 'in', text: 'Lu baca?', cond: 'dibaca' },
      { t: 'out', text: 'Enggak.', cond: '!dibaca' },
    ]);
  });

  test('blok ?? satu cabang berisi satu narasi menjadi nar cases', () => {
    const { isi } = kompilasi(
      naskah(
        ['== a', '@view N | N | online | Chat', '?? dibaca', '> X', '?? end', '-> END'].join('\n'),
      ),
    );
    expect(isi.knots['a']?.[1]).toEqual({ t: 'nar', cases: [{ cond: 'dibaca', text: 'X' }] });
  });

  test('blok ?? dengan dua kondisi dan cabang berbaris banyak adalah S1', () => {
    const { diagnostik } = kompilasi(
      naskah(
        [
          '== a',
          '@view N | N | online | Chat',
          '?? dibaca',
          '> X',
          '> Y',
          '?? menegur',
          '> Z',
          '?? end',
          '-> END',
        ].join('\n'),
      ),
    );
    expect(ringkas(diagnostik)).toEqual([
      'S1@18: Blok ?? dengan lebih dari satu kondisi hanya boleh berisi satu kartu narasi per cabang, karena cond tidak bisa menggabungkan dua kondisi; pecah dengan =>.',
    ]);
  });

  test('peta posisi menunjuk baris sumber, termasuk tiap kasus nar', () => {
    const { posisi } = kompilasi(bacaRepo(NASKAH.ep01));
    expect(posisi['pembuka']?.[0]).toEqual({ line: 33 });
    expect(posisi['pagi']?.find((p) => p.cases !== undefined)).toEqual({
      line: 104,
      cases: [105, 107],
    });
    expect(posisi['akhir_gatau']?.find((p) => p.line === 125)).toEqual({ line: 125 });
    expect(posisi['pembuka']?.find((p) => p.opsi !== undefined)).toEqual({
      line: 43,
      opsi: [44, 45, 46],
    });
  });

  test('urutan key mengikuti §4: in dengan from, cond, dan attach; out dengan cond dan attach', () => {
    const { isi, diagnostik } = kompilasi(
      naskah(
        [
          '== a',
          '@view Teman | T | 3 anggota | Grup Teman',
          '@set dibaca',
          '? dibaca: Tika: [Foto: resi] halo',
          '? dibaca: Raka: [Foto: struk] oke',
          '-> END',
        ].join('\n'),
      ),
    );
    expect(diagnostik).toEqual([]);
    expect(isi.knots['a']?.slice(2, 4).map((l) => JSON.stringify(l))).toEqual([
      '{"t":"in","text":"halo","from":"Tika","cond":"dibaca","attach":"Foto: resi"}',
      '{"t":"out","text":"oke","cond":"dibaca","attach":"Foto: struk"}',
    ]);
  });

  test('tampilan grup terbawa ke knot tujuan =>', () => {
    const { isi, diagnostik } = kompilasi(
      naskah(
        [
          '== a',
          '@view Teman | T | 3 anggota | Grup Teman',
          '@set dibaca',
          '=> dibaca: b | b',
          '== b',
          'Tika: halo',
          '-> END',
        ].join('\n'),
      ),
    );
    expect(diagnostik).toEqual([]);
    expect(isi.knots['b']?.[0]).toEqual({ t: 'in', text: 'halo', from: 'Tika' });
  });
});
