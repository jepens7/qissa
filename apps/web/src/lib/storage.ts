// Satu-satunya modul yang menyentuh localStorage (ARCHITECTURE §8). Kunci berawalan qissa.v1. dan nilainya
// JSON (DATA-CONTRACTS §5). Setiap akses dibungkus try/catch: storage yang penuh atau diblokir tidak
// boleh membuat app crash; kegagalan hanya dilaporkan untuk refleksi (SRS REF-2).
import type { Manifest } from '@qissa/script/types';

export type Penyimpanan = Pick<Storage, 'getItem' | 'setItem'>;

const AWALAN = 'qissa.v1.';

/** localStorage browser, atau null bila tidak tersedia (mis. diblokir pengaturan privasi). */
export function penyimpananBrowser(): Penyimpanan | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function baca(s: Penyimpanan | null, kunci: string): unknown {
  try {
    const teks = s?.getItem(AWALAN + kunci) ?? null;
    return teks === null ? undefined : (JSON.parse(teks) as unknown);
  } catch {
    return undefined;
  }
}

function tulis(s: Penyimpanan | null, kunci: string, nilai: unknown): boolean {
  if (s === null) {
    return false;
  }
  try {
    s.setItem(AWALAN + kunci, JSON.stringify(nilai));
    return true;
  } catch {
    return false;
  }
}

function daftarTeks(nilai: unknown): string[] {
  return Array.isArray(nilai) && nilai.every((x) => typeof x === 'string') ? nilai : [];
}

/** Nama akhir (nama pendek pilihan terakhir) yang sudah dibaca di episode ini. */
export function bacaAkhir(s: Penyimpanan | null, ep: string): string[] {
  return daftarTeks(baca(s, `${ep}.akhir`));
}

export function tambahAkhir(s: Penyimpanan | null, ep: string, akhir: string): string[] {
  const daftar = bacaAkhir(s, ep);
  const baru = daftar.includes(akhir) ? daftar : [...daftar, akhir];
  tulis(s, `${ep}.akhir`, baru);
  return baru;
}

/** Jalur terakhir yang ditamatkan di episode ini. */
export function bacaJalur(s: Penyimpanan | null, ep: string): string[] {
  return daftarTeks(baca(s, `${ep}.jalur`));
}

export function simpanJalur(s: Penyimpanan | null, ep: string, jalur: readonly string[]) {
  tulis(s, `${ep}.jalur`, jalur);
}

export function bacaRefleksi(s: Penyimpanan | null, ep: string): string {
  const nilai = baca(s, `${ep}.refleksi`);
  return typeof nilai === 'string' ? nilai : '';
}

/** false bila gagal disimpan, supaya UI bisa memberi tahu pembaca. */
export function simpanRefleksi(s: Penyimpanan | null, ep: string, teks: string): boolean {
  return tulis(s, `${ep}.refleksi`, teks);
}

/** Jawaban poll landing Episode 1 (nama pendek opsi). */
export function bacaPoll(s: Penyimpanan | null): string | null {
  const nilai = baca(s, 'ep01.poll');
  return typeof nilai === 'string' ? nilai : null;
}

export function simpanPoll(s: Penyimpanan | null, nama: string) {
  tulis(s, 'ep01.poll', nama);
}

/** Salinan manifest terakhir; isinya diperiksa oleh pemanggil (lib/content.ts). */
export function bacaManifestTersimpan(s: Penyimpanan | null): unknown {
  return baca(s, 'manifest');
}

export function simpanManifest(s: Penyimpanan | null, manifest: Manifest) {
  tulis(s, 'manifest', manifest);
}
