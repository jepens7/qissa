// Tokenizer baris naskah (docs/QISSA-SCRIPT.md §2, "Aturan pembacaan baris").
// Satu baris menjadi satu token; nama knot, shot, dan variabel diperiksa belakangan oleh parser.
// Tidak ada regex yang bisa backtrack kuadratik pada baris panjang.

export type TokenNar = { kind: 'nar'; line: number; text: string };
export type TokenUcapan = {
  kind: 'ucapan';
  line: number;
  speaker: string;
  text: string;
  attach?: string;
};
export type TokenSys = { kind: 'sys'; line: number; text: string };

/** Token yang boleh diberi kondisi (`?` dan `??`), karena hanya jenis ini yang punya `cond`. */
export type TokenBersyarat = TokenNar | TokenUcapan | TokenSys;

export type TokenView = {
  kind: 'view';
  line: number;
  name: string;
  initial: string;
  sub: string;
  pill: string;
};
export type TokenTyping = { kind: 'typing'; line: number };
export type TokenShot = { kind: 'shot'; line: number; state: string };
export type TokenNotif = { kind: 'notif'; line: number; app: string; text: string; time: string };
export type TokenBank = { kind: 'bank'; line: number; amount: string; from: string };
export type TokenSet = { kind: 'set'; line: number; v: string };

export type TokenSederhana =
  TokenBersyarat | TokenView | TokenTyping | TokenShot | TokenNotif | TokenBank | TokenSet;

export type KasusCabang = { cond: string | null; to: string };

export type TokenOpsi = {
  kind: 'opsi';
  line: number;
  text: string;
  to: string;
  name: string | null;
};

export type Token =
  | TokenSederhana
  | { kind: 'knot'; line: number; name: string }
  | { kind: 'shot-buka'; line: number; name: string }
  | { kind: 'shot-tutup'; line: number }
  | { kind: 'go'; line: number; to: string }
  | { kind: 'end'; line: number }
  | { kind: 'branch'; line: number; cases: KasusCabang[] }
  | { kind: 'kondisi-baris'; line: number; cond: string; isi: Token }
  | { kind: 'kondisi-buka'; line: number; cond: string }
  /** `peringatan` diisi bila kata kuncinya ditulis dengan huruf besar (`?? END`). */
  | { kind: 'kondisi-else'; line: number; peringatan?: string }
  | { kind: 'kondisi-tutup'; line: number; peringatan?: string }
  | { kind: 'label'; line: number; label: string; key: string }
  | TokenOpsi
  | { kind: 'salah'; line: number; message: string };

const NAMA = '[A-Za-z0-9_-]+';
const KONDISI = '!?[A-Za-z0-9_]+';

function salah(line: number, message: string): Token {
  return { kind: 'salah', line, message };
}

/** Field `@direktif a | b | c`, atau pesan kesalahan bila jumlahnya salah atau ada yang kosong. */
function field(isi: string, jumlah: number, nama: string, bentuk: string): string[] | string {
  const bagian = isi.split('|').map((s) => s.trim());
  if (bagian.length !== jumlah) {
    return `@${nama} harus punya ${['', 'satu', 'dua', 'tiga', 'empat'][jumlah] ?? String(jumlah)} field: ${bentuk}.`;
  }
  if (bagian.some((s) => s === '')) {
    return `Field @${nama} tidak boleh kosong: ${bentuk}.`;
  }
  return bagian;
}

function tokenDirektif(baris: string, line: number): Token {
  const cocok = /^@(\S+)\s*(.*)$/.exec(baris);
  const nama = cocok?.[1] ?? '';
  const isi = cocok?.[2]?.trim() ?? '';
  switch (nama) {
    case 'view': {
      const f = field(isi, 4, 'view', 'Nama | Inisial | status | label pil');
      if (typeof f === 'string') {
        return salah(line, f);
      }
      const [name = '', initial = '', sub = '', pill = ''] = f;
      return { kind: 'view', line, name, initial, sub, pill };
    }
    case 'typing':
      return isi === '' ? { kind: 'typing', line } : salah(line, '@typing tidak memakai isi.');
    case 'shot':
      return /^\S+$/.test(isi)
        ? { kind: 'shot', line, state: isi }
        : salah(line, '@shot harus diikuti satu nama shot atau “closed”.');
    case 'sys':
      return isi === ''
        ? salah(line, '@sys harus diikuti teks.')
        : { kind: 'sys', line, text: isi };
    case 'notif': {
      const f = field(isi, 3, 'notif', 'App | teks | jam');
      if (typeof f === 'string') {
        return salah(line, f);
      }
      const [app = '', text = '', time = ''] = f;
      return { kind: 'notif', line, app, text, time };
    }
    case 'bank': {
      const f = field(isi, 2, 'bank', 'Nominal | PENGIRIM');
      if (typeof f === 'string') {
        return salah(line, f);
      }
      const [amount = '', from = ''] = f;
      return { kind: 'bank', line, amount, from };
    }
    case 'set':
      return /^\S+$/.test(isi)
        ? { kind: 'set', line, v: isi }
        : salah(line, '@set harus diikuti satu nama variabel.');
    default:
      return salah(line, `Direktif “@${nama}” tidak dikenal.`);
  }
}

function tokenCabang(isi: string, line: number): Token {
  const bagian = isi.split('|').map((s) => s.trim());
  const cases: KasusCabang[] = [];
  for (const [i, b] of bagian.entries()) {
    const terakhir = i === bagian.length - 1;
    const bersyarat = new RegExp(`^(${KONDISI})\\s*:\\s*(${NAMA})$`).exec(b);
    if (bersyarat !== null) {
      if (terakhir) {
        return salah(line, '=> wajib diakhiri knot default tanpa kondisi.');
      }
      cases.push({ cond: bersyarat[1] ?? '', to: bersyarat[2] ?? '' });
      continue;
    }
    if (new RegExp(`^${NAMA}$`).test(b) && terakhir) {
      cases.push({ cond: null, to: b });
      continue;
    }
    return salah(
      line,
      `Kasus “${b}” di => tidak dikenali; tulis “kondisi: knot”, dan knot default di akhir.`,
    );
  }
  return { kind: 'branch', line, cases };
}

function tokenUcapan(baris: string, line: number): Token {
  const pisah = baris.indexOf(': ');
  if (pisah <= 0) {
    return salah(line, `Baris tidak dikenali: “${baris}”.`);
  }
  const speaker = baris.slice(0, pisah).trim();
  const isi = baris.slice(pisah + 2).trim();
  if (isi.startsWith('[')) {
    const tutup = isi.indexOf(']');
    const attach = tutup === -1 ? '' : isi.slice(1, tutup).trim();
    if (attach === '') {
      return salah(
        line,
        `Label lampiran di gelembung ${speaker} kosong atau tidak ditutup dengan ].`,
      );
    }
    return { kind: 'ucapan', line, speaker, text: isi.slice(tutup + 1).trim(), attach };
  }
  if (isi === '') {
    return salah(line, `Gelembung ${speaker} tidak punya teks.`);
  }
  return { kind: 'ucapan', line, speaker, text: isi };
}

/** `* teks -> knot #NamaPendek`; dipisah di ` -> ` terakhir supaya teks opsi boleh memuat `#`. */
function tokenOpsi(baris: string, line: number): Token {
  const bentuk = 'Opsi ditulis “* teks opsi -> knot #NamaPendek”.';
  if (!/^\*\s/.test(baris)) {
    return salah(line, bentuk);
  }
  const isi = baris.slice(1).trim();
  const panah = [...isi.matchAll(/\s->\s/g)].at(-1);
  if (panah === undefined) {
    return salah(line, bentuk);
  }
  const text = isi.slice(0, panah.index).trim();
  const ekor = isi.slice(panah.index + panah[0].length).trim();
  const spasi = ekor.search(/\s/);
  const to = spasi === -1 ? ekor : ekor.slice(0, spasi);
  const sisa = spasi === -1 ? '' : ekor.slice(spasi).trim();
  if (text === '' || to === '') {
    return salah(line, bentuk);
  }
  if (sisa === '') {
    return { kind: 'opsi', line, text, to, name: null };
  }
  const name = sisa.startsWith('#') ? sisa.slice(1).trim() : '';
  return name === '' ? salah(line, bentuk) : { kind: 'opsi', line, text, to, name };
}

/** Token untuk satu baris naskah; null untuk baris kosong dan komentar. */
export function tokenize(mentah: string, line: number): Token | null {
  const baris = mentah.trim();
  if (baris === '' || baris.startsWith('//')) {
    return null;
  }

  if (baris.startsWith('==')) {
    const cocok = /^==\s*(\S+)$/.exec(baris);
    return cocok === null
      ? salah(line, 'Judul knot harus berbentuk “== nama_knot”.')
      : { kind: 'knot', line, name: cocok[1] ?? '' };
  }

  if (baris.startsWith(':::')) {
    if (baris === ':::') {
      return { kind: 'shot-tutup', line };
    }
    const cocok = /^:::\s*shot\s+(\S+)$/.exec(baris);
    return cocok === null
      ? salah(line, 'Blok tangkapan layar harus dibuka dengan “::: shot nama-shot”.')
      : { kind: 'shot-buka', line, name: cocok[1] ?? '' };
  }

  if (baris.startsWith('@')) {
    return tokenDirektif(baris, line);
  }

  if (baris.startsWith('->')) {
    const tujuan = baris.slice(2).trim();
    if (!/^\S+$/.test(tujuan)) {
      return salah(line, '-> harus diikuti satu nama knot atau END.');
    }
    return tujuan === 'END' ? { kind: 'end', line } : { kind: 'go', line, to: tujuan };
  }

  if (baris.startsWith('=>')) {
    return tokenCabang(baris.slice(2).trim(), line);
  }

  if (baris.startsWith('??')) {
    const isi = baris.slice(2).trim();
    const kecil = isi.toLowerCase();
    if (kecil === 'else' || kecil === 'end') {
      const peringatan =
        isi === kecil ? {} : { peringatan: `Tulis “?? ${kecil}” dengan huruf kecil.` };
      return kecil === 'else'
        ? { kind: 'kondisi-else', line, ...peringatan }
        : { kind: 'kondisi-tutup', line, ...peringatan };
    }
    return new RegExp(`^${KONDISI}$`).test(isi)
      ? { kind: 'kondisi-buka', line, cond: isi }
      : salah(line, 'Blok kondisional ditulis “?? kondisi”, “?? else”, atau “?? end”.');
  }

  if (baris.startsWith('?')) {
    const cocok = new RegExp(`^\\?\\s*(${KONDISI})\\s*:\\s+(.+)$`).exec(baris);
    if (cocok === null) {
      return salah(line, 'Kondisional satu baris ditulis “? kondisi: pernyataan”.');
    }
    const pernyataan = cocok[2] ?? '';
    if (pernyataan.startsWith('?')) {
      return salah(line, 'Kondisional tidak boleh bersarang.');
    }
    const isi = tokenize(pernyataan, line);
    return isi === null
      ? salah(line, 'Kondisional satu baris harus diikuti pernyataan.')
      : { kind: 'kondisi-baris', line, cond: cocok[1] ?? '', isi };
  }

  if (baris.startsWith('[')) {
    const cocok = /^\[(.+)\]\s*#(\S+)$/.exec(baris);
    const label = (cocok?.[1] ?? '').trim();
    if (cocok === null || label === '') {
      return salah(
        line,
        'Label pilihan ditulis “[Label] #kunci”, misalnya “[Pilihan 1 dari 2] #p1”.',
      );
    }
    return { kind: 'label', line, label, key: cocok[2] ?? '' };
  }

  if (baris.startsWith('*')) {
    return tokenOpsi(baris, line);
  }

  if (baris.startsWith('>')) {
    const text = baris.slice(1).trim();
    return text === ''
      ? salah(line, 'Kartu narasi tidak punya teks.')
      : { kind: 'nar', line, text };
  }

  return tokenUcapan(baris, line);
}
