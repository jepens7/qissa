// Pohon sintaks naskah hasil parse, lengkap dengan nomor baris untuk diagnostik.
import type { FieldFrontMatter } from './front-matter.ts';
import type { KasusCabang, TokenBersyarat, TokenOpsi, TokenSederhana } from './tokenize.ts';

/** Satu cabang blok `??`; `cond` null untuk `?? else`. */
export type CabangKondisi = { line: number; cond: string | null; isi: TokenBersyarat[] };

export type PernyataanBaris = { kind: 'baris'; token: TokenSederhana };
export type PernyataanKondisiBaris = {
  kind: 'kondisi-baris';
  line: number;
  cond: string;
  token: TokenBersyarat;
};
export type PernyataanKondisiBlok = {
  kind: 'kondisi-blok';
  line: number;
  cabang: CabangKondisi[];
};
export type PernyataanPilihan = {
  kind: 'pilihan';
  line: number;
  label: string;
  key: string;
  opsi: TokenOpsi[];
};
export type PernyataanGo = { kind: 'go'; line: number; to: string };
export type PernyataanEnd = { kind: 'end'; line: number };
export type PernyataanBranch = { kind: 'branch'; line: number; cases: KasusCabang[] };

export type Pernyataan =
  | PernyataanBaris
  | PernyataanKondisiBaris
  | PernyataanKondisiBlok
  | PernyataanPilihan
  | PernyataanGo
  | PernyataanEnd
  | PernyataanBranch;

/** Pernyataan yang menutup knot: sesudahnya tidak boleh ada baris lain (L2). */
export function adalahPenutup(p: Pernyataan): boolean {
  return p.kind === 'go' || p.kind === 'end' || p.kind === 'branch' || p.kind === 'pilihan';
}

export type KnotAst = { name: string; line: number; isi: Pernyataan[] };

export type TeksBerbaris = { text: string; line: number };

export type ShotAst = {
  name: string;
  line: number;
  cap?: TeksBerbaris;
  cut?: TeksBerbaris;
  pov?: TeksBerbaris;
  lines: { from: string; text: string; line: number }[];
  cmt?: { handle: string; text: string; line: number };
};

export type EpisodeAst = {
  frontMatter: Map<string, FieldFrontMatter>;
  /** Baris berkas apa adanya (CRLF sudah dinormalkan), untuk aturan yang memindai teks. */
  baris: string[];
  shots: ShotAst[];
  knots: KnotAst[];
};
