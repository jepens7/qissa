// BACKLOG D6: pemuatan manifest dan episode diuji dengan manifest palsu, fetch palsu, dan cache palsu.
import type { Manifest, ManifestEpisode } from '@qissa/script/types';
import { describe, expect, test } from 'vitest';
import {
  GalatMuat,
  episodeTerbit,
  hariIniJakarta,
  muatEpisode,
  muatManifest,
  type Lingkungan,
} from '../src/lib/content.ts';
import {
  bacaAkhir,
  bacaJalur,
  bacaPoll,
  bacaRefleksi,
  simpanJalur,
  simpanPoll,
  simpanRefleksi,
  tambahAkhir,
  type Penyimpanan,
} from '../src/lib/storage.ts';

function entri(id: string, ubah: Partial<ManifestEpisode> = {}): ManifestEpisode {
  return {
    id,
    nomor: Number(id.slice(2)),
    judul: `Judul ${id}`,
    teaser: 'Teaser.',
    durasi_menit: 5,
    rating: '17+',
    url: `/content/${id}.json`,
    versi_konten: '2026-10-22.1',
    review: { status: 'draft', oleh: null, tanggal: null },
    rilis: '2026-11-04',
    ...ubah,
  };
}

const MANIFEST: Manifest = { versi: 1, episodes: [entri('ep01'), entri('ep02')] };

function penyimpananPalsu(
  isi: Record<string, string> = {},
): Penyimpanan & { peta: Map<string, string> } {
  const peta = new Map(Object.entries(isi));
  return {
    peta,
    getItem: (k) => peta.get(k) ?? null,
    setItem: (k, v) => {
      peta.set(k, v);
    },
  };
}

type Jawaban = Response | Error | 'gantung';

/** fetch palsu: jawaban per URL; 'gantung' tidak pernah selesai kecuali dibatalkan. */
function fetchPalsu(jawaban: Record<string, Jawaban>) {
  const panggilan: string[] = [];
  const f = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    panggilan.push(url);
    const j = jawaban[url];
    if (j === undefined) {
      return Promise.reject(new TypeError(`tidak ada jawaban untuk ${url}`));
    }
    if (j === 'gantung') {
      return new Promise((_, tolak) => {
        init?.signal?.addEventListener('abort', () => {
          tolak(new DOMException('dibatalkan', 'AbortError'));
        });
      });
    }
    return j instanceof Error ? Promise.reject(j) : Promise.resolve(j.clone());
  };
  return { fetch: f, panggilan };
}

/** Cache Storage palsu yang cukup untuk open, match, put, keys, dan delete. */
function cachesPalsu() {
  const isi = new Map<string, Response>();
  const mutlak = (k: RequestInfo | URL) =>
    new URL(typeof k === 'string' ? k : k instanceof URL ? k.href : k.url, 'https://qissah.id')
      .href;
  const cache = {
    match: (k: RequestInfo | URL) => Promise.resolve(isi.get(mutlak(k))?.clone()),
    put: (k: RequestInfo | URL, r: Response) => {
      isi.set(mutlak(k), r);
      return Promise.resolve();
    },
    keys: () => Promise.resolve([...isi.keys()].map((k) => new Request(k))),
    delete: (k: RequestInfo | URL) => Promise.resolve(isi.delete(mutlak(k))),
  };
  return { caches: { open: () => Promise.resolve(cache) } as unknown as CacheStorage, isi };
}

const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

function lingkungan(f: typeof fetch, ubah: Partial<Lingkungan> = {}): Lingkungan {
  return { fetch: f, caches: null, penyimpanan: penyimpananPalsu(), ...ubah };
}

describe('muatManifest: network-first dengan cadangan', () => {
  test('jaringan berhasil: manifest dipakai dan salinannya disimpan', async () => {
    const { fetch } = fetchPalsu({ '/content/manifest.json': json(MANIFEST) });
    const penyimpanan = penyimpananPalsu();
    expect(await muatManifest('/content', lingkungan(fetch, { penyimpanan }))).toEqual(MANIFEST);
    expect(penyimpanan.peta.get('qissa.v1.manifest')).toBe(JSON.stringify(MANIFEST));
  });

  test('jaringan gagal, lambat, atau versi tak dikenal: salinan terakhir', async () => {
    const tersimpan = { 'qissa.v1.manifest': JSON.stringify(MANIFEST) };
    for (const j of [
      new TypeError('offline'),
      'gantung' as const,
      json({ ...MANIFEST, versi: 2 }),
    ]) {
      const { fetch } = fetchPalsu({ '/content/manifest.json': j });
      const ling = lingkungan(fetch, { penyimpanan: penyimpananPalsu(tersimpan) });
      expect(await muatManifest('/content', ling, 20)).toEqual(MANIFEST);
    }
  });

  test('tanpa jaringan dan tanpa salinan: null', async () => {
    const { fetch } = fetchPalsu({});
    expect(await muatManifest('/content', lingkungan(fetch))).toBeNull();
  });
});

describe('penyaringan rilis', () => {
  test('episode dengan rilis di masa depan disembunyikan; hari rilis sudah tampil', () => {
    const m: Manifest = {
      versi: 1,
      episodes: [entri('ep01', { rilis: '2026-11-04' }), entri('ep02', { rilis: '2026-11-05' })],
    };
    expect(episodeTerbit(m, '2026-11-03').map((e) => e.id)).toEqual([]);
    expect(episodeTerbit(m, '2026-11-04').map((e) => e.id)).toEqual(['ep01']);
  });

  test('tanggal mengikuti Asia/Jakarta', () => {
    expect(hariIniJakarta(new Date('2026-11-03T16:59:00Z'))).toBe('2026-11-03');
    expect(hariIniJakarta(new Date('2026-11-03T17:00:00Z'))).toBe('2026-11-04');
  });
});

describe('muatEpisode: cache-first dengan versi_konten', () => {
  const EPISODE = { format: 1, id: 'ep01' };

  test('pertama dari jaringan lalu disimpan; berikutnya dari cache tanpa jaringan', async () => {
    const { fetch, panggilan } = fetchPalsu({ '/content/ep01.json': json(EPISODE) });
    const { caches } = cachesPalsu();
    const ling = lingkungan(fetch, { caches });
    expect(await muatEpisode(entri('ep01'), ling)).toEqual(EPISODE);
    expect(await muatEpisode(entri('ep01'), ling)).toEqual(EPISODE);
    expect(panggilan).toEqual(['/content/ep01.json']);
  });

  test('versi_konten baru diunduh ulang dan versi lama dihapus dari cache', async () => {
    const { fetch, panggilan } = fetchPalsu({ '/content/ep01.json': json(EPISODE) });
    const { caches, isi } = cachesPalsu();
    const ling = lingkungan(fetch, { caches });
    await muatEpisode(entri('ep01'), ling);
    await muatEpisode(entri('ep01', { versi_konten: '2026-10-23.1' }), ling);
    expect(panggilan).toHaveLength(2);
    expect([...isi.keys()]).toEqual(['https://qissah.id/content/ep01.json?v=2026-10-23.1']);
  });

  test('tanpa Cache Storage: langsung dari jaringan setiap kali', async () => {
    const { fetch, panggilan } = fetchPalsu({ '/content/ep01.json': json(EPISODE) });
    const ling = lingkungan(fetch);
    await muatEpisode(entri('ep01'), ling);
    await muatEpisode(entri('ep01'), ling);
    expect(panggilan).toHaveLength(2);
  });

  test('jaringan gagal tanpa salinan, atau status bukan 2xx: GalatMuat', async () => {
    await expect(muatEpisode(entri('ep01'), lingkungan(fetchPalsu({}).fetch))).rejects.toThrow(
      GalatMuat,
    );
    const { fetch } = fetchPalsu({ '/content/ep01.json': new Response('', { status: 404 }) });
    await expect(muatEpisode(entri('ep01'), lingkungan(fetch))).rejects.toThrow('HTTP 404');
  });
});

describe('storage: kunci DATA-CONTRACTS §5', () => {
  test('kunci berawalan qissa.v1. dengan id ep01', () => {
    const s = penyimpananPalsu();
    tambahAkhir(s, 'ep01', 'Ga tau');
    simpanJalur(s, 'ep01', ['Tutup', 'Ga tau']);
    simpanRefleksi(s, 'ep01', 'teks');
    simpanPoll(s, 'Tutup');
    expect(Object.fromEntries(s.peta)).toEqual({
      'qissa.v1.ep01.akhir': '["Ga tau"]',
      'qissa.v1.ep01.jalur': '["Tutup","Ga tau"]',
      'qissa.v1.ep01.refleksi': '"teks"',
      'qissa.v1.ep01.poll': '"Tutup"',
    });
    expect([
      bacaAkhir(s, 'ep01'),
      bacaJalur(s, 'ep01'),
      bacaRefleksi(s, 'ep01'),
      bacaPoll(s),
    ]).toEqual([['Ga tau'], ['Tutup', 'Ga tau'], 'teks', 'Tutup']);
  });

  test('akhir tidak dicatat dua kali', () => {
    const s = penyimpananPalsu();
    tambahAkhir(s, 'ep01', 'Ga tau');
    expect(tambahAkhir(s, 'ep01', 'Ga tau')).toEqual(['Ga tau']);
  });

  test('isi rusak atau berbeda bentuk dibaca sebagai kosong', () => {
    const s = penyimpananPalsu({ 'qissa.v1.ep01.akhir': '{rusak', 'qissa.v1.ep01.jalur': '[1,2]' });
    expect(bacaAkhir(s, 'ep01')).toEqual([]);
    expect(bacaJalur(s, 'ep01')).toEqual([]);
  });

  test('storage penuh atau tidak tersedia: refleksi melaporkan gagal tanpa crash (SRS REF-2)', () => {
    const penuh: Penyimpanan = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('penuh', 'QuotaExceededError');
      },
    };
    expect(simpanRefleksi(penuh, 'ep01', 'teks')).toBe(false);
    expect(simpanRefleksi(null, 'ep01', 'teks')).toBe(false);
    expect(bacaRefleksi(null, 'ep01')).toBe('');
  });
});
