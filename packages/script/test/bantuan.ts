import { readFileSync } from 'node:fs';
import { pengumpul, type Diagnostic } from '../src/diagnostics.ts';
import type { EpisodeAst } from '../src/ast.ts';
import { parseEpisode } from '../src/parse.ts';

/** Membaca berkas relatif dari akar repo. */
export function bacaRepo(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
}

export const NASKAH = {
  ep01: 'content/episodes/ep01-tangkapan-layar/episode.qs.md',
  ep02: 'content/episodes/ep02-transferan-nyasar/episode.qs.md',
} as const;

export const DALIL = {
  ep01: 'content/episodes/ep01-tangkapan-layar/dalil.md',
  ep02: 'content/episodes/ep02-transferan-nyasar/dalil.md',
} as const;

export function parse(sumber: string): { ast: EpisodeAst; diagnostik: Diagnostic[] } {
  const { daftar, lapor } = pengumpul('uji.qs.md');
  const ast = parseEpisode(sumber, lapor);
  return { ast, diagnostik: daftar };
}

/** Ringkasan diagnostik `kode@baris: pesan` supaya kegagalan tes mudah dibaca. */
export function ringkas(daftar: readonly Diagnostic[]): string[] {
  return daftar.map((d) => `${d.code}@${d.line}: ${d.message}`);
}

/** Front matter episode yang lengkap, untuk naskah uji kecil. */
export const FRONT_MATTER_UJI = `---
id: ep99
nomor: 99
judul: Uji
pov: Raka
durasi_menit: 3
rating: 17+
teaser: Teaser uji.
sampul: Sampul uji.
refleksi: Apa yang kamu lakukan?
bagikan: |
  Lu bakal gimana?
berikutnya:
vars: [dibaca]
---
`;
