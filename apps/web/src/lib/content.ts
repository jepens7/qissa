// Memuat manifest dan episode (ARCHITECTURE §7, BACKLOG D6). Sampai service worker (M3a), episode di-cache
// di Cache Storage dengan versi_konten sebagai bagian kunci, dan salinan manifest terakhir disimpan di
// localStorage sebagai cadangan offline.
import type { Episode, Manifest, ManifestEpisode } from '@qissa/script/types';
import { bacaManifestTersimpan, simpanManifest, type Penyimpanan } from './storage.ts';

/** Ketergantungan ke browser, disuntikkan supaya modul ini bisa diuji tanpa DOM. */
export type Lingkungan = {
  fetch: typeof fetch;
  /** Cache Storage; null bila tidak tersedia (mis. http selain localhost). */
  caches: CacheStorage | null;
  penyimpanan: Penyimpanan | null;
};

export function lingkunganBrowser(penyimpanan: Penyimpanan | null): Lingkungan {
  return {
    fetch: (input, init) => window.fetch(input, init),
    caches: 'caches' in window ? window.caches : null,
    penyimpanan,
  };
}

/** Batas waktu manifest network-first (ARCHITECTURE §7). */
export const BATAS_MANIFEST_MS = 3000;

const NAMA_CACHE = 'qissa-episode-v1';

/** Episode tidak bisa dimuat dari jaringan dan belum ada di cache. */
export class GalatMuat extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GalatMuat';
  }
}

function adalahManifest(data: unknown): data is Manifest {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { versi, episodes } = data as { versi?: unknown; episodes?: unknown };
  return (
    versi === 1 &&
    Array.isArray(episodes) &&
    episodes.every((e: unknown) => {
      if (typeof e !== 'object' || e === null) {
        return false;
      }
      const x = e as Record<string, unknown>;
      return ['id', 'judul', 'url', 'versi_konten', 'rilis'].every((k) => typeof x[k] === 'string');
    })
  );
}

async function ambilDenganBatas(ling: Lingkungan, url: string, batasMs: number): Promise<Response> {
  const pengendali = new AbortController();
  const waktu = setTimeout(() => {
    pengendali.abort();
  }, batasMs);
  try {
    return await ling.fetch(url, { cache: 'no-cache', signal: pengendali.signal });
  } finally {
    clearTimeout(waktu);
  }
}

/**
 * Manifest network-first. Bila jaringan gagal, melewati batas waktu, atau versi manifest tidak dikenal,
 * dipakai salinan terakhir; null bila keduanya tidak ada.
 */
export async function muatManifest(
  base: string,
  ling: Lingkungan,
  batasMs = BATAS_MANIFEST_MS,
): Promise<Manifest | null> {
  try {
    const respons = await ambilDenganBatas(ling, `${base}/manifest.json`, batasMs);
    if (respons.ok) {
      const data: unknown = await respons.json();
      if (adalahManifest(data)) {
        simpanManifest(ling.penyimpanan, data);
        return data;
      }
    }
  } catch {
    // Jaringan gagal atau terlalu lambat: pakai salinan.
  }
  const salinan = bacaManifestTersimpan(ling.penyimpanan);
  return adalahManifest(salinan) ? salinan : null;
}

/** Tanggal hari ini di Asia/Jakarta, YYYY-MM-DD. */
export function hariIniJakarta(sekarang: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(sekarang);
}

/** Episode yang tanggal rilisnya sudah tiba, berurutan seperti di manifest (ARCHITECTURE §7). */
export function episodeTerbit(manifest: Manifest, hariIni: string): ManifestEpisode[] {
  return manifest.episodes.filter((e) => e.rilis <= hariIni);
}

/** Episode cache-first; versi lama episode yang sama dihapus saat versi baru disimpan. */
export async function muatEpisode(entri: ManifestEpisode, ling: Lingkungan): Promise<Episode> {
  const kunci = `${entri.url}?v=${encodeURIComponent(entri.versi_konten)}`;
  let cache: Cache | null = null;
  try {
    cache = ling.caches === null ? null : await ling.caches.open(NAMA_CACHE);
    const tersimpan = await cache?.match(kunci);
    if (tersimpan !== undefined) {
      return (await tersimpan.json()) as Episode;
    }
  } catch {
    cache = null;
  }

  let respons: Response;
  try {
    respons = await ling.fetch(entri.url);
  } catch {
    throw new GalatMuat(`Episode ${entri.id} gagal dimuat: jaringan tidak tersedia.`);
  }
  if (!respons.ok) {
    throw new GalatMuat(`Episode ${entri.id} gagal dimuat (HTTP ${String(respons.status)}).`);
  }
  if (cache !== null) {
    try {
      const lama = (await cache.keys()).filter(
        (r) => r.url.includes(`${entri.url}?v=`) && !r.url.endsWith(kunci),
      );
      await Promise.all(lama.map((r) => cache.delete(r)));
      await cache.put(kunci, respons.clone());
    } catch {
      // Cache penuh atau ditolak: episode tetap bisa dibaca dari jaringan.
    }
  }
  try {
    return (await respons.json()) as Episode;
  } catch {
    throw new GalatMuat(`Episode ${entri.id} rusak: bukan JSON yang sah.`);
  }
}
