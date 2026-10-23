// Bagikan dan kirim masukan (SRS SHR-1, SHR-2): Web Share API, dengan cadangan salin ke clipboard. Di APK,
// lembar bagikan native lewat Capacitor Share (SRS AND-2, ADR-020).

/** Teks bagikan: `bagikan` dari front matter, lalu URL episode. Tidak pernah memuat pilihan pembaca. */
export function teksBagikan(bagikan: string, siteUrl: string, id: string): string {
  return `${bagikan}\n${siteUrl}#${id}`;
}

export type HasilKirim = 'dibagikan' | 'tersalin' | 'gagal';

type Navigasi = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, 'writeText'>;
};

/** Navigasi bawaan: navigator browser, atau lembar bagikan native di APK dengan clipboard WebView. */
async function navigasiBawaan(): Promise<Navigasi> {
  if (typeof navigator === 'undefined') {
    return {};
  }
  // Kondisi mode ditulis langsung supaya impor plugin terbuang dari build web (lihat main.tsx).
  if (import.meta.env.MODE !== 'android') {
    return navigator;
  }
  const { Share } = await import('@capacitor/share');
  return {
    share: async (data) => {
      await Share.share({ text: data.text ?? '' });
    },
    clipboard: navigator.clipboard,
  };
}

/** Membuka lembar bagikan; bila tidak ada, dibatalkan, atau gagal, teksnya disalin seperti prototipe. */
export async function kirimTeks(teks: string, navigasi?: Navigasi): Promise<HasilKirim> {
  const nav = navigasi ?? (await navigasiBawaan());
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
