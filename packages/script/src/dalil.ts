// Pembaca dalil.md (docs/QISSA-SCRIPT.md §5): front matter, bagian `##`, dan entri `###`, dibaca per
// baris dengan nomor baris. compileDalil membentuk struktur Dalil (docs/DATA-CONTRACTS.md §4) darinya.
import type { Lapor } from './diagnostics.ts';
import { bacaFrontMatter, type FieldFrontMatter, type SpesifikasiKey } from './front-matter.ts';
import type { Dalil, DalilLineKind, DalilSectionKind } from './types.ts';

export const KEY_DALIL: Readonly<Record<string, SpesifikasiKey>> = {
  status: { teksBebas: false },
  reviewed_by: { teksBebas: false },
  reviewed_at: { teksBebas: false },
};

/** Judul bagian yang sah dan jenisnya, dalam urutan baku kartu (SRS DLL-1); yang lain ditolak. */
export const JUDUL_BAGIAN: Readonly<Record<string, DalilSectionKind>> = {
  Riwayat: 'riwayat',
  Ayat: 'ayat',
  Hadis: 'hadis',
  Catatan: 'catatan',
  'Ulama berbeda': 'ikhtilaf',
  'Hukum negara': 'hukum',
};

export type BarisDalilAst = { text: string; line: number };
export type EntriDalilAst = { line: number; title?: BarisDalilAst; lines: BarisDalilAst[] };
export type BagianDalilAst = { kind: DalilSectionKind; line: number; entries: EntriDalilAst[] };
export type DalilAst = {
  frontMatter: Map<string, FieldFrontMatter>;
  /** Baris berkas apa adanya, untuk aturan yang memindai teks. */
  baris: string[];
  bagian: BagianDalilAst[];
};

const BOM = String.fromCharCode(0xfeff);

/**
 * Baris terakhir entri yang menjadi rujukan: diawali "HR", "Terjemahan", atau "Sumber", atau memuat
 * kata "HR" (mis. "Bagian dari hadis Jibril, HR Muslim no. 8, sahih").
 */
export function adalahRujukan(teks: string): boolean {
  return /^(Terjemahan|Sumber)\b/.test(teks) || /\bHR\b/.test(teks);
}

/**
 * Baris Arab: memuat huruf Arab dan tidak memuat huruf Latin. Harakat dan tanda waqaf tidak ikut
 * menentukan, karena sebagian berskrip Inherited atau Common di Unicode.
 */
export function adalahArab(teks: string): boolean {
  return /\p{Script=Arabic}/u.test(teks) && !/\p{Script=Latin}/u.test(teks);
}

function jenisBaris(teks: string, terakhir: boolean): DalilLineKind {
  if (adalahArab(teks)) {
    return 'arab';
  }
  return terakhir && adalahRujukan(teks) ? 'rujukan' : 'teks';
}

function teksFrontMatter(field: FieldFrontMatter | undefined): string | null {
  return field?.nilai.kind === 'teks' ? field.nilai.teks : null;
}

const URUTAN_BAGIAN: readonly DalilSectionKind[] = Object.values(JUDUL_BAGIAN);

/**
 * Struktur Dalil (docs/DATA-CONTRACTS.md §4) dari AST; bagian tanpa entri dihilangkan, dan bagian diurutkan
 * menurut urutan baku kartu apa pun urutannya di berkas.
 */
export function bentukDalil(ast: DalilAst): Dalil {
  const fm = ast.frontMatter;
  return {
    status: teksFrontMatter(fm.get('status')) === 'reviewed' ? 'reviewed' : 'draft',
    reviewed_by: teksFrontMatter(fm.get('reviewed_by')),
    reviewed_at: teksFrontMatter(fm.get('reviewed_at')),
    sections: ast.bagian
      .filter((b) => b.entries.length > 0)
      .sort((a, b) => URUTAN_BAGIAN.indexOf(a.kind) - URUTAN_BAGIAN.indexOf(b.kind))
      .map((b) => ({
        kind: b.kind,
        entries: b.entries.map((e) => ({
          ...(e.title === undefined ? {} : { title: e.title.text }),
          lines: e.lines.map((l, i) => ({
            kind: jenisBaris(l.text, i === e.lines.length - 1),
            text: l.text,
          })),
        })),
      })),
  };
}

export function parseDalil(sumber: string, lapor: Lapor): DalilAst {
  const baris = (sumber.startsWith(BOM) ? sumber.slice(1) : sumber).split(/\r?\n/);
  const fm = bacaFrontMatter(baris, KEY_DALIL, lapor);
  const bagian: BagianDalilAst[] = [];
  let sekarang: BagianDalilAst | null = null;
  // Sesudah satu kesalahan struktur, isi sampai judul ## berikutnya dilewati tanpa diagnostik tambahan.
  let lewati = false;

  for (let i = fm.awalIsi; i < baris.length; i++) {
    const line = i + 1;
    const teks = (baris[i] ?? '').trim();
    if (teks === '') {
      continue;
    }

    const judulBagian = /^##\s+(.+)$/.exec(teks);
    if (judulBagian !== null && !teks.startsWith('###')) {
      const judul = (judulBagian[1] ?? '').trim();
      const kind = Object.hasOwn(JUDUL_BAGIAN, judul) ? JUDUL_BAGIAN[judul] : undefined;
      if (kind === undefined) {
        lapor(
          'S1',
          line,
          `Judul bagian “${judul}” tidak dikenal; pakai Riwayat, Ayat, Hadis, Catatan, Ulama berbeda, atau Hukum negara.`,
        );
        sekarang = null;
        lewati = true;
        continue;
      }
      if (bagian.some((b) => b.kind === kind)) {
        lapor('S1', line, `Bagian “${judul}” ditulis dua kali.`);
      }
      sekarang = { kind, line, entries: [] };
      bagian.push(sekarang);
      lewati = false;
      continue;
    }
    if (lewati) {
      continue;
    }

    const judulEntri = /^###\s+(.+)$/.exec(teks);
    if (judulEntri !== null) {
      if (sekarang === null) {
        lapor('S1', line, 'Entri ### harus berada di bawah judul bagian ##.');
        lewati = true;
        continue;
      }
      sekarang.entries.push({
        line,
        title: { text: (judulEntri[1] ?? '').trim(), line },
        lines: [],
      });
      continue;
    }
    if (teks.startsWith('#')) {
      lapor(
        'S1',
        line,
        `Judul “${teks}” tidak dikenal; pakai ## untuk bagian dan ### untuk entri.`,
      );
      continue;
    }
    if (sekarang === null) {
      lapor('S1', line, 'Teks dalil harus berada di bawah judul bagian ##.');
      lewati = true;
      continue;
    }
    let entri = sekarang.entries[sekarang.entries.length - 1];
    if (entri === undefined) {
      entri = { line, lines: [] };
      sekarang.entries.push(entri);
    }
    entri.lines.push({ text: teks, line });
  }

  return { frontMatter: fm.fields, baris, bagian };
}
