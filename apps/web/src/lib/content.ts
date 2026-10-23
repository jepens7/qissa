// Memuat manifest dan episode (ARCHITECTURE §7, BACKLOG D6). Konten di-cache di sini, bukan oleh service worker
// (ADR-017): episode di Cache Storage dengan versi_konten sebagai bagian kunci, dan salinan manifest terakhir
// di localStorage sebagai cadangan offline.
import {
  FORMAT_EPISODE,
  type Episode,
  type Manifest,
  type ManifestEpisode,
} from '@qissa/script/types';
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

/** Batas waktu jaringan bila ada cadangan tersimpan: salinan manifest atau versi lama episode (ARCHITECTURE §7). */
export const BATAS_JARINGAN_MS = 3000;

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

type Unduhan = { ok: boolean; status: number; teks: string };

/**
 * Unduh teks dengan `cache: 'no-cache'`. Dengan `batasMs`, batas waktunya mencakup header dan body, jadi body yang
 * macet di tengah ikut dibatalkan; dengan null, jawaban jaringan ditunggu.
 */
async function unduh(ling: Lingkungan, url: string, batasMs: number | null): Promise<Unduhan> {
  const pengendali = new AbortController();
  const waktu =
    batasMs === null
      ? undefined
      : setTimeout(() => {
          pengendali.abort();
        }, batasMs);
  try {
    const respons = await ling.fetch(url, { cache: 'no-cache', signal: pengendali.signal });
    return { ok: respons.ok, status: respons.status, teks: await respons.text() };
  } finally {
    clearTimeout(waktu);
  }
}

/**
 * Manifest network-first. Bila jaringan gagal, melewati batas waktu, atau versi manifest tidak dikenal,
 * dipakai salinan terakhir; null bila keduanya tidak ada. Batas waktu hanya berlaku bila ada salinan:
 * tanpa salinan, jawaban jaringan ditunggu, karena menyerah lebih awal hanya berujung galat (kunjungan
 * pertama di jaringan lambat, saat service worker juga sedang mengunduh precache).
 */
export async function muatManifest(
  base: string,
  ling: Lingkungan,
  batasMs = BATAS_JARINGAN_MS,
): Promise<Manifest | null> {
  const salinan = bacaManifestTersimpan(ling.penyimpanan);
  const cadangan = adalahManifest(salinan) ? salinan : null;
  const url = `${base}/manifest.json`;
  try {
    const { ok, teks } = await unduh(ling, url, cadangan === null ? null : batasMs);
    if (ok) {
      const data: unknown = JSON.parse(teks);
      if (adalahManifest(data)) {
        simpanManifest(ling.penyimpanan, data);
        return urlMutlak(data, url);
      }
    }
  } catch {
    // Jaringan gagal, terlalu lambat, atau JSON rusak: pakai salinan.
  }
  return cadangan === null ? null : urlMutlak(cadangan, url);
}

/**
 * Bila manifest diambil dari URL absolut (APK Capacitor memuat konten dari qissah.id, BACKLOG H2), URL episode
 * di-resolve terhadap URL manifest; tanpa itu `/content/epNN.json` mengarah ke origin APK. Di web, `base`
 * relatif dan manifest dipakai apa adanya.
 */
function urlMutlak(manifest: Manifest, urlManifest: string): Manifest {
  if (!/^https?:\/\//.test(urlManifest)) {
    return manifest;
  }
  return {
    ...manifest,
    episodes: manifest.episodes.map((e) => ({ ...e, url: new URL(e.url, urlManifest).href })),
  };
}

/** Tanggal hari ini di Asia/Jakarta, YYYY-MM-DD. */
export function hariIniJakarta(sekarang: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(sekarang);
}

/** Episode yang tanggal rilisnya sudah tiba, berurutan seperti di manifest (ARCHITECTURE §7). */
export function episodeTerbit(manifest: Manifest, hariIni: string): ManifestEpisode[] {
  return manifest.episodes.filter((e) => e.rilis <= hariIni);
}

/**
 * Versi lain episode yang sama yang masih tersimpan, untuk dibaca saat versi baru belum bisa diunduh (G2).
 * Hanya versi yang formatnya dikenal shell ini; selain itu pembaca lebih baik diminta mencoba lagi (ADR-015).
 */
async function versiTersimpan(cache: Cache | null, url: string): Promise<Episode | undefined> {
  if (cache === null) {
    return undefined;
  }
  try {
    for (const kunci of (await cache.keys()).filter((r) => r.url.includes(`${url}?v=`))) {
      const respons = await cache.match(kunci);
      const episode = respons === undefined ? undefined : ((await respons.json()) as Episode);
      if (episode?.format === FORMAT_EPISODE) {
        return episode;
      }
    }
  } catch {
    // Cache rusak atau ditolak: anggap tidak ada cadangan.
  }
  return undefined;
}

/**
 * Episode cache-first. Versi baru dibaca utuh, disimpan, baru kemudian versi lama episode yang sama dihapus.
 * Bila versi baru belum tersimpan dan unduhannya gagal (offline, putus di tengah, galat server, atau JSON rusak),
 * versi lama yang masih tersimpan dipakai (SRS PWA-4, NFR-2). Bila versi lama ada, unduhan versi baru diberi batas
 * waktu seperti manifest, supaya di jaringan yang tersambung tapi macet pembaca tidak menunggu layar kosong.
 */
export async function muatEpisode(
  entri: ManifestEpisode,
  ling: Lingkungan,
  batasMs = BATAS_JARINGAN_MS,
): Promise<Episode> {
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

  const lama = await versiTersimpan(cache, entri.url);
  let teks = '';
  let episode: Episode | null = null;
  let galat = `Episode ${entri.id} gagal dimuat: jaringan tidak tersedia.`;
  try {
    const unduhan = await unduh(ling, entri.url, lama === undefined ? null : batasMs);
    if (unduhan.ok) {
      teks = unduhan.teks;
      episode = JSON.parse(teks) as Episode;
    } else {
      galat = `Episode ${entri.id} gagal dimuat (HTTP ${String(unduhan.status)}).`;
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      galat = `Episode ${entri.id} rusak: bukan JSON yang sah.`;
    }
  }
  if (episode === null) {
    if (lama !== undefined) {
      return lama;
    }
    throw new GalatMuat(galat);
  }
  if (cache !== null) {
    try {
      await cache.put(
        kunci,
        new Response(teks, { headers: { 'Content-Type': 'application/json' } }),
      );
      const lama = (await cache.keys()).filter(
        (r) => r.url.includes(`${entri.url}?v=`) && !r.url.endsWith(kunci),
      );
      await Promise.all(lama.map((r) => cache.delete(r)));
    } catch {
      // Cache penuh atau ditolak: episode tetap terbaca dari jaringan, dan versi lama dibiarkan.
    }
  }
  return episode;
}
