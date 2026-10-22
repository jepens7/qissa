// BACKLOG C2: semua kombinasi pilihan di setiap episode content/ mencapai end, dan setiap knot dimasuki.
// JSON episode diambil dari golden snapshot packages/script, yang sama persis dengan keluaran
// `qs compile` dan dijaga golden test (ADR-016).
import { readdirSync, readFileSync } from 'node:fs';
import type { Episode } from '@qissa/script/types';
import { describe, expect, test } from 'vitest';
import { createStory, type Step } from '../src/index.ts';

const SNAPSHOT = new URL('../../script/__snapshots__/', import.meta.url);

const EPISODES = readdirSync(SNAPSHOT)
  .filter((f) => /^ep\d+\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, SNAPSHOT), 'utf8')) as Episode);

/** Batas baris terlihat per jalur (SRS §9). */
const BATAS_BARIS = 300;

type Jalur = { path: string[]; terlihat: number; knot: Set<string> };

/** Memainkan episode untuk setiap kombinasi pilihan, dari awal, dengan engine yang sama dengan UI. */
function jelajah(ep: Episode): Jalur[] {
  const hasil: Jalur[] = [];
  const mainkan = (pilihan: number[]) => {
    const story = createStory(ep);
    const knot = new Set<string>();
    let terlihat = 0;
    let ke = 0;
    let langkah: Step = story.next();
    for (;;) {
      knot.add(story.state.knot);
      if (langkah.kind === 'render' || langkah.kind === 'choice') {
        terlihat += 1;
      }
      if (terlihat > BATAS_BARIS) {
        throw new Error(`${ep.id} pilihan ${pilihan.join(',')} melebihi ${BATAS_BARIS} baris`);
      }
      if (langkah.kind === 'end') {
        hasil.push({ path: langkah.path, terlihat, knot });
        return;
      }
      if (langkah.kind === 'wait') {
        throw new Error(`${ep.id} pilihan ${pilihan.join(',')} berhenti tanpa tamat`);
      }
      if (langkah.kind === 'choice') {
        const i = pilihan[ke];
        if (i === undefined) {
          langkah.line.options.forEach((_, j) => {
            mainkan([...pilihan, j]);
          });
          return;
        }
        ke += 1;
        langkah = story.choose(i);
        continue;
      }
      langkah = story.next();
    }
  };
  mainkan([]);
  return hasil;
}

const TAK_TERLIHAT = new Set(['set', 'go', 'branch']);

test('golden snapshot memuat episode di content/', () => {
  expect(EPISODES.map((ep) => ep.id)).toEqual(expect.arrayContaining(['ep01', 'ep02']));
});

describe.each(EPISODES.map((ep) => [ep.id, ep] as const))('%s', (_id, ep) => {
  const jalur = jelajah(ep);

  test('setiap kombinasi pilihan mencapai end dalam 300 baris terlihat', () => {
    expect(jalur.length).toBeGreaterThan(0);
    const nama = jalur.map((j) => j.path.join(' > '));
    expect(new Set(nama).size).toBe(nama.length);
  });

  test('setiap knot dimasuki', () => {
    // Knot yang hanya berisi baris tak terlihat tidak pernah menjadi letak langkah; jangkauannya
    // dijamin L2 saat compile.
    const dimasuki = new Set(jalur.flatMap((j) => [...j.knot]));
    const knotTerlihat = Object.entries(ep.knots)
      .filter(([, baris]) => baris.some((l) => !TAK_TERLIHAT.has(l.t)))
      .map(([nama]) => nama);
    expect(knotTerlihat.filter((k) => !dimasuki.has(k))).toEqual([]);
  });
});
