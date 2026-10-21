// Validator aturan L1–L7 dan W1–W4 (docs/QISSA-SCRIPT.md §6). S1 dilaporkan parser dan emitter.
// Aturan per jalur (L2, L4, W1, W3) memakai walkEpisode; nomor baris diambil dari peta posisi emitter.
import { adalahPenutup, type EpisodeAst, type Pernyataan } from './ast.ts';
import { adalahRujukan, type DalilAst } from './dalil.ts';
import type { Lapor } from './diagnostics.ts';
import type { IsiEpisode, PetaPosisi } from './emit.ts';
import type { FieldFrontMatter } from './front-matter.ts';
import {
  DAFTAR_BAWAAN,
  periksaKataKetuaan,
  periksaKataTerlarang,
  type DaftarKata,
} from './kata-terlarang.ts';
import { KEY_EPISODE } from './parse.ts';
import type { TokenBersyarat } from './tokenize.ts';
import { BATAS_JALUR, panjang, terhitung, type Jalur, type Letak } from './walk.ts';

const MAKS_KATA_OPSI = 8;
const MAKS_TYPING = 2;
const MAKS_NARASI_BERUNTUN = 2;
const MAKS_KARAKTER_GELEMBUNG = 160;
const MAKS_BARIS_JALUR = 220;

export type MasukanValidasi = {
  ast: EpisodeAst;
  isi: IsiEpisode;
  posisi: PetaPosisi;
  jalur: Jalur[];
};

export function namaJalur(jalur: Jalur): string {
  return jalur.pilihan.length === 0
    ? '(tanpa pilihan)'
    : jalur.pilihan.map((p) => p.name).join(' > ');
}

function barisPernyataan(p: Pernyataan): number {
  return p.kind === 'baris' ? p.token.line : p.line;
}

function barisLetak(posisi: PetaPosisi, letak: Letak, cadangan: number): number {
  const pos = posisi[letak.knot]?.[letak.idx];
  if (pos === undefined) {
    return cadangan;
  }
  if (letak.opsi !== undefined) {
    return pos.opsi?.[letak.opsi] ?? pos.line;
  }
  return letak.kasus === undefined ? pos.line : (pos.cases?.[letak.kasus] ?? pos.line);
}

/** Pelapor yang menelan diagnostik kembar (jalur berbeda sering menunjuk baris yang sama). */
function laporSekali(lapor: Lapor): Lapor {
  const sudah = new Set<string>();
  return (code, line, message) => {
    const kunci = `${code}|${line}|${message}`;
    if (!sudah.has(kunci)) {
      sudah.add(kunci);
      lapor(code, line, message);
    }
  };
}

function teksField(field: FieldFrontMatter | undefined): string {
  return field?.nilai.kind === 'teks' ? field.nilai.teks : '';
}

/** Semua token gelembung, narasi, dan sys beserta kondisinya, dari semua bentuk pernyataan. */
function tokenBersyarat(ast: EpisodeAst): TokenBersyarat[] {
  return ast.knots.flatMap((k) =>
    k.isi.flatMap((p): TokenBersyarat[] => {
      switch (p.kind) {
        case 'baris':
          return p.token.kind === 'nar' || p.token.kind === 'ucapan' || p.token.kind === 'sys'
            ? [p.token]
            : [];
        case 'kondisi-baris':
          return [p.token];
        case 'kondisi-blok':
          return p.cabang.flatMap((c) => c.isi);
        default:
          return [];
      }
    }),
  );
}

/** L1: tepat tiga opsi, nama pendek wajib dan unik dalam blok, teks opsi maksimal delapan kata. */
function cekPilihan(ast: EpisodeAst, lapor: Lapor) {
  for (const knot of ast.knots) {
    for (const p of knot.isi) {
      if (p.kind !== 'pilihan') {
        continue;
      }
      if (p.opsi.length !== 3) {
        lapor(
          'L1',
          p.line,
          `Blok pilihan #${p.key} punya ${p.opsi.length} opsi; harus tepat tiga.`,
        );
      }
      const nama = new Set<string>();
      for (const opsi of p.opsi) {
        if (opsi.name === null) {
          lapor('L1', opsi.line, 'Opsi tidak punya #NamaPendek.');
        } else if (nama.has(opsi.name)) {
          lapor(
            'L1',
            opsi.line,
            `Nama pendek “${opsi.name}” dipakai dua kali di blok pilihan #${p.key}.`,
          );
        } else {
          nama.add(opsi.name);
        }
        const jumlahKata = opsi.text.split(/\s+/).filter((k) => k !== '').length;
        if (jumlahKata > MAKS_KATA_OPSI) {
          lapor('L1', opsi.line, `Teks opsi ${jumlahKata} kata; maksimal delapan.`);
        }
      }
    }
  }
}

/** L2: setiap knot punya penutup dan tidak ada baris sesudahnya; rujukan knot dan shot ada. */
function cekStruktur(ast: EpisodeAst, lapor: Lapor) {
  const knots = new Set(ast.knots.map((k) => k.name));
  const shots = new Set(ast.shots.map((s) => s.name));
  const cekKnot = (nama: string, line: number) => {
    if (!knots.has(nama)) {
      lapor('L2', line, `Knot “${nama}” tidak ada.`);
    }
  };

  for (const knot of ast.knots) {
    const penutup = knot.isi.findIndex(adalahPenutup);
    const sesudah = knot.isi[penutup + 1];
    const tutup = knot.isi[penutup];
    if (penutup === -1) {
      lapor(
        'L2',
        knot.line,
        `Knot “${knot.name}” tidak punya penutup; akhiri dengan ->, =>, blok pilihan, atau -> END.`,
      );
    } else if (sesudah !== undefined && tutup !== undefined) {
      lapor(
        'L2',
        barisPernyataan(sesudah),
        `Baris ini tidak akan pernah dibaca: knot “${knot.name}” sudah ditutup di baris ${barisPernyataan(tutup)}.`,
      );
    }

    for (const p of knot.isi) {
      if (p.kind === 'go') {
        cekKnot(p.to, p.line);
      } else if (p.kind === 'branch') {
        p.cases.forEach((c) => {
          cekKnot(c.to, p.line);
        });
      } else if (p.kind === 'pilihan') {
        p.opsi.forEach((o) => {
          cekKnot(o.to, o.line);
        });
      } else if (p.kind === 'baris' && p.token.kind === 'shot') {
        const state = p.token.state;
        if (state !== 'closed' && !shots.has(state)) {
          lapor(
            'L2',
            p.token.line,
            `Shot “${state}” tidak didefinisikan; tulis blok “::: shot ${state}”.`,
          );
        }
      }
    }
  }
}

/** L2 (jangkauan, akhir jalur), L4, W1, dan W3: aturan yang dihitung per jalur. */
function cekJalur(m: MasukanValidasi, lapor: Lapor) {
  const { ast, isi, posisi, jalur } = m;
  if (ast.knots.length === 0) {
    lapor('L2', 1, 'Naskah belum punya knot; tulis “== nama” untuk knot awal.');
    return;
  }
  const awal = ast.knots[0]?.line ?? 1;

  // Jalur yang terpotong batas tidak mewakili semua knot, jadi jangkauan hanya diperiksa bila lengkap.
  if (!jalur.some((j) => j.akhir === 'batas')) {
    const dimasuki = new Set(jalur.flatMap((j) => j.masuk));
    for (const knot of ast.knots) {
      if (!dimasuki.has(knot.name)) {
        lapor('L2', knot.line, `Knot “${knot.name}” tidak pernah dicapai dari knot awal.`);
      }
    }
  }

  // Beberapa jalur sering melewati masalah yang sama; laporkan sekali per lokasi, dengan nama jalur
  // pertama yang menemukannya.
  const sudah = new Set<string>();
  const laporPerLokasi = (kunci: string, ...args: Parameters<Lapor>) => {
    if (!sudah.has(kunci)) {
      sudah.add(kunci);
      lapor(...args);
    }
  };

  for (const j of jalur) {
    const nama = namaJalur(j);
    const lineBerhenti = j.berhenti === undefined ? awal : barisLetak(posisi, j.berhenti, awal);
    if (j.akhir === 'putar') {
      laporPerLokasi(
        `putar|${lineBerhenti}`,
        'L2',
        lineBerhenti,
        `Jalur “${nama}” kembali ke knot “${j.putarKe ?? ''}” dengan nilai variabel yang sama, jadi bisa berputar tanpa pernah sampai -> END.`,
      );
    }
    if (j.akhir === 'panjang') {
      laporPerLokasi(
        `panjang|${lineBerhenti}`,
        'L2',
        lineBerhenti,
        `Jalur “${nama}” melebihi 300 baris terlihat sebelum sampai -> END.`,
      );
    }
    if (j.akhir === 'batas') {
      laporPerLokasi(
        'batas',
        'L2',
        awal,
        `Episode punya lebih dari ${String(BATAS_JALUR)} jalur, jadi penjelajahan dihentikan; satu episode berisi dua titik pilihan.`,
      );
    }
    if (j.akhir === 'buntu' && j.berhenti !== undefined) {
      // Knot yang tidak ada dan knot tanpa penutup sudah dilaporkan cekStruktur.
      const baris = Object.hasOwn(isi.knots, j.berhenti.knot)
        ? isi.knots[j.berhenti.knot]
        : undefined;
      if (baris !== undefined && j.berhenti.idx < baris.length) {
        laporPerLokasi(
          `buntu|${lineBerhenti}`,
          'L2',
          lineBerhenti,
          `Jalur “${nama}” berhenti di sini tanpa sampai -> END.`,
        );
      }
    }

    const typing = j.langkah.filter((l) => l.item.t === 'typing');
    const ketiga = typing[MAKS_TYPING];
    if (ketiga !== undefined) {
      const line = barisLetak(posisi, ketiga, awal);
      laporPerLokasi(
        `typing|${line}`,
        'L4',
        line,
        `@typing muncul ${typing.length} kali di jalur “${nama}”; maksimal dua.`,
      );
    }

    let rangkaian: number[] = [];
    const tutupRangkaian = () => {
      const ketigaNar = rangkaian[MAKS_NARASI_BERUNTUN];
      if (ketigaNar !== undefined) {
        laporPerLokasi(
          `narasi|${rangkaian.join(',')}`,
          'W1',
          ketigaNar,
          `${rangkaian.length} kartu narasi berturut-turut di jalur “${nama}” (baris ${rangkaian.join(', ')}); maksimal dua.`,
        );
      }
      rangkaian = [];
    };
    for (const l of j.langkah) {
      if (l.item.t === 'nar') {
        rangkaian.push(barisLetak(posisi, l, awal));
      } else if (terhitung(l.item) || l.item.t === 'end') {
        tutupRangkaian();
      }
    }
    tutupRangkaian();
  }

  // Jalur yang tidak sampai END sudah menjadi error L2; W3 hanya untuk jalur yang tamat.
  const terpanjang = jalur
    .filter((j) => j.akhir === 'END')
    .reduce<Jalur | undefined>(
      (maks, j) => (maks === undefined || panjang(j) > panjang(maks) ? j : maks),
      undefined,
    );
  if (terpanjang !== undefined && panjang(terpanjang) > MAKS_BARIS_JALUR) {
    lapor(
      'W3',
      awal,
      `Jalur terpanjang (“${namaJalur(terpanjang)}”) ${panjang(terpanjang)} baris terlihat; usahakan paling banyak 220.`,
    );
  }
}

/** L3: variabel yang dipakai ada di vars, dan variabel di vars pernah di-@set. */
function cekVariabel(ast: EpisodeAst, lapor: Lapor) {
  const varsFm = ast.frontMatter.get('vars');
  const daftar = varsFm?.nilai.kind === 'daftar' ? varsFm.nilai.isi : [];
  const lineVars = varsFm?.line ?? 1;
  const dideklarasikan = new Set<string>();
  for (const v of daftar) {
    if (dideklarasikan.has(v)) {
      lapor('L3', lineVars, `Variabel “${v}” ditulis dua kali di vars.`);
    }
    dideklarasikan.add(v);
  }

  const diset = new Set<string>();
  const pakai = (cond: string, line: number) => {
    const nama = cond.startsWith('!') ? cond.slice(1) : cond;
    if (!dideklarasikan.has(nama)) {
      lapor('L3', line, `Variabel “${nama}” tidak ada di vars.`);
    }
  };
  for (const knot of ast.knots) {
    for (const p of knot.isi) {
      if (p.kind === 'baris' && p.token.kind === 'set') {
        diset.add(p.token.v);
        pakai(p.token.v, p.token.line);
      } else if (p.kind === 'kondisi-baris') {
        pakai(p.cond, p.line);
      } else if (p.kind === 'kondisi-blok') {
        p.cabang.forEach((c) => {
          if (c.cond !== null) {
            pakai(c.cond, c.line);
          }
        });
      } else if (p.kind === 'branch') {
        p.cases.forEach((c) => {
          if (c.cond !== null) {
            pakai(c.cond, p.line);
          }
        });
      }
    }
  }
  for (const v of dideklarasikan) {
    if (!diset.has(v)) {
      lapor('L3', lineVars, `Variabel “${v}” ada di vars tetapi tidak pernah di-@set.`);
    }
  }
}

/** Satu kalimat yang diakhiri “?”; kutipan di dalamnya dan elipsis tidak dihitung sebagai akhir. */
function satuKalimatTanya(teks: string): boolean {
  const tanpaKutipan = teks.replace(/“[^”]*”|‘[^’]*’|"[^"]*"/g, '“”').replace(/\.{3}/g, '…');
  return tanpaKutipan.endsWith('?') && !/[.!?]["”’)]*\s/.test(tanpaKutipan.slice(0, -1));
}

/** L6: front matter lengkap dan bernilai benar; refleksi dan bagikan sesuai aturan. */
function cekFrontMatter(ast: EpisodeAst, lapor: Lapor) {
  const fm = ast.frontMatter;
  for (const key of Object.keys(KEY_EPISODE)) {
    const field = fm.get(key);
    if (field === undefined) {
      lapor('L6', 1, `Front matter belum memuat “${key}”.`);
      continue;
    }
    if (field.nilai.kind === 'kosong') {
      if (key !== 'berikutnya') {
        lapor('L6', field.line, `“${key}” kosong.`);
      }
      continue;
    }
    if (key === 'vars') {
      if (field.nilai.kind !== 'daftar') {
        lapor('L6', field.line, '“vars” harus berupa daftar, misalnya [dibaca, menegur].');
      }
      continue;
    }
    if (field.nilai.kind !== 'teks') {
      lapor('L6', field.line, `“${key}” harus berupa teks, bukan daftar.`);
      continue;
    }
    const nilai = field.nilai.teks;
    if ((key === 'id' || key === 'berikutnya') && !/^ep\d{2,}$/.test(nilai)) {
      lapor('L6', field.line, `“${key}” harus berbentuk epNN, misalnya ep01, bukan “${nilai}”.`);
    }
    if ((key === 'nomor' || key === 'durasi_menit') && !/^[1-9][0-9]*$/.test(nilai)) {
      lapor('L6', field.line, `“${key}” harus bilangan bulat positif, bukan “${nilai}”.`);
    }
    if (key === 'refleksi' && !satuKalimatTanya(nilai)) {
      lapor('L6', field.line, '“refleksi” harus satu kalimat tanya yang diakhiri “?”.');
    }
    if (key === 'bagikan' && /pilih|jalur/i.test(nilai)) {
      lapor(
        'L6',
        field.line,
        '“bagikan” tidak boleh memuat “pilih” atau “jalur”: teks bagikan tidak pernah membawa pilihan pembaca.',
      );
    }
  }
}

/** W2: teks gelembung paling banyak 160 karakter; label lampiran tidak dihitung. */
function cekGelembung(ast: EpisodeAst, lapor: Lapor) {
  for (const token of tokenBersyarat(ast)) {
    if (token.kind !== 'ucapan') {
      continue;
    }
    const karakter = Array.from(token.text).length;
    if (karakter > MAKS_KARAKTER_GELEMBUNG) {
      lapor(
        'W2',
        token.line,
        `Gelembung ${karakter} karakter; usahakan paling banyak 160 (dua baris di layar HP).`,
      );
    }
  }
}

/** L5 (dan W4 bila `ketuaan`) untuk setiap baris berkas. */
export function cekTeks(
  baris: readonly string[],
  lapor: Lapor,
  daftar: DaftarKata,
  ketuaan: boolean,
) {
  baris.forEach((teks, i) => {
    const temuan = [
      ...periksaKataTerlarang(teks, daftar),
      ...(ketuaan ? periksaKataKetuaan(teks, daftar) : []),
    ];
    for (const t of temuan) {
      lapor(t.code, i + 1, t.message);
    }
  });
}

/** Aturan L1–L6 dan W1–W4 untuk satu episode. */
export function validasiEpisode(
  m: MasukanValidasi,
  lapor: Lapor,
  daftar: DaftarKata = DAFTAR_BAWAAN,
) {
  const sekali = laporSekali(lapor);
  cekPilihan(m.ast, sekali);
  cekStruktur(m.ast, sekali);
  cekJalur(m, sekali);
  cekVariabel(m.ast, sekali);
  cekFrontMatter(m.ast, sekali);
  cekGelembung(m.ast, sekali);
  cekTeks(m.ast.baris, sekali, daftar, true);
}

/** L7 (dan L5) untuk dalil.md. */
export function validasiDalil(
  d: DalilAst,
  lapor: Lapor,
  opsi: { wajibReview: boolean; daftar?: DaftarKata },
) {
  const fm = d.frontMatter;
  const status = fm.get('status');
  const statusTeks = teksField(status);
  if (status === undefined) {
    lapor('L7', 1, 'Front matter dalil.md belum memuat “status”.');
  } else if (statusTeks !== 'draft' && statusTeks !== 'reviewed') {
    lapor('L7', status.line, '“status” harus draft atau reviewed.');
  }

  const tanggal = fm.get('reviewed_at');
  const tanggalTeks = teksField(tanggal);
  if (tanggal !== undefined && tanggalTeks !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(tanggalTeks)) {
    lapor('L7', tanggal.line, '“reviewed_at” harus berformat YYYY-MM-DD.');
  }
  if (statusTeks === 'reviewed') {
    for (const key of ['reviewed_by', 'reviewed_at']) {
      if (teksField(fm.get(key)) === '') {
        lapor(
          'L7',
          fm.get(key)?.line ?? status?.line ?? 1,
          `status: reviewed, tetapi “${key}” kosong.`,
        );
      }
    }
  }
  if (opsi.wajibReview && statusTeks !== 'reviewed') {
    lapor(
      'L7',
      status?.line ?? 1,
      `Episode belum direview ulama (status: ${statusTeks || 'kosong'}); gerbang produksi --wajib-review menolaknya.`,
    );
  }

  const dalil = d.bagian.filter((b) => b.kind === 'ayat' || b.kind === 'hadis');
  const adaRujukan = dalil.some((b) =>
    b.entries.some((e) => {
      const terakhir = e.lines[e.lines.length - 1];
      return terakhir !== undefined && adalahRujukan(terakhir.text);
    }),
  );
  if (!adaRujukan) {
    lapor(
      'L7',
      dalil[0]?.line ?? 1,
      'dalil.md belum punya ayat atau hadis dengan rujukan (baris terakhir entri yang diawali “HR”, “Terjemahan”, atau “Sumber”).',
    );
  }

  cekTeks(d.baris, lapor, opsi.daftar ?? DAFTAR_BAWAAN, false);
}
