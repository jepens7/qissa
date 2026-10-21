import { readdirSync, readFileSync } from 'node:fs';
import { pengumpul, type Diagnostic } from '../src/diagnostics.ts';
import type { EpisodeAst } from '../src/ast.ts';
import { emitEpisode, type IsiEpisode, type PetaPosisi } from '../src/emit.ts';
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

/** Setiap folder di content/episodes: id dari awalan folder, beserta path naskah dan dalil.md-nya. */
export function episodeKonten(): { id: string; naskah: string; dalil: string }[] {
  return readdirSync(new URL('../../../content/episodes/', import.meta.url), {
    withFileTypes: true,
  })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((folder) => ({
      id: folder.split('-')[0] ?? folder,
      naskah: `content/episodes/${folder}/episode.qs.md`,
      dalil: `content/episodes/${folder}/dalil.md`,
    }));
}

export function parse(sumber: string): { ast: EpisodeAst; diagnostik: Diagnostic[] } {
  const { daftar, lapor } = pengumpul('uji.qs.md');
  const ast = parseEpisode(sumber, lapor);
  return { ast, diagnostik: daftar };
}

/** Parse lalu emit; diagnostik dari keduanya digabung. */
export function kompilasi(sumber: string): {
  ast: EpisodeAst;
  isi: IsiEpisode;
  posisi: PetaPosisi;
  diagnostik: Diagnostic[];
} {
  const { daftar, lapor } = pengumpul('uji.qs.md');
  const ast = parseEpisode(sumber, lapor);
  const { isi, posisi } = emitEpisode(ast, lapor);
  return { ast, isi, posisi, diagnostik: daftar };
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
