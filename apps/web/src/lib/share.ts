// Bagikan dan kirim masukan (SRS SHR-1, SHR-2): Web Share API, dengan cadangan salin ke clipboard.
// Capacitor Share untuk Android menyusul di M3b (ARCHITECTURE §10).

/** Teks bagikan: `bagikan` dari front matter, lalu URL episode. Tidak pernah memuat pilihan pembaca. */
export function teksBagikan(bagikan: string, siteUrl: string, id: string): string {
  return `${bagikan}\n${siteUrl}#${id}`;
}

export type HasilKirim = 'dibagikan' | 'tersalin' | 'gagal';

type Navigasi = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, 'writeText'>;
};

/** Membuka lembar bagikan; bila tidak ada, dibatalkan, atau gagal, teksnya disalin seperti prototipe. */
export async function kirimTeks(
  teks: string,
  nav: Navigasi = typeof navigator === 'undefined' ? {} : navigator,
): Promise<HasilKirim> {
  if (nav.share !== undefined) {
    try {
      await nav.share({ text: teks });
      return 'dibagikan';
    } catch {
      // Dibatalkan atau ditolak: salin saja.
    }
  }
  try {
    if (nav.clipboard === undefined) {
      return 'gagal';
    }
    await nav.clipboard.writeText(teks);
    return 'tersalin';
  } catch {
    return 'gagal';
  }
}
