// versi_konten lewat berkas kunci content/versi-konten.lock.json (docs/DATA-CONTRACTS.md §9, ADR-014).
// Hash dihitung dari JSON episode yang disajikan, termasuk dalil, sehingga perubahan apa pun pada
// berkas yang diterima pembaca memberi versi baru.
import { createHash } from 'node:crypto';

export type EntriKunci = { hash: string; versi: string };

/** Isi berkas kunci: id episode ke hash dan versinya. */
export type BerkasKunci = Record<string, EntriKunci>;

const POLA_VERSI = /^(\d{4}-\d{2}-\d{2})\.([1-9][0-9]*)$/;
const BOM = String.fromCharCode(0xfeff);

export function hashIsi(isi: string): string {
  return `sha256:${createHash('sha256').update(isi).digest('hex')}`;
}

/** Tanggal hari ini di Asia/Jakarta, YYYY-MM-DD. */
export function hariIniJakarta(sekarang: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(sekarang);
}

/**
 * Versi untuk satu episode. Hash yang sama mempertahankan versinya. Hash baru selalu mendapat versi
 * yang lebih besar dari versi sebelumnya: tanggal hari ini dengan `n` = 1, atau `n` naik pada tanggal
 * versi sebelumnya bila tanggal itu hari ini atau sesudahnya. Episode yang belum ada di kunci memakai
 * `awal` (versi_konten di content/manifest.json) bila formatnya sah.
 */
export function hitungVersi(
  lama: EntriKunci | undefined,
  hash: string,
  hariIni: string,
  awal: string | undefined,
): string {
  if (lama === undefined) {
    return awal !== undefined && POLA_VERSI.test(awal) ? awal : `${hariIni}.1`;
  }
  if (lama.hash === hash) {
    return lama.versi;
  }
  const cocok = POLA_VERSI.exec(lama.versi);
  const tanggal = cocok?.[1];
  if (tanggal === undefined || tanggal < hariIni) {
    return `${hariIni}.1`;
  }
  return `${tanggal}.${String(Number(cocok?.[2]) + 1)}`;
}

/** Berkas kunci dengan key terurut, berindentasi dua spasi, diakhiri newline. */
export function tulisKunci(kunci: BerkasKunci): string {
  const urut = Object.fromEntries(Object.entries(kunci).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify(urut, null, 2)}\n`;
}

/** Isi berkas kunci. Berkas yang tidak sah menjadi galat berbahasa Indonesia yang menyebut `file`. */
export function bacaKunci(
  isi: string | null,
  file = 'content/versi-konten.lock.json',
): BerkasKunci {
  if (isi === null) {
    return {};
  }
  const sumber = isi.startsWith(BOM) ? isi.slice(1) : isi;
  let data: unknown;
  try {
    data = JSON.parse(sumber);
  } catch (galat) {
    const posisi = /position (\d+)/.exec(galat instanceof Error ? galat.message : '');
    const baris =
      posisi === null
        ? ''
        : ` (baris ${String(sumber.slice(0, Number(posisi[1])).split('\n').length)})`;
    throw new Error(
      `${file} bukan JSON yang sah${baris}. Pulihkan dari git; jangan dihapus, karena isinya riwayat versi.`,
      { cause: galat },
    );
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error(`${file} harus berisi objek JSON.`);
  }
  const kunci: BerkasKunci = {};
  for (const [id, entri] of Object.entries(data)) {
    const e = entri as Partial<EntriKunci> | null;
    if (typeof e?.hash !== 'string' || typeof e.versi !== 'string' || !POLA_VERSI.test(e.versi)) {
      throw new Error(
        `Entri “${id}” di ${file} harus punya hash dan versi berformat YYYY-MM-DD.n.`,
      );
    }
    kunci[id] = { hash: e.hash, versi: e.versi };
  }
  return kunci;
}
