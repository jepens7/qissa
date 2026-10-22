// String UI dari i18n/id.json (CLAUDE.md: tidak ada string UI di komponen). Indonesia dulu.
import pesan from '../i18n/id.json';

export type KunciPesan = keyof typeof pesan;

/** Pesan UI; `{nama}` diganti isian. Placeholder tanpa isian dibiarkan apa adanya. */
export function t(
  kunci: KunciPesan,
  isian: Readonly<Record<string, string | number>> = {},
): string {
  return pesan[kunci].replace(/\{(\w+)\}/g, (asli, nama: string) => {
    const nilai = isian[nama];
    return nilai === undefined ? asli : String(nilai);
  });
}

/** Akhiran setiap kunci yang diawali `awalan`, berurutan seperti di id.json (mis. nama opsi poll). */
export function akhiranKunci(awalan: string): string[] {
  return Object.keys(pesan)
    .filter((k) => k.startsWith(awalan))
    .map((k) => k.slice(awalan.length));
}
