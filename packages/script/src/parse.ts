// Parser episode.qs.md: front matter, blok shot, knot, blok `??`, kondisional `?`, dan blok pilihan
// (docs/QISSA-SCRIPT.md §1–§3). Kesalahan sintaks dilaporkan sebagai S1; parser jalan terus supaya
// semua masalah terlihat dalam satu kali lint. Aturan L1–L7 dan W1–W4 diperiksa validator.
import type {
  EpisodeAst,
  KnotAst,
  PernyataanKondisiBlok,
  PernyataanPilihan,
  ShotAst,
} from './ast.ts';
import type { Lapor } from './diagnostics.ts';
import { bacaFrontMatter, type SpesifikasiKey } from './front-matter.ts';
import { tokenize, type Token, type TokenBersyarat } from './tokenize.ts';

/** Key front matter episode; teks bebas tidak boleh memuat ` #` (§1). */
export const KEY_EPISODE: Readonly<Record<string, SpesifikasiKey>> = {
  id: { teksBebas: false },
  nomor: { teksBebas: false, angka: true },
  judul: { teksBebas: true },
  pov: { teksBebas: false },
  durasi_menit: { teksBebas: false, angka: true },
  rating: { teksBebas: false },
  teaser: { teksBebas: true },
  sampul: { teksBebas: true },
  refleksi: { teksBebas: true },
  bagikan: { teksBebas: true },
  berikutnya: { teksBebas: false },
  vars: { teksBebas: false, daftar: true },
};

const NAMA_KNOT = /^[a-z][a-z0-9_]*$/;
const NAMA_SHOT = /^[a-z][a-z0-9_-]*$/;
const KUNCI_PILIHAN = /^[A-Za-z0-9_]+$/;
const NAMA_TERLARANG = new Set(['constructor', 'prototype', '__proto__', 'else', 'end']);
const BOM = String.fromCharCode(0xfeff);

/** Memeriksa nama knot atau variabel; true bila sah. */
export function cekNama(jenis: 'knot' | 'variabel', nama: string, line: number, lapor: Lapor) {
  if (!NAMA_KNOT.test(nama)) {
    lapor(
      'S1',
      line,
      `Nama ${jenis} “${nama}” harus huruf kecil, angka, atau garis bawah, dan diawali huruf.`,
    );
    return false;
  }
  if (NAMA_TERLARANG.has(nama)) {
    lapor('S1', line, `“${nama}” tidak boleh dipakai sebagai nama ${jenis}.`);
    return false;
  }
  return true;
}

function cekKondisi(cond: string, line: number, lapor: Lapor) {
  cekNama('variabel', cond.startsWith('!') ? cond.slice(1) : cond, line, lapor);
}

export function bersyarat(token: Token): token is TokenBersyarat {
  return token.kind === 'nar' || token.kind === 'ucapan' || token.kind === 'sys';
}

function bacaBarisShot(shot: ShotAst, baris: string, line: number, lapor: Lapor) {
  const key = /^(cap|cut|pov|cmt):\s+(.+)$/.exec(baris);
  if (key !== null) {
    const nama = key[1] as 'cap' | 'cut' | 'pov' | 'cmt';
    const nilai = (key[2] ?? '').trim();
    if (shot[nama] !== undefined) {
      lapor('S1', line, `“${nama}” ditulis dua kali di shot “${shot.name}”.`);
      return;
    }
    if (nama === 'cmt') {
      const bagian = nilai.split('|').map((s) => s.trim());
      const [handle = '', text = ''] = bagian;
      if (bagian.length !== 2 || handle === '' || text === '') {
        lapor('S1', line, 'cmt ditulis “cmt: handle | teks”.');
        return;
      }
      shot.cmt = { handle, text, line };
      return;
    }
    shot[nama] = { text: nilai, line };
    return;
  }
  // Di dalam shot hanya ada cap, cut, pov, cmt, dan baris chat `Nama: teks` (§3); baris berawalan
  // naskah tidak boleh lolos sebagai chat hanya karena teksnya kebetulan memuat “: ”.
  const pisah = baris.indexOf(': ');
  const from = pisah > 0 ? baris.slice(0, pisah).trim() : '';
  const text = pisah > 0 ? baris.slice(pisah + 2).trim() : '';
  if (from === '' || text === '' || /^([>@?*[]|->|=>)/.test(baris)) {
    lapor('S1', line, `Baris di blok shot tidak dikenali: “${baris}”.`);
    return;
  }
  shot.lines.push({ from, text, line });
}

function selesaikanShot(shot: ShotAst, lapor: Lapor) {
  if (shot.cap === undefined) {
    lapor('S1', shot.line, `Shot “${shot.name}” wajib punya “cap:”.`);
  }
  if (shot.cmt !== undefined && shot.lines.length > 0) {
    lapor('S1', shot.cmt.line, `Shot “${shot.name}” berisi cmt atau baris chat, tidak keduanya.`);
  }
}

/** Mem-parse episode.qs.md menjadi AST; diagnostik S1 dilaporkan lewat `lapor`. */
export function parseEpisode(sumber: string, lapor: Lapor): EpisodeAst {
  const baris = (sumber.startsWith(BOM) ? sumber.slice(1) : sumber).split(/\r?\n/);
  const fm = bacaFrontMatter(baris, KEY_EPISODE, lapor);
  const varsFm = fm.fields.get('vars');
  if (varsFm?.nilai.kind === 'daftar') {
    for (const nama of varsFm.nilai.isi) {
      cekNama('variabel', nama, varsFm.line, lapor);
    }
  }

  const shots: ShotAst[] = [];
  const knots: KnotAst[] = [];
  let knot: KnotAst | null = null;
  let shot: ShotAst | null = null;
  let blok: PernyataanKondisiBlok | null = null;
  let pilihan: PernyataanPilihan | null = null;
  /** Kunci blok pilihan yang sudah dipakai, dengan baris pertamanya (§2: unik dalam satu episode). */
  const kunciPilihan = new Map<string, number>();

  const tutupBlok = () => {
    if (blok !== null) {
      lapor('S1', blok.line, 'Blok ?? belum ditutup dengan “?? end”.');
      blok = null;
    }
  };

  for (let i = fm.awalIsi; i < baris.length; i++) {
    const line = i + 1;
    const mentah = baris[i] ?? '';

    if (shot !== null) {
      const rapi = mentah.trim();
      if (rapi === ':::') {
        selesaikanShot(shot, lapor);
        shot = null;
        continue;
      }
      if (rapi === '' || rapi.startsWith('//')) {
        continue;
      }
      if (!rapi.startsWith(':::') && !rapi.startsWith('==')) {
        bacaBarisShot(shot, rapi, line, lapor);
        continue;
      }
      lapor('S1', shot.line, `Blok shot “${shot.name}” belum ditutup dengan “:::”.`);
      selesaikanShot(shot, lapor);
      shot = null;
    }

    const token = tokenize(mentah, line);
    if (token === null) {
      continue;
    }

    if (token.kind === 'salah') {
      lapor('S1', line, token.message);
      continue;
    }
    if (token.kind === 'shot-buka') {
      if (blok !== null) {
        lapor('S1', line, 'Blok shot tidak boleh berada di dalam blok ??.');
      }
      if (!NAMA_SHOT.test(token.name)) {
        lapor(
          'S1',
          line,
          `Nama shot “${token.name}” tidak sah; pakai huruf kecil, angka, - atau _, diawali huruf.`,
        );
      } else if (token.name === 'closed' || NAMA_TERLARANG.has(token.name)) {
        lapor('S1', line, `“${token.name}” tidak boleh dipakai sebagai nama shot.`);
      } else if (shots.some((s) => s.name === token.name)) {
        lapor('S1', line, `Shot “${token.name}” sudah didefinisikan.`);
      }
      shot = { name: token.name, line, lines: [] };
      shots.push(shot);
      pilihan = null;
      continue;
    }
    if (token.kind === 'shot-tutup') {
      lapor('S1', line, '“:::” penutup tanpa blok shot yang dibuka.');
      continue;
    }
    if (token.kind === 'knot') {
      tutupBlok();
      pilihan = null;
      if (cekNama('knot', token.name, line, lapor) && knots.some((k) => k.name === token.name)) {
        lapor('S1', line, `Knot “${token.name}” sudah didefinisikan.`);
      }
      knot = { name: token.name, line, isi: [] };
      knots.push(knot);
      continue;
    }

    if (knot === null) {
      lapor(
        'S1',
        line,
        'Baris naskah harus berada di dalam knot; tulis “== nama_knot” lebih dulu.',
      );
      continue;
    }

    if (token.kind === 'kondisi-buka') {
      cekKondisi(token.cond, line, lapor);
      pilihan = null;
      if (blok === null) {
        blok = { kind: 'kondisi-blok', line, cabang: [{ line, cond: token.cond, isi: [] }] };
        knot.isi.push(blok);
      } else if (blok.cabang.some((c) => c.cond === null)) {
        lapor('S1', line, 'Cabang “?? kondisi” tidak boleh muncul setelah “?? else”.');
      } else {
        blok.cabang.push({ line, cond: token.cond, isi: [] });
      }
      continue;
    }
    if ((token.kind === 'kondisi-else' || token.kind === 'kondisi-tutup') && token.peringatan) {
      lapor('S1', line, token.peringatan);
    }
    if (token.kind === 'kondisi-else') {
      if (blok === null) {
        lapor('S1', line, '“?? else” tanpa “?? kondisi” pembuka.');
      } else if (blok.cabang.some((c) => c.cond === null)) {
        lapor('S1', line, 'Blok ?? hanya boleh punya satu “?? else”.');
      } else {
        blok.cabang.push({ line, cond: null, isi: [] });
      }
      continue;
    }
    if (token.kind === 'kondisi-tutup') {
      if (blok === null) {
        lapor('S1', line, '“?? end” tanpa “?? kondisi” pembuka.');
      }
      blok = null;
      continue;
    }

    if (blok !== null) {
      const cabang = blok.cabang[blok.cabang.length - 1];
      if (bersyarat(token) && cabang !== undefined) {
        cabang.isi.push(token);
      } else {
        lapor(
          'S1',
          line,
          'Blok ?? hanya boleh berisi narasi, gelembung, atau @sys; untuk berpindah knot pakai =>.',
        );
      }
      continue;
    }

    switch (token.kind) {
      case 'kondisi-baris':
        cekKondisi(token.cond, line, lapor);
        if (bersyarat(token.isi)) {
          knot.isi.push({ kind: 'kondisi-baris', line, cond: token.cond, token: token.isi });
        } else if (token.isi.kind === 'salah') {
          lapor('S1', line, token.isi.message);
        } else {
          lapor(
            'S1',
            line,
            'Kondisional satu baris hanya untuk narasi, gelembung, atau @sys; untuk berpindah knot pakai =>.',
          );
        }
        pilihan = null;
        break;
      case 'label': {
        const dipakai = kunciPilihan.get(token.key);
        if (!KUNCI_PILIHAN.test(token.key)) {
          lapor(
            'S1',
            line,
            `Kunci pilihan “#${token.key}” hanya boleh huruf, angka, atau garis bawah.`,
          );
        } else if (dipakai !== undefined) {
          lapor('S1', line, `Kunci pilihan “#${token.key}” sudah dipakai di baris ${dipakai}.`);
        } else {
          kunciPilihan.set(token.key, line);
        }
        pilihan = { kind: 'pilihan', line, label: token.label, key: token.key, opsi: [] };
        knot.isi.push(pilihan);
        break;
      }
      case 'opsi':
        if (pilihan === null) {
          lapor('S1', line, 'Opsi harus langsung mengikuti label pilihan “[Label] #kunci”.');
        } else {
          pilihan.opsi.push(token);
        }
        break;
      case 'go':
        knot.isi.push({ kind: 'go', line, to: token.to });
        pilihan = null;
        break;
      case 'end':
        knot.isi.push({ kind: 'end', line });
        pilihan = null;
        break;
      case 'branch':
        for (const kasus of token.cases) {
          if (kasus.cond !== null) {
            cekKondisi(kasus.cond, line, lapor);
          }
        }
        knot.isi.push({ kind: 'branch', line, cases: token.cases });
        pilihan = null;
        break;
      default:
        if (token.kind === 'set') {
          cekNama('variabel', token.v, line, lapor);
        }
        knot.isi.push({ kind: 'baris', token });
        pilihan = null;
    }
  }

  if (shot !== null) {
    lapor('S1', shot.line, `Blok shot “${shot.name}” belum ditutup dengan “:::”.`);
    selesaikanShot(shot, lapor);
  }
  tutupBlok();

  return { frontMatter: fm.fields, baris, shots, knots };
}
