import { fileURLToPath } from 'node:url';
import { Ajv, type SchemaObject } from 'ajv';
import { createGenerator } from 'ts-json-schema-generator';
import { beforeAll, describe, expect, test } from 'vitest';
import type { Episode } from '../src/types.ts';

// schema/episode.schema.json dihasilkan dari src/types.ts (ADR-011). Bila tipe berubah,
// perbarui berkasnya dengan `pnpm test -u` lalu tinjau diff-nya di PR.
const berkas = (relatif: string) =>
  fileURLToPath(new URL(relatif, import.meta.url)).replaceAll('\\', '/');

function buatSkema(): SchemaObject {
  // JSONSchema7 dari generator dan SchemaObject dari ajv sama-sama JSON biasa, tetapi tipenya
  // tidak saling cocok di bawah exactOptionalPropertyTypes.
  const skema: unknown = createGenerator({
    path: berkas('../src/types.ts'),
    tsconfig: berkas('../tsconfig.json'),
    type: 'Episode',
    expose: 'export',
    topRef: true,
    jsDoc: 'basic',
    additionalProperties: false,
    skipTypeCheck: true,
  }).createSchema('Episode');
  return skema as SchemaObject;
}

const EPISODE_MINIMAL: Episode = {
  id: 'ep99',
  nomor: 99,
  judul: 'Contoh',
  pov: 'Raka',
  meta: {
    teaser: 'Teaser.',
    sampul: 'Sampul.',
    durasi_menit: 3,
    rating: '17+',
    refleksi: 'Apa yang kamu lakukan?',
    bagikan: 'Lu bakal gimana?',
    berikutnya: null,
  },
  vars: ['dibaca'],
  start: 'pembuka',
  knots: {
    pembuka: [
      {
        t: 'view',
        name: 'Gilang',
        initial: 'G',
        sub: 'online',
        pill: 'Chat dengan Gilang',
        group: false,
      },
      { t: 'nar', text: 'Malam.' },
      { t: 'nar', cases: [{ cond: 'dibaca', text: 'Sudah.' }, { text: 'Belum.' }] },
      { t: 'in', text: 'rak', cond: '!dibaca' },
      { t: 'out', text: 'apa', attach: 'Foto: resi' },
      { t: 'shot', state: 'contoh' },
      { t: 'set', v: 'dibaca' },
      { t: 'end' },
    ],
  },
  shots: { contoh: { cap: 'Tangkapan layar', lines: [{ from: 'Bram', text: 'Halo' }] } },
  dalil: { status: 'draft', reviewed_by: null, reviewed_at: null, sections: [] },
};

describe('schema/episode.schema.json', () => {
  const skema = buatSkema();
  const ajv = new Ajv({ strict: true, allErrors: true });
  let valid: ReturnType<typeof ajv.compile>;

  beforeAll(() => {
    valid = ajv.compile(skema);
  });

  test('sama dengan hasil generate dari src/types.ts', async () => {
    await expect(`${JSON.stringify(skema, null, 2)}\n`).toMatchFileSnapshot(
      '../schema/episode.schema.json',
    );
  });

  test('lolos meta-skema JSON Schema', () => {
    expect(ajv.validateSchema(skema)).toBe(true);
  });

  test('menerima episode yang sesuai kontrak', () => {
    expect(valid(EPISODE_MINIMAL), ajv.errorsText(valid.errors)).toBe(true);
  });

  test('menolak narasi yang punya text sekaligus cases', () => {
    const rusak = structuredClone(EPISODE_MINIMAL) as unknown as {
      knots: Record<string, Record<string, unknown>[]>;
    };
    rusak.knots['pembuka']?.push({ t: 'nar', text: 'a', cases: [{ text: 'b' }] });
    expect(valid(rusak)).toBe(false);
  });

  test('menolak jenis baris yang tidak dikenal dan key tambahan', () => {
    expect(valid({ ...EPISODE_MINIMAL, knots: { pembuka: [{ t: 'video' }] } })).toBe(false);
    expect(valid({ ...EPISODE_MINIMAL, ekstra: true })).toBe(false);
  });
});
