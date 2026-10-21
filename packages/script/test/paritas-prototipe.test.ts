// BACKLOG B3: hasil kompilasi ep01 dan ep02 harus menghasilkan urutan baris yang sama dengan objek
// EPISODES di infra/prototype/index.html untuk jalur yang sama. Sisi prototipe dijalankan oleh
// tiruan step() prototipe (test/prototipe.ts), sisi kompilasi oleh walkEpisode: dua implementasi
// terpisah, supaya kesalahan di salah satunya tidak tertutupi.
import { describe, expect, test } from 'vitest';
import type { Line, Shot } from '../src/types.ts';
import { walkEpisode, type ItemTerlihat, type Jalur } from '../src/walk.ts';
import { kompilasi, NASKAH, bacaRepo } from './bantuan.ts';
import {
  episodesPrototipe,
  jalankanPrototipe,
  shotPrototipe,
  type BarisPrototipe,
  type EpisodePrototipe,
  type ShotTampil,
} from './prototipe.ts';

type Tampil = Record<string, unknown>;

const PROTOTIPE = episodesPrototipe();

/**
 * Satu-satunya perbedaan bentuk yang diizinkan, karena QISSA-SCRIPT §4 dan naskah menetapkannya:
 * - `shot.state` berisi nama shot (prototipe memakai `open` dan `comment`);
 * - knot `sebagian_dulu` di naskah ep02 bernama `sebagian` di prototipe;
 * - `view.group` ada di JSON hasil compile, tidak ada di prototipe;
 * - id dan rujukan episode `ep01`/`ep02` (prototipe: `ep1`/`ep2`).
 */
const PASANGAN = [
  { id: 'ep01', proto: 'ep1', naskah: NASKAH.ep01, knot: {}, shot: { 'nadia-bram': 'open' } },
  {
    id: 'ep02',
    proto: 'ep2',
    naskah: NASKAH.ep02,
    knot: { sebagian_dulu: 'sebagian' },
    shot: { 'komentar-penipu': 'comment' },
  },
] as const;

const ID_PROTOTIPE: Record<string, string> = { ep01: 'ep1', ep02: 'ep2' };

function teks(b: Record<string, unknown>, key: string): string {
  const nilai = b[key];
  return typeof nilai === 'string' ? nilai : '';
}

function tampilShot(state: string, shots: Record<string, Shot>): ShotTampil {
  const shot = shots[state];
  if (state === 'closed' || shot === undefined) {
    return { tertutup: true };
  }
  return {
    cap: shot.cap,
    ...(shot.cut === undefined ? {} : { cut: shot.cut }),
    // Prototipe menulis nama pengirim di gelembung kiri dan tidak di gelembung pov (kanan).
    ...(shot.lines === undefined
      ? {}
      : {
          mini: shot.lines.map((l) =>
            l.from === shot.pov
              ? { sisi: 'kanan' as const, teks: l.text }
              : { sisi: 'kiri' as const, teks: `${l.from}: ${l.text}` },
          ),
        }),
    ...(shot.cmt === undefined
      ? {}
      : { komentar: { handle: shot.cmt.handle, teks: shot.cmt.text } }),
  };
}

function normalPrototipe(b: BarisPrototipe): Tampil {
  switch (b.t) {
    case 'view':
      return { t: 'view', name: b['name'], initial: b['initial'], sub: b['sub'], pill: b['pill'] };
    case 'in':
      // Prototipe tidak merender attach di gelembung masuk.
      return { t: 'in', text: b['text'], ...(b['from'] === undefined ? {} : { from: b['from'] }) };
    case 'out':
      return {
        t: 'out',
        text: b['text'],
        ...(b['attach'] === undefined ? {} : { attach: b['attach'] }),
      };
    case 'shot':
      return { t: 'shot', isi: shotPrototipe(teks(b, 'state')) };
    case 'choice':
      return {
        t: 'choice',
        key: b['key'],
        label: b['label'],
        options: (b['options'] as BarisPrototipe[]).map((o) => ({
          text: o['text'],
          name: o['name'],
        })),
      };
    default:
      return { ...b };
  }
}

function normalKompilasi(item: ItemTerlihat, shots: Record<string, Shot>): Tampil {
  switch (item.t) {
    case 'view':
      return { t: 'view', name: item.name, initial: item.initial, sub: item.sub, pill: item.pill };
    case 'shot':
      return { t: 'shot', isi: tampilShot(item.state, shots) };
    default:
      return { ...item };
  }
}

/** Baris JSON hasil compile dalam penamaan prototipe, untuk perbandingan struktur. */
function keNamaPrototipe(
  line: Line,
  knot: Record<string, string>,
  shot: Record<string, string>,
): Tampil {
  const k = (nama: string) => knot[nama] ?? nama;
  switch (line.t) {
    case 'view':
      return { t: line.t, name: line.name, initial: line.initial, sub: line.sub, pill: line.pill };
    case 'shot':
      return { ...line, state: shot[line.state] ?? line.state };
    case 'go':
      return { ...line, to: k(line.to) };
    case 'branch':
      return { ...line, cases: line.cases.map((c) => ({ ...c, to: k(c.to) })) };
    case 'choice':
      return { ...line, options: line.options.map((o) => ({ ...o, go: k(o.go) })) };
    default:
      return { ...line };
  }
}

const KOMBINASI = [0, 1, 2].flatMap((a) => [0, 1, 2].map((b) => [a, b] as const));

describe.each(PASANGAN)('$id dibandingkan dengan EPISODES.$proto di prototipe', (pasangan) => {
  const { isi, diagnostik } = kompilasi(bacaRepo(pasangan.naskah));
  const proto = PROTOTIPE[pasangan.proto] as EpisodePrototipe;
  const jalur = walkEpisode(isi);
  const cariJalur = (nama: readonly string[]): Jalur | undefined =>
    jalur.find((j) => j.pilihan.map((p) => p.name).join(' > ') === nama.join(' > '));

  test('terkompilasi tanpa diagnostik', () => {
    expect(diagnostik).toEqual([]);
  });

  test('jumlah jalur sama: 3 × 3 kombinasi pilihan', () => {
    expect(jalur).toHaveLength(9);
    expect(jalur.every((j) => j.akhir === 'END')).toBe(true);
  });

  test.each(KOMBINASI)('jalur opsi %i lalu %i: urutan yang dilihat pembaca sama', (a, b) => {
    const p = jalankanPrototipe(proto, [a, b]);
    const k = cariJalur(p.pilihan);
    expect(k, `jalur ${p.pilihan.join(' > ')} tidak ditemukan`).toBeDefined();
    expect(k?.langkah.map((l) => normalKompilasi(l.item, isi.shots))).toEqual(
      p.tampil.map(normalPrototipe),
    );
  });

  test.each(KOMBINASI)('jalur opsi %i lalu %i: baris yang dijalankan sama', (a, b) => {
    const p = jalankanPrototipe(proto, [a, b]);
    const k = cariJalur(p.pilihan);
    const baris = (k?.dijalankan ?? []).map((l) => isi.knots[l.knot]?.[l.idx]);
    expect(
      baris.map((l) => (l === undefined ? null : keNamaPrototipe(l, pasangan.knot, pasangan.shot))),
    ).toEqual(p.dijalankan);
  });

  test('meta episode sama', () => {
    expect(isi).toMatchObject({
      nomor: proto.num,
      judul: proto.title,
      start: proto.start,
      meta: {
        teaser: proto.teaser,
        sampul: proto.cover,
        refleksi: proto.question,
        bagikan: proto.share,
      },
    });
    expect(ID_PROTOTIPE[isi.id]).toBe(proto.id);
    expect(isi.meta.berikutnya === null ? null : ID_PROTOTIPE[isi.meta.berikutnya]).toBe(
      proto.next,
    );
  });

  test('isi setiap shot sama dengan yang dirender shot() di prototipe', () => {
    for (const [nama, state] of Object.entries(pasangan.shot)) {
      expect(tampilShot(nama, isi.shots)).toEqual(shotPrototipe(state));
    }
    expect(tampilShot('closed', isi.shots)).toEqual(shotPrototipe('closed'));
  });
});

test('ep01, jalur Tutup → Ketemu dulu: urutan baris persis seperti prototipe (BACKLOG B3)', () => {
  const { isi } = kompilasi(bacaRepo(NASKAH.ep01));
  const proto = PROTOTIPE['ep1'] as EpisodePrototipe;
  const p = jalankanPrototipe(proto, [1, 2]);
  expect(p.pilihan).toEqual(['Tutup', 'Ketemu dulu']);
  const k = walkEpisode(isi).find(
    (j) => j.pilihan.map((x) => x.name).join(' > ') === 'Tutup > Ketemu dulu',
  );
  expect(k?.akhir).toBe('END');
  expect(k?.langkah.map((l) => normalKompilasi(l.item, isi.shots))).toEqual(
    p.tampil.map(normalPrototipe),
  );
  // 49 baris terlihat ditambah penutup END; mencegah dua daftar kosong lolos sebagai "sama".
  expect(k?.langkah).toHaveLength(50);
});
