// CLAUDE.md: nama aplikasi judi dan nominal taruhan dilarang muncul di konten maupun kode, termasuk
// fixture test. `qs lint` memeriksa content/; tes ini memeriksa sisa repo dengan pencocok yang sama.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { HASH_NAMA_APLIKASI_JUDI, KATA_TARUHAN } from '../src/forbidden.ts';
import { adaNamaAplikasi, adaNominalTaruhan } from '../src/kata-terlarang.ts';

const AKAR = fileURLToPath(new URL('../../../', import.meta.url));

/** Folder yang dilewati di mana pun letaknya. */
const LEWATI_NAMA = new Set(['node_modules', '.git', 'dist', 'coverage']);

/**
 * Path dari akar yang dilewati: naskah (diperiksa `qs lint`), hasil compile-nya, dan berkas kunci pnpm
 * yang dibangkitkan dan memuat hash acak.
 */
const LEWATI_PATH = new Set(['content', 'apps/web/public/content', 'pnpm-lock.yaml']);

/** Semua berkas di bawah `akar`, kecuali yang dilewati. */
function berkas(akar: string, dir = akar): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (LEWATI_NAMA.has(e.name) || LEWATI_PATH.has(relative(akar, path).replaceAll('\\', '/'))) {
      return [];
    }
    return e.isDirectory() ? berkas(akar, path) : [path];
  });
}

/** Isi berkas teks; null untuk berkas biner (gambar, font), dikenali dari byte nol. */
function teks(path: string): string | null {
  const isi = readFileSync(path);
  return isi.subarray(0, 8000).includes(0) ? null : isi.toString('utf8');
}

function temuan(akar: string): string[] {
  const hash = new Set(HASH_NAMA_APLIKASI_JUDI);
  return berkas(akar).flatMap((path) =>
    (teks(path) ?? '')
      .split('\n')
      .flatMap((baris, i) =>
        adaNamaAplikasi(baris, hash) || adaNominalTaruhan(baris, KATA_TARUHAN)
          ? [`${relative(akar, path).replaceAll('\\', '/')}:${String(i + 1)}`]
          : [],
      ),
  );
}

test('tidak ada nama aplikasi judi atau nominal taruhan di luar content/', () => {
  expect(temuan(AKAR)).toEqual([]);
});

test('pemindai melewati content/ di akar saja dan membaca berkas teks apa pun ekstensinya', () => {
  // Pemicu nominal dibangun saat tes berjalan supaya tidak tertulis di berkas ini.
  const pemicu = `${KATA_TARUHAN[1] ?? ''} ${String(5 * 10_000)}`;
  const akar = mkdtempSync(join(tmpdir(), 'qissa-pindai-'));
  try {
    const tulis = (path: string, isi: string | Buffer) => {
      mkdirSync(join(akar, path, '..'), { recursive: true });
      writeFileSync(join(akar, path), isi);
    };
    tulis('content/naskah.md', pemicu);
    tulis('apps/web/public/content/ep01.json', pemicu);
    tulis('packages/x/test/content/fixture.ts', pemicu);
    tulis('apps/web/.env.example', pemicu);
    tulis('infra/nginx.conf', pemicu);
    tulis('alat/skrip.mjs', pemicu);
    tulis(
      'gambar.png',
      Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0]), Buffer.from(pemicu)]),
    );
    expect(temuan(akar).sort()).toEqual([
      'alat/skrip.mjs:1',
      'apps/web/.env.example:1',
      'infra/nginx.conf:1',
      'packages/x/test/content/fixture.ts:1',
    ]);
  } finally {
    rmSync(akar, { recursive: true, force: true });
  }
});
