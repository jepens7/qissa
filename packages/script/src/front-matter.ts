// Front matter dalam subset YAML yang dibaca sama oleh YAML 1.2 (docs/QISSA-SCRIPT.md §1 dan §5).
// Bentuk di luar subset ditolak dengan S1, bukan ditafsirkan diam-diam. Satu kesalahan dilaporkan
// sekali: baris lanjutan milik key yang ditolak ikut dilewati.
import type { Lapor } from './diagnostics.ts';

export type NilaiFrontMatter =
  { kind: 'teks'; teks: string } | { kind: 'daftar'; isi: string[] } | { kind: 'kosong' };

export type FieldFrontMatter = { key: string; line: number; nilai: NilaiFrontMatter };

export type SpesifikasiKey = {
  /**
   * Teks bebas yang dibaca pembaca (judul, teaser, …). Di sini ` #` dianggap bagian teks yang
   * akan dipotong YAML, jadi ditolak; di key lain ` #` adalah awal komentar.
   */
  teksBebas: boolean;
  /** Nilainya daftar `[a, b]` (hanya `vars`). */
  daftar?: boolean;
  /** Nilainya bilangan (`nomor`, `durasi_menit`); tidak boleh ditulis sebagai blok `|`. */
  angka?: boolean;
};

export type HasilFrontMatter = {
  fields: Map<string, FieldFrontMatter>;
  /** Indeks (mulai 0) baris pertama sesudah front matter. */
  awalIsi: number;
};

/** Karakter yang punya arti khusus bila mengawali nilai YAML biasa. */
const AWALAN_KHUSUS_YAML = '-?:,[]{}#&*!|>\'"%@`';

/** Nilai biasa yang dibaca skema inti YAML 1.2 sebagai null, boolean, atau angka, bukan teks. */
const BUKAN_TEKS_YAML: [RegExp, string][] = [
  [/^(null|Null|NULL|~)$/, 'null'],
  [/^(true|True|TRUE|false|False|FALSE)$/, 'boolean'],
  [/^[-+]?[0-9]+$|^0o[0-7]+$|^0x[0-9a-fA-F]+$/, 'angka'],
  [
    /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$|^[-+]?\.(inf|Inf|INF)$|^\.(nan|NaN|NAN)$/,
    'angka',
  ],
];

function adalahPembatas(baris: string): boolean {
  return /^---(\s+#.*)?\s*$/.test(baris);
}

function berindentasi(baris: string): boolean {
  return baris.trim() !== '' && baris !== baris.trimStart();
}

/** Indeks baris pertama mulai `mulai` yang tidak berindentasi; baris kosong ikut dilewati. */
function lewatiLanjutan(baris: readonly string[], mulai: number, akhir: number): number {
  let i = mulai;
  while (i < akhir && ((baris[i] ?? '').trim() === '' || berindentasi(baris[i] ?? ''))) {
    i++;
  }
  return i;
}

/** Membaca front matter di awal `baris`; `keys` adalah daftar key yang sah beserta sifatnya. */
export function bacaFrontMatter(
  baris: readonly string[],
  keys: Readonly<Record<string, SpesifikasiKey>>,
  lapor: Lapor,
): HasilFrontMatter {
  const fields = new Map<string, FieldFrontMatter>();
  const buka = baris.findIndex((b) => b.trim() !== '');
  if (buka === -1 || !adalahPembatas(baris[buka] ?? '')) {
    lapor('S1', 1, 'Berkas harus diawali front matter yang dibuka dan ditutup dengan ---.');
    return { fields, awalIsi: 0 };
  }
  if (buka > 0) {
    lapor('S1', 1, 'Front matter harus dibuka dengan --- di baris pertama.');
  }

  const tutup = baris.findIndex((b, i) => i > buka && adalahPembatas(b));
  let akhir = tutup;
  if (tutup === -1) {
    lapor('S1', buka + 1, 'Front matter tidak ditutup dengan ---.');
    // Baris naskah pertama menjadi batasnya, supaya knot dan shot sesudahnya tetap terbaca.
    akhir = baris.findIndex((b, i) => i > buka && /^(==|:::)/.test(b.trim()));
    if (akhir === -1) {
      akhir = baris.length;
    }
  }

  for (let i = buka + 1; i < akhir; i++) {
    if ((baris[i] ?? '').includes('\t')) {
      lapor('S1', i + 1, 'Front matter tidak boleh memakai tab.');
    }
  }

  for (let i = buka + 1; i < akhir; i++) {
    const mentah = (baris[i] ?? '').replaceAll('\t', ' ');
    const nomor = i + 1;
    const rapi = mentah.trim();
    if (rapi === '' || rapi.startsWith('#')) {
      continue;
    }
    /** Melaporkan S1 untuk baris ini; mengembalikan indeks terakhir lanjutannya. */
    const tolak = (pesan: string): number => {
      lapor('S1', nomor, pesan);
      return lewatiLanjutan(baris, i + 1, akhir) - 1;
    };
    if (berindentasi(mentah)) {
      i = tolak(`Baris front matter tidak boleh diawali spasi: “${rapi}”.`);
      continue;
    }
    const cocok = /^([^\s:]+):(.*)$/.exec(mentah);
    if (cocok === null) {
      i = tolak(`Baris front matter tidak dikenali: “${rapi}”.`);
      continue;
    }
    const key = cocok[1] ?? '';
    const sisa = cocok[2] ?? '';
    const spesifikasi = Object.hasOwn(keys, key) ? keys[key] : undefined;
    if (spesifikasi === undefined) {
      i = tolak(`Key “${key}” tidak dikenal di front matter.`);
      continue;
    }
    if (fields.has(key)) {
      i = tolak(`Key “${key}” ditulis dua kali di front matter.`);
      continue;
    }
    if (sisa !== '' && !sisa.startsWith(' ')) {
      i = tolak(`Setelah “${key}:” harus ada spasi.`);
      continue;
    }

    const nilaiMentah = sisa.trim();
    if (/^[|>]/.test(nilaiMentah)) {
      const blok = bacaBlok(baris, i + 1, akhir);
      if (!/^\|(\s+#.*)?$/.test(nilaiMentah)) {
        lapor('S1', nomor, `Blok “${key}” hanya boleh ditulis “|” tanpa indikator tambahan.`);
      } else if (spesifikasi.daftar === true) {
        lapor('S1', nomor, `“${key}” harus ditulis sebagai daftar, misalnya [dibaca, menegur].`);
      } else if (spesifikasi.angka === true) {
        lapor('S1', nomor, `“${key}” harus ditulis langsung sebagai bilangan, bukan blok |.`);
      }
      fields.set(key, {
        key,
        line: nomor,
        nilai: blok.teks === '' ? { kind: 'kosong' } : { kind: 'teks', teks: blok.teks },
      });
      i = blok.berikutnya - 1;
      continue;
    }

    // Objek, bukan boolean: TypeScript tidak melacak perubahan dari dalam laporKey.
    const status = { dilaporkan: false };
    const laporKey = (pesan: string) => {
      status.dilaporkan = true;
      lapor('S1', nomor, pesan);
    };
    const tanpaKomentar = buangKomentar(key, nilaiMentah, spesifikasi, laporKey);
    const nilai = bacaNilai(key, tanpaKomentar, spesifikasi, laporKey, status.dilaporkan);
    fields.set(key, { key, line: nomor, nilai });

    // YAML membolehkan nilai biasa berlanjut ke baris berindentasi; subset ini tidak.
    const lanjut = lewatiLanjutan(baris, i + 1, akhir);
    if (lanjut > i + 1 && baris.slice(i + 1, lanjut).some(berindentasi)) {
      if (!status.dilaporkan) {
        lapor('S1', nomor, `Nilai “${key}” berlanjut ke baris berikutnya; tulis sebagai blok |.`);
      }
      i = lanjut - 1;
    }
  }

  return { fields, awalIsi: tutup === -1 ? akhir : tutup + 1 };
}

function buangKomentar(
  key: string,
  nilai: string,
  spesifikasi: SpesifikasiKey,
  laporKey: (pesan: string) => void,
): string {
  // `nilai` sudah dipangkas, padahal di berkas selalu ada spasi sesudah titik dua; pagar di awal
  // nilai juga awal komentar (`reviewed_by:   # nama pereview`).
  const denganSpasi = ` ${nilai}`;
  const posisi = denganSpasi.indexOf(' #');
  if (posisi === -1) {
    return nilai;
  }
  if (spesifikasi.teksBebas) {
    laporKey(
      `Nilai “${key}” memuat “ #”, yang dibaca YAML sebagai awal komentar; tulis sebagai blok |.`,
    );
    return nilai;
  }
  return denganSpasi.slice(0, posisi).trim();
}

/** `sudahDilaporkan`: baris ini sudah mendapat S1, jadi pemeriksaan bentuk teks dilewati. */
function bacaNilai(
  key: string,
  nilai: string,
  spesifikasi: SpesifikasiKey,
  laporKey: (pesan: string) => void,
  sudahDilaporkan: boolean,
): NilaiFrontMatter {
  if (nilai === '') {
    return { kind: 'kosong' };
  }
  if (spesifikasi.daftar === true) {
    if (!nilai.startsWith('[')) {
      laporKey(`“${key}” harus ditulis sebagai daftar, misalnya [dibaca, menegur].`);
      return { kind: 'daftar', isi: [nilai] };
    }
    if (!nilai.endsWith(']')) {
      laporKey(`Daftar “${key}” harus ditutup dengan ].`);
      return { kind: 'daftar', isi: [] };
    }
    const dalam = nilai.slice(1, -1).trim();
    const isi = dalam === '' ? [] : dalam.split(',').map((s) => s.trim());
    if (isi.some((s) => s === '')) {
      laporKey(`Daftar “${key}” memuat item kosong.`);
    }
    return { kind: 'daftar', isi: isi.filter((s) => s !== '') };
  }

  const awal = nilai[0] ?? '';
  const jenisYaml =
    spesifikasi.angka === true
      ? undefined
      : BUKAN_TEKS_YAML.find(([pola]) => pola.test(nilai))?.[1];
  if (sudahDilaporkan) {
    return { kind: 'teks', teks: nilai };
  }
  if (AWALAN_KHUSUS_YAML.includes(awal)) {
    laporKey(
      `Nilai “${key}” diawali “${awal}”, yang punya arti khusus di YAML; tulis sebagai blok |.`,
    );
  } else if (nilai.endsWith(':')) {
    laporKey(`Nilai “${key}” diakhiri “:”, yang tidak sah di YAML; tulis sebagai blok |.`);
  } else if (nilai.includes(': ')) {
    laporKey(`Nilai “${key}” memuat “: ”, yang tidak sah di YAML; tulis sebagai blok |.`);
  } else if (jenisYaml === 'null') {
    laporKey(
      `Nilai “${key}” dibaca YAML sebagai null, bukan teks; kosongkan nilainya bila maksudnya kosong.`,
    );
  } else if (jenisYaml !== undefined) {
    laporKey(`Nilai “${key}” dibaca YAML sebagai ${jenisYaml}, bukan teks; tulis sebagai blok |.`);
  }
  return { kind: 'teks', teks: nilai };
}

/** Blok literal `|`: baris berindentasi sesudah key; newline di akhir blok dipangkas. */
function bacaBlok(
  baris: readonly string[],
  mulai: number,
  akhir: number,
): { teks: string; berikutnya: number } {
  const isi: string[] = [];
  let indentasi: number | null = null;
  let i = mulai;
  for (; i < akhir; i++) {
    const mentah = (baris[i] ?? '').replaceAll('\t', ' ');
    if (mentah.trim() === '') {
      isi.push('');
      continue;
    }
    const spasi = mentah.length - mentah.trimStart().length;
    indentasi ??= spasi;
    if (spasi === 0 || spasi < indentasi) {
      break;
    }
    isi.push(mentah.slice(indentasi));
  }
  while (isi.length > 0 && isi[isi.length - 1] === '') {
    isi.pop();
  }
  return { teks: isi.join('\n'), berikutnya: i };
}
