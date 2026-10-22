// BACKLOG D3: ep01 dan ep02 bisa ditamatkan di semua jalur lewat logika pemutar yang dipakai UI.
// JSON episode dari golden snapshot packages/script (ADR-016).
import { readFileSync } from 'node:fs';
import { createStory, type Story } from '@qissa/engine';
import type { Episode } from '@qissa/script/types';
import { describe, expect, test } from 'vitest';
import {
  jumlahPilihan,
  ketuk,
  pilih,
  tandai,
  ulangDari,
  type Hasil,
  type Item,
} from '../src/features/reader/langkah.ts';

const baca = (id: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../../../packages/script/__snapshots__/${id}.json`, import.meta.url),
      'utf8',
    ),
  ) as Episode;

type Akhir = { path: string[]; ketukan: number; items: Item[] };

/** Main seperti pembaca: ketuk sampai pilihan atau tamat; typing berlanjut sendiri. */
function mainkan(story: Story, pilihan: number[]): Akhir {
  let items: Item[] = [];
  let ketukan = 0;
  const sisa = [...pilihan];
  for (;;) {
    let h: Hasil = ketuk(story, items);
    ketukan += 1;
    for (;;) {
      expect(h.items).toHaveLength(story.state.rendered);
      // Tidak ada ketukan yang berhenti di pil view: pil selalu diikuti baris berikutnya.
      const terakhir = h.items.at(-1);
      expect(terakhir?.jenis === 'baris' && terakhir.line.t === 'view').toBe(false);
      if (h.henti.kind === 'typing') {
        h = ketuk(story, h.items);
        continue;
      }
      if (h.henti.kind === 'choice') {
        const i = sisa.shift();
        if (i === undefined) {
          throw new Error('pilihan habis sebelum tamat');
        }
        h = pilih(story, tandai(h.items, i), i);
        continue;
      }
      break;
    }
    items = h.items;
    if (h.henti.kind === 'end') {
      return { path: h.henti.path, ketukan, items };
    }
    if (h.henti.kind === 'wait') {
      throw new Error('pemutar berhenti tanpa tamat');
    }
  }
}

describe.each(['ep01', 'ep02'])('%s', (id) => {
  const ep = baca(id);

  test('semua jalur bisa ditamatkan', () => {
    const akhir = new Set<string>();
    for (const a of [0, 1, 2]) {
      for (const b of [0, 1, 2]) {
        const hasil = mainkan(createStory(ep), [a, b]);
        expect(hasil.path).toHaveLength(2);
        akhir.add(hasil.path.join(' > '));
      }
    }
    expect(akhir.size).toBe(9);
  });

  test('ulang dari pilihan 2: blok pilihan yang sama muncul lagi, belum dipilih', () => {
    const story = createStory(ep);
    const { items } = mainkan(story, [0, 0]);
    const potong = ulangDari(story, items, 'p2');
    expect(potong).not.toBeNull();
    const h = ketuk(story, potong ?? []);
    expect(h.henti.kind).toBe('choice');
    expect(h.items.at(-1)).toMatchObject({ jenis: 'pilihan', dipilih: null, line: { key: 'p2' } });
    expect(h.items).toHaveLength(story.state.rendered);
  });

  test('dua titik pilihan untuk teks sampul', () => {
    expect(jumlahPilihan(ep.knots)).toBe(2);
  });
});

test('ulangDari kunci yang belum disimpan: null', () => {
  const story = createStory(baca('ep01'));
  expect(ulangDari(story, [], 'p2')).toBeNull();
});
