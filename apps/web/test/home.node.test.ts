// BACKLOG D5: nama pendek opsi poll di id.json sama dengan nama opsi p1 ep01, supaya catatan poll di layar
// akhir cocok. JSON episode dari golden snapshot packages/script (ADR-016); urutan kunci poll yang dipakai
// home diuji di komponen.test.tsx.
import { readFileSync } from 'node:fs';
import type { Episode } from '@qissa/script/types';
import { expect, test } from 'vitest';

const bacaJson = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('nama opsi poll sama dengan opsi p1 ep01 di golden snapshot', () => {
  const ep01 = bacaJson('../../../packages/script/__snapshots__/ep01.json') as Episode;
  const pesan = bacaJson('../src/i18n/id.json') as Record<string, string>;
  const p1 = Object.values(ep01.knots)
    .flat()
    .find((l) => l.t === 'choice' && l.key === 'p1');
  const awalan = 'home.poll.opsi.';
  expect(
    Object.keys(pesan)
      .filter((k) => k.startsWith(awalan))
      .map((k) => k.slice(awalan.length)),
  ).toEqual(p1?.t === 'choice' ? p1.options.map((o) => o.name) : null);
});
