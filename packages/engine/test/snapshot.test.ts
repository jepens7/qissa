// BACKLOG C3: restore p2 lalu memilih opsi lain menghasilkan akhir berbeda, dengan `rendered` yang benar.
// Item di sini meniru daftar yang dipegang UI: setiap langkah render dan choice menjadi satu item,
// dan restore memotong daftar itu ke `rendered` (ARCHITECTURE §5).
import { readFileSync } from 'node:fs';
import type { Episode } from '@qissa/script/types';
import { expect, test } from 'vitest';
import { createStory, type Step, type Story } from '../src/index.ts';

const EP01 = JSON.parse(
  readFileSync(new URL('../../script/__snapshots__/ep01.json', import.meta.url), 'utf8'),
) as Episode;

type Item = Exclude<Step, { kind: 'typing' | 'end' | 'wait' }>;

/** Lanjutkan cerita dengan pilihan berurutan; setiap blok pilihan di-snapshot dengan kuncinya. */
function mainkan(story: Story, item: Item[], pilihan: number[], awal?: Step): string[] {
  let langkah = awal ?? story.next();
  for (;;) {
    if (langkah.kind === 'render') {
      item.push(langkah);
    } else if (langkah.kind === 'choice') {
      item.push(langkah);
      story.snapshot(langkah.line.key);
      const i = pilihan.shift();
      if (i === undefined) {
        return [];
      }
      langkah = story.choose(i);
      continue;
    } else if (langkah.kind === 'end') {
      return langkah.path;
    } else if (langkah.kind === 'wait') {
      throw new Error('cerita berhenti tanpa tamat');
    }
    langkah = story.next();
  }
}

test('restore p2 lalu memilih opsi lain: akhir berbeda, rendered dan item sama dengan jalur baru', () => {
  const story = createStory(EP01);
  const item: Item[] = [];
  expect(mainkan(story, item, [1, 0])).toEqual(['Tutup', 'Ga tau']);

  expect(story.restore('p2')).toBe(true);
  const sebelumPilihan = item.findIndex((i) => i.kind === 'choice' && i.line.key === 'p2');
  expect(story.state).toMatchObject({
    rendered: sebelumPilihan,
    path: ['Tutup'],
    waiting: false,
    ended: false,
  });
  item.length = story.state.rendered;

  // Blok pilihan p2 muncul lagi, lalu opsi lain membawa ke akhir berbeda.
  expect(mainkan(story, item, [1])).toEqual(['Tutup', 'Cerita semuanya']);

  // Hasilnya sama persis dengan memainkan jalur itu dari awal: variabel, header, dan item pulih.
  const segar: Item[] = [];
  expect(mainkan(createStory(EP01), segar, [1, 1])).toEqual(['Tutup', 'Cerita semuanya']);
  expect(item).toEqual(segar);
});

test('restore p1 setelah tamat memulai ulang dari pilihan pertama dengan variabel yang benar', () => {
  const story = createStory(EP01);
  const item: Item[] = [];
  mainkan(story, item, [0, 2]);
  expect(story.state.vars).toMatchObject({ dibaca: true });

  expect(story.restore('p1')).toBe(true);
  expect(story.state.vars).toEqual({});
  item.length = story.state.rendered;
  expect(mainkan(story, item, [2, 2])).toEqual(['Tegur', 'Ketemu dulu']);

  const segar: Item[] = [];
  mainkan(createStory(EP01), segar, [2, 2]);
  expect(item).toEqual(segar);
});

test('restore dengan kunci yang belum disimpan mengembalikan false tanpa mengubah state', () => {
  const story = createStory(EP01);
  story.next();
  const sebelum = story.state;
  expect(story.restore('p2')).toBe(false);
  expect(story.state).toEqual(sebelum);
});
