// Emitter: AST naskah menjadi JSON episode (docs/QISSA-SCRIPT.md §4). Dalil ditambahkan compileEpisode.
// Urutan key di setiap objek mengikuti urutan pada src/types.ts; key opsional yang tidak berlaku tidak ditulis.
import type {
  CabangKondisi,
  EpisodeAst,
  KnotAst,
  Pernyataan,
  PernyataanKondisiBlok,
} from './ast.ts';
import type { Lapor } from './diagnostics.ts';
import type { FieldFrontMatter } from './front-matter.ts';
import type { TokenBersyarat, TokenSederhana } from './tokenize.ts';
import {
  FORMAT_EPISODE,
  type ChoiceLine,
  type Cond,
  type Episode,
  type Line,
  type NarCase,
  type Shot,
} from './types.ts';

/** Episode tanpa dalil; dalil digabungkan compileEpisode. */
export type IsiEpisode = Omit<Episode, 'dalil'>;

/**
 * Baris sumber tiap baris JSON; `cases` berisi baris sumber tiap kasus `nar` dari blok `??`, dan
 * `opsi` baris sumber tiap opsi blok pilihan.
 */
export type PosisiBaris = { line: number; cases?: number[]; opsi?: number[] };

/** Posisi sumber per knot, sejajar dengan `knots` di JSON. Tidak ikut ke JSON yang disajikan. */
export type PetaPosisi = Record<string, PosisiBaris[]>;

type JenisTampilan = 'grup' | 'tunggal' | 'belum-ada';

const POLA_GRUP = /^Grup\b/;

function teks(field: FieldFrontMatter | undefined): string {
  return field?.nilai.kind === 'teks' ? field.nilai.teks : '';
}

function bilangan(field: FieldFrontMatter | undefined): number {
  const nilai = teks(field);
  return /^[1-9][0-9]*$/.test(nilai) ? Number(nilai) : 0;
}

function negasi(cond: Cond): Cond {
  return cond.startsWith('!') ? cond.slice(1) : `!${cond}`;
}

function tujuan(p: Pernyataan): string[] {
  switch (p.kind) {
    case 'go':
      return [p.to];
    case 'branch':
      return p.cases.map((c) => c.to);
    case 'pilihan':
      return p.opsi.map((o) => o.to);
    default:
      return [];
  }
}

/**
 * Jenis tampilan aktif saat tiap knot dimasuki, dari semua jalur (fixpoint atas perpindahan).
 * Knot yang tidak terjangkau mendapat himpunan kosong.
 */
function tampilanMasuk(knots: readonly KnotAst[]): Map<string, Set<JenisTampilan>> {
  const masuk = new Map(knots.map((k) => [k.name, new Set<JenisTampilan>()]));
  const perNama = new Map(knots.map((k) => [k.name, k]));
  const awal = knots[0];
  if (awal === undefined) {
    return masuk;
  }
  masuk.get(awal.name)?.add('belum-ada');
  const antrean = [awal.name];
  while (antrean.length > 0) {
    const nama = antrean.pop() ?? '';
    const knot = perNama.get(nama);
    let aktif = new Set(masuk.get(nama));
    for (const p of knot?.isi ?? []) {
      if (p.kind === 'baris' && p.token.kind === 'view') {
        aktif = new Set([POLA_GRUP.test(p.token.pill) ? 'grup' : 'tunggal']);
      }
      for (const ke of tujuan(p)) {
        const himpunan = masuk.get(ke);
        if (himpunan === undefined) {
          continue;
        }
        const ukuran = himpunan.size;
        aktif.forEach((j) => himpunan.add(j));
        if (himpunan.size > ukuran) {
          antrean.push(ke);
        }
      }
    }
  }
  return masuk;
}

/** Mengubah AST menjadi isi episode beserta peta posisi sumbernya. */
export function emitEpisode(
  ast: EpisodeAst,
  lapor: Lapor,
): { isi: IsiEpisode; posisi: PetaPosisi } {
  const fm = ast.frontMatter;
  const pov = teks(fm.get('pov'));
  const varsFm = fm.get('vars')?.nilai;
  const masuk = tampilanMasuk(ast.knots);

  const knots: Record<string, Line[]> = {};
  const posisi: PetaPosisi = {};

  for (const knot of ast.knots) {
    const baris: Line[] = [];
    const pos: PosisiBaris[] = [];
    let aktif = masuk.get(knot.name) ?? new Set<JenisTampilan>();
    let tampilanDilaporkan = false;

    const tambah = (line: Line, posisiBaris: PosisiBaris) => {
      baris.push(line);
      pos.push(posisiBaris);
    };

    /** `from` untuk gelembung masuk: hanya di tampilan grup; tampilan yang tidak pasti adalah S1. */
    const pengirim = (token: TokenBersyarat): string | undefined => {
      if (token.kind !== 'ucapan' || token.speaker === pov || aktif.size === 0) {
        return undefined;
      }
      if (aktif.size === 1 && aktif.has('grup')) {
        return token.speaker;
      }
      if (aktif.size === 1 && aktif.has('tunggal')) {
        return undefined;
      }
      if (!tampilanDilaporkan) {
        tampilanDilaporkan = true;
        lapor(
          'S1',
          token.line,
          aktif.has('belum-ada')
            ? 'Gelembung masuk muncul sebelum @view pertama; tulis @view lebih dulu.'
            : `Knot “${knot.name}” bisa dimasuki dari tampilan grup maupun bukan grup sebelum @view-nya; tambahkan @view di awal knot.`,
        );
      }
      return undefined;
    };

    const bersyarat = (token: TokenBersyarat, cond: Cond | undefined): Line => {
      const syarat = cond === undefined ? {} : { cond };
      switch (token.kind) {
        case 'nar':
          return { t: 'nar', text: token.text, ...syarat };
        case 'sys':
          return { t: 'sys', text: token.text, ...syarat };
        case 'ucapan': {
          const lampiran = token.attach === undefined ? {} : { attach: token.attach };
          if (token.speaker === pov) {
            return { t: 'out', text: token.text, ...syarat, ...lampiran };
          }
          const from = pengirim(token);
          return {
            t: 'in',
            text: token.text,
            ...(from === undefined ? {} : { from }),
            ...syarat,
            ...lampiran,
          };
        }
      }
    };

    const sederhana = (token: TokenSederhana): Line => {
      switch (token.kind) {
        case 'view':
          aktif = new Set([POLA_GRUP.test(token.pill) ? 'grup' : 'tunggal']);
          return {
            t: 'view',
            name: token.name,
            initial: token.initial,
            sub: token.sub,
            pill: token.pill,
            group: POLA_GRUP.test(token.pill),
          };
        case 'typing':
          return { t: 'typing' };
        case 'shot':
          return { t: 'shot', state: token.state };
        case 'notif':
          return { t: 'notif', app: token.app, text: token.text, time: token.time };
        case 'bank':
          return { t: 'bank', amount: token.amount, from: token.from };
        case 'set':
          return { t: 'set', v: token.v };
        default:
          return bersyarat(token, undefined);
      }
    };

    const blokKondisi = (blok: PernyataanKondisiBlok) => {
      const satuNarasi = blok.cabang.every((c) => c.isi.length === 1 && c.isi[0]?.kind === 'nar');
      if (satuNarasi) {
        const cases: NarCase[] = blok.cabang.map((c) => ({
          ...(c.cond === null ? {} : { cond: c.cond }),
          text: c.isi[0]?.text ?? '',
        }));
        tambah(
          { t: 'nar', cases },
          { line: blok.line, cases: blok.cabang.map((c) => c.isi[0]?.line ?? c.line) },
        );
        return;
      }
      const berkondisi = blok.cabang.filter(
        (c): c is CabangKondisi & { cond: string } => c.cond !== null,
      );
      const pertama = berkondisi[0];
      if (berkondisi.length !== 1 || pertama === undefined) {
        lapor(
          'S1',
          blok.line,
          'Blok ?? dengan lebih dari satu kondisi hanya boleh berisi satu kartu narasi per cabang, karena cond tidak bisa menggabungkan dua kondisi; pecah dengan =>.',
        );
        return;
      }
      for (const cabang of blok.cabang) {
        const cond = cabang.cond ?? negasi(pertama.cond);
        for (const token of cabang.isi) {
          tambah(bersyarat(token, cond), { line: token.line });
        }
      }
    };

    for (const p of knot.isi) {
      switch (p.kind) {
        case 'baris':
          tambah(sederhana(p.token), { line: p.token.line });
          break;
        case 'kondisi-baris':
          tambah(bersyarat(p.token, p.cond), { line: p.line });
          break;
        case 'kondisi-blok':
          blokKondisi(p);
          break;
        case 'pilihan': {
          const choice: ChoiceLine = {
            t: 'choice',
            key: p.key,
            label: p.label,
            options: p.opsi.map((o) => ({ text: o.text, go: o.to, name: o.name ?? '' })),
          };
          tambah(choice, { line: p.line, opsi: p.opsi.map((o) => o.line) });
          break;
        }
        case 'go':
          tambah({ t: 'go', to: p.to }, { line: p.line });
          break;
        case 'end':
          tambah({ t: 'end' }, { line: p.line });
          break;
        case 'branch':
          tambah(
            {
              t: 'branch',
              cases: p.cases.map((c) => ({
                ...(c.cond === null ? {} : { cond: c.cond }),
                to: c.to,
              })),
            },
            { line: p.line },
          );
          break;
      }
    }

    knots[knot.name] = baris;
    posisi[knot.name] = pos;
  }

  const shots: Record<string, Shot> = {};
  for (const s of ast.shots) {
    shots[s.name] = {
      cap: s.cap?.text ?? '',
      ...(s.cut === undefined ? {} : { cut: s.cut.text }),
      ...(s.pov === undefined ? {} : { pov: s.pov.text }),
      ...(s.lines.length === 0
        ? {}
        : { lines: s.lines.map((l) => ({ from: l.from, text: l.text })) }),
      ...(s.cmt === undefined ? {} : { cmt: { handle: s.cmt.handle, text: s.cmt.text } }),
    };
  }

  const berikutnya = teks(fm.get('berikutnya'));
  const isi: IsiEpisode = {
    format: FORMAT_EPISODE,
    id: teks(fm.get('id')),
    nomor: bilangan(fm.get('nomor')),
    judul: teks(fm.get('judul')),
    pov,
    meta: {
      teaser: teks(fm.get('teaser')),
      sampul: teks(fm.get('sampul')),
      durasi_menit: bilangan(fm.get('durasi_menit')),
      rating: teks(fm.get('rating')),
      refleksi: teks(fm.get('refleksi')),
      bagikan: teks(fm.get('bagikan')),
      berikutnya: berikutnya === '' ? null : berikutnya,
    },
    vars: varsFm?.kind === 'daftar' ? [...varsFm.isi] : [],
    start: ast.knots[0]?.name ?? '',
    knots,
    shots,
  };
  return { isi, posisi };
}
