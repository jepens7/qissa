// Antarmuka publik compiler dan linter (docs/ARCHITECTURE.md §4).
import type { EpisodeAst } from './ast.ts';
import { bentukDalil, parseDalil, type DalilAst } from './dalil.ts';
import { adaError, pengumpul, urutkan, type Diagnostic } from './diagnostics.ts';
import { emitEpisode, type IsiEpisode, type PetaPosisi } from './emit.ts';
import type { DaftarKata } from './kata-terlarang.ts';
import { parseEpisode } from './parse.ts';
import type { Dalil, Episode } from './types.ts';
import { validasiDalil, validasiEpisode } from './validate.ts';
import { walkEpisode } from './walk.ts';

export type OpsiLint = {
  file: string;
  dalilFile: string;
  /** Gerbang produksi: episode yang belum `reviewed` menjadi error L7 (ADR-012). */
  wajibReview?: boolean;
  /** Pengganti daftar kata bawaan; dipakai tes untuk istilah sintetis. */
  daftar?: DaftarKata;
};

export type HasilNaskah = {
  ast: EpisodeAst;
  isi: IsiEpisode;
  posisi: PetaPosisi;
  diagnostik: Diagnostic[];
};

/** Parse, emit, dan validasi episode.qs.md (S1, L1–L6, W1–W4). */
export function periksaNaskah(
  sumber: string,
  opsi: Pick<OpsiLint, 'file' | 'daftar'>,
): HasilNaskah {
  const { daftar, lapor } = pengumpul(opsi.file);
  const ast = parseEpisode(sumber, lapor);
  const { isi, posisi } = emitEpisode(ast, lapor);
  validasiEpisode({ ast, isi, posisi, jalur: walkEpisode(isi) }, lapor, opsi.daftar);
  return { ast, isi, posisi, diagnostik: daftar };
}

/** Parse dan validasi dalil.md (S1, L5, L7). */
export function periksaDalil(
  sumber: string,
  opsi: Pick<OpsiLint, 'dalilFile' | 'wajibReview' | 'daftar'>,
): { ast: DalilAst; diagnostik: Diagnostic[] } {
  const { daftar, lapor } = pengumpul(opsi.dalilFile);
  const ast = parseDalil(sumber, lapor);
  validasiDalil(ast, lapor, {
    wajibReview: opsi.wajibReview ?? false,
    ...(opsi.daftar === undefined ? {} : { daftar: opsi.daftar }),
  });
  return { ast, diagnostik: daftar };
}

/** Semua diagnostik untuk satu episode dan dalil.md-nya, berurutan per berkas dan baris. */
export function lintEpisode(sumber: string, dalil: string, opsi: OpsiLint): Diagnostic[] {
  return urutkan([
    ...periksaNaskah(sumber, opsi).diagnostik,
    ...periksaDalil(dalil, opsi).diagnostik,
  ]);
}

/** dalil.md menjadi struktur Dalil; null bila ada error (docs/DATA-CONTRACTS.md §4). */
export function compileDalil(
  sumber: string,
  opsi: { file: string } & Pick<OpsiLint, 'wajibReview' | 'daftar'>,
): { dalil: Dalil | null; diagnostics: Diagnostic[] } {
  const { ast, diagnostik } = periksaDalil(sumber, { ...opsi, dalilFile: opsi.file });
  return { dalil: adaError(diagnostik) ? null : bentukDalil(ast), diagnostics: diagnostik };
}

/**
 * episode.qs.md dan dalil.md menjadi JSON episode yang disajikan; null bila ada error.
 * Peringatan tidak menghalangi kompilasi.
 */
export function compileEpisode(
  sumber: string,
  opsi: OpsiLint & { dalil: string },
): { episode: Episode | null; diagnostics: Diagnostic[] } {
  const naskah = periksaNaskah(sumber, opsi);
  const dalil = compileDalil(opsi.dalil, { ...opsi, file: opsi.dalilFile });
  const diagnostics = urutkan([...naskah.diagnostik, ...dalil.diagnostics]);
  if (adaError(diagnostics) || dalil.dalil === null) {
    return { episode: null, diagnostics };
  }
  return { episode: { ...naskah.isi, dalil: dalil.dalil }, diagnostics };
}
