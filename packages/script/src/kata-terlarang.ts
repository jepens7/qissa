// Pemindai teks per baris untuk L5 (kata terlarang) dan W4 (kata ketuaan).
// Daftar bisa disuntikkan supaya tes negatif memakai istilah sintetis, bukan nama atau nominal judi.
import { createHash } from 'node:crypto';
import { KATA_KETUAAN } from './dated-words.ts';
import type { DiagnosticCode } from './diagnostics.ts';
import {
  HASH_NAMA_APLIKASI_JUDI,
  JARAK_NOMINAL_TARUHAN,
  KATA_TARUHAN,
  KATA_TERLARANG,
  NAMA_GRUP_GACOR,
} from './forbidden.ts';

export type DaftarKata = {
  hashNamaAplikasi: ReadonlySet<string>;
  kataTerlarang: readonly string[];
  kataTaruhan: readonly string[];
  kataKetuaan: readonly string[];
};

export const DAFTAR_BAWAAN: DaftarKata = {
  hashNamaAplikasi: new Set(HASH_NAMA_APLIKASI_JUDI),
  kataTerlarang: KATA_TERLARANG,
  kataTaruhan: KATA_TARUHAN,
  kataKetuaan: KATA_KETUAAN,
};

export type Temuan = { code: DiagnosticCode; message: string };

/** Akhiran domain yang dikenali sebagai tautan walau tanpa http(s)://, www., atau path. */
const TLD = (
  'com net org id co io xyz app me ly gg site online top vip bet club info biz link live win asia ' +
  'ee be gl in tv cc pro shop store fun icu cfd sbs lol click one bio my sg to ws tk pw ai dev page ' +
  'art wiki ink casino games'
).split(' ');

const LABEL = '[\\p{L}\\p{N}-]+';
const AWAL_HOST = '(?<![\\p{L}\\p{N}.-])';

/**
 * Tautan: http(s)://, www., host yang diikuti garis miring (`linktr.ee/nama`), alamat IP dengan garis
 * miring, atau domain berakhiran TLD di atas (`contoh.vip`).
 */
const TAUTAN: readonly RegExp[] = [
  /https?:\/\//i,
  /(?<![\p{L}\p{N}])www\./iu,
  new RegExp(`${AWAL_HOST}${LABEL}(?:\\.${LABEL})*\\.\\p{L}{2,}\\/`, 'iu'),
  /(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\//,
  new RegExp(
    `${AWAL_HOST}${LABEL}(?:\\.${LABEL})*\\.(?:${TLD.join('|')})(?![\\p{L}\\p{N}-])`,
    'iu',
  ),
];

/** Tag HTML, termasuk yang langsung diikuti garis miring (`<img/src=x>`). */
const TAG_HTML = /<\/?[a-z][a-z0-9-]*(?=[\s/>])[^<>]*>/i;

/** Satuan yang menjadikan angka sebagai uang, menempel ("50rb") atau dipisah spasi ("50 ribu"). */
const SATUAN_UANG = new Set(['rb', 'ribu', 'rebu', 'k', 'jt', 'juta', 'jeti', 'miliar', 'milyar']);
const MATA_UANG = new Set(['rp', 'idr']);
const ANGKA = /^\d+(?:[.,]\d+)*$/;
/** Angka berpemisah ribuan, mis. 50.000 atau 1.200.000. */
const RIBUAN = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/;

/** Klitika yang menempel tanpa tanda hubung: "depositnya", "depomu". */
const KLITIKA = ['nya', 'mu', 'ku', 'lah', 'kah', 'pun'];

/**
 * Kata huruf kecil untuk pencocokan per kata dan hash nama: tanda baca dan batas huruf-angka menjadi
 * pemisah, jadi "Nama-88", "nama88", dan "nama 88" sama.
 */
export function kataKata(baris: string): string[] {
  return (
    baris
      .normalize('NFKC')
      .toLowerCase()
      .match(/\p{L}+|\p{N}+/gu) ?? []
  );
}

function sha256(teks: string): string {
  return createHash('sha256').update(teks).digest('hex');
}

/** Hash nama aplikasi untuk HASH_NAMA_APLIKASI_JUDI, dengan normalisasi yang sama seperti teks. */
export function hashNama(nama: string): string {
  return sha256(kataKata(nama).join(' '));
}

/** `kata` sama dengan `dasar`, atau `dasar` ditambah klitika. */
export function cocokKata(kata: string, dasar: string): boolean {
  const d = dasar.toLowerCase();
  return kata === d || (kata.startsWith(d) && KLITIKA.includes(kata.slice(d.length)));
}

/** Potongan huruf dan potongan angka beserta indeks katanya; "Rp50.000," menjadi "rp" dan "50.000". */
type Potongan = { teks: string; kata: number };

function potongan(baris: string): Potongan[] {
  return baris
    .normalize('NFKC')
    .toLowerCase()
    .split(/\s+/)
    .flatMap((kata, i) =>
      (kata.match(/\p{L}+|\d+(?:[.,]\d+)*/gu) ?? []).map((teks) => ({ teks, kata: i })),
    );
}

/**
 * Rentang kata (awal, akhir) setiap angka uang: angka dengan Rp atau satuan, angka berpemisah ribuan,
 * atau angka polos minimal lima digit. Jam (02.14), hitungan, dan nomor pasal tidak termasuk.
 */
function rentangNominal(p: readonly Potongan[]): [number, number][] {
  const hasil: [number, number][] = [];
  p.forEach((x, i) => {
    if (!ANGKA.test(x.teks)) {
      return;
    }
    const sebelum = p[i - 1];
    const sesudah = p[i + 1];
    const awal = sebelum !== undefined && MATA_UANG.has(sebelum.teks) ? sebelum.kata : null;
    const akhir = sesudah !== undefined && SATUAN_UANG.has(sesudah.teks) ? sesudah.kata : null;
    if (awal !== null || akhir !== null || RIBUAN.test(x.teks) || /^\d{5,}$/.test(x.teks)) {
      hasil.push([awal ?? x.kata, akhir ?? x.kata]);
    }
  });
  return hasil;
}

/** Angka uang yang berjarak paling jauh tiga kata dari kata taruhan. */
export function adaNominalTaruhan(baris: string, kataTaruhan: readonly string[]): boolean {
  const p = potongan(baris);
  const taruhan = p.filter((x) => kataTaruhan.some((k) => cocokKata(x.teks, k))).map((x) => x.kata);
  if (taruhan.length === 0) {
    return false;
  }
  const nominal = rentangNominal(p);
  return taruhan.some((t) =>
    nominal.some(([awal, akhir]) => Math.max(awal - t, t - akhir, 0) <= JARAK_NOMINAL_TARUHAN),
  );
}

/** Frasa sampai tiga kata yang hash-nya ada di daftar nama aplikasi judi. */
export function adaNamaAplikasi(baris: string, hash: ReadonlySet<string>): boolean {
  if (hash.size === 0) {
    return false;
  }
  const kata = kataKata(baris);
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= kata.length; i++) {
      if (hash.has(sha256(kata.slice(i, i + n).join(' ')))) {
        return true;
      }
    }
  }
  return false;
}

/** Temuan L5 dalam satu baris teks. */
export function periksaKataTerlarang(baris: string, daftar: DaftarKata = DAFTAR_BAWAAN): Temuan[] {
  const temuan: Temuan[] = [];
  const kecil = baris.normalize('NFKC').toLowerCase();
  const kata = kataKata(baris);

  if (kecil.replaceAll(NAMA_GRUP_GACOR, ' ').includes('gacor')) {
    temuan.push({
      code: 'L5',
      message: '“gacor” hanya boleh muncul sebagai nama grup “Gacor Family”.',
    });
  }
  for (const terlarang of daftar.kataTerlarang) {
    if (kata.some((k) => cocokKata(k, terlarang))) {
      temuan.push({ code: 'L5', message: `Kata “${terlarang}” dilarang di naskah dan dalil.` });
    }
  }
  if (TAUTAN.some((pola) => pola.test(kecil))) {
    temuan.push({ code: 'L5', message: 'Tautan tidak boleh ada di naskah dan dalil.' });
  }
  if (TAG_HTML.test(baris)) {
    temuan.push({ code: 'L5', message: 'Tag HTML tidak boleh ada di naskah dan dalil.' });
  }

  if (adaNominalTaruhan(baris, daftar.kataTaruhan)) {
    temuan.push({ code: 'L5', message: 'Nominal taruhan tidak boleh muncul di naskah dan dalil.' });
  }
  if (adaNamaAplikasi(baris, daftar.hashNamaAplikasi)) {
    temuan.push({
      code: 'L5',
      message: 'Nama aplikasi judi tidak boleh muncul di naskah dan dalil.',
    });
  }
  return temuan;
}

/** Temuan W4 dalam satu baris teks. */
export function periksaKataKetuaan(baris: string, daftar: DaftarKata = DAFTAR_BAWAAN): Temuan[] {
  const ketuaan = new Set(daftar.kataKetuaan.map((k) => k.toLowerCase()));
  return [...new Set(kataKata(baris).filter((k) => ketuaan.has(k)))].map((k) => ({
    code: 'W4',
    message: `Kata “${k}” terdengar ketuaan bagi pembaca (dated-words.ts).`,
  }));
}
