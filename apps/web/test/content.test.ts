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

/** Cache Storage palsu yang cukup untuk open, match, put, keys, dan delete; put bisa dibuat menolak. */
function cachesPalsu() {
  const isi = new Map<string, Response>();
  const kontrol = { tolakPut: false };
  const mutlak = (k: RequestInfo | URL) =>
    new URL(typeof k === 'string' ? k : k instanceof URL ? k.href : k.url, 'https://qissah.id')
      .href;
  const cache = {
    match: (k: RequestInfo | URL) => Promise.resolve(isi.get(mutlak(k))?.clone()),
    put: (k: RequestInfo | URL, r: Response) => {
      if (kontrol.tolakPut) {
        return Promise.reject(new DOMException('penuh', 'QuotaExceededError'));
      }
      isi.set(mutlak(k), r);
      return Promise.resolve();
    },
    keys: () => Promise.resolve([...isi.keys()].map((k) => new Request(k))),
    delete: (k: RequestInfo | URL) => Promise.resolve(isi.delete(mutlak(k))),
  };
  return {
    caches: { open: () => Promise.resolve(cache) } as unknown as CacheStorage,
    isi,
    kontrol,
  };
}

/** Respons 200 yang body-nya putus di tengah unduhan. */
const putus = () =>
  new Response(
    new ReadableStream({
      start(c) {
        c.error(new TypeError('koneksi putus'));
      },
    }),
    { status: 200 },
  );

const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

/** fetch yang menjawab `data` sesudah `ms`, dan menolak bila dibatalkan seperti fetch sungguhan. */
function fetchLambat(data: unknown, ms: number) {
  return (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    new Promise((selesai, tolak) => {
      const waktu = setTimeout(() => {
        selesai(json(data));
      }, ms);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(waktu);
        tolak(new DOMException('dibatalkan', 'AbortError'));
      });
    });
}

/** fetch yang mengirim header 200 dan sepotong body, lalu macet sampai dibatalkan seperti fetch sungguhan. */
function fetchBodyMacet(potongan: string) {
  return (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(potongan));
        init?.signal?.addEventListener('abort', () => {
          c.error(new DOMException('dibatalkan', 'AbortError'));
        });
      },
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  };
}

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

  test('header tiba tetapi body macet, dengan salinan: salinan dipakai setelah batas waktu', async () => {
    const tersimpan = { 'qissa.v1.manifest': JSON.stringify(MANIFEST) };
    const ling = lingkungan(fetchBodyMacet('{"versi":1,'), {
      penyimpanan: penyimpananPalsu(tersimpan),
    });
    expect(await muatManifest('/content', ling, 20)).toEqual(MANIFEST);
  });

  test('manifest dari URL absolut (APK, H2): URL episode di-resolve terhadap URL manifest', async () => {
    const base = 'https://qissah.id/content';
    const mutlak = MANIFEST.episodes.map((e) => `https://qissah.id${e.url}`);
    const { fetch } = fetchPalsu({ [`${base}/manifest.json`]: json(MANIFEST) });
    const penyimpanan = penyimpananPalsu();
    const dariJaringan = await muatManifest(base, lingkungan(fetch, { penyimpanan }));
    expect(dariJaringan?.episodes.map((e) => e.url)).toEqual(mutlak);
    // Salinan disimpan apa adanya, lalu di-resolve juga saat dipakai sebagai cadangan.
    expect(penyimpanan.peta.get('qissa.v1.manifest')).toBe(JSON.stringify(MANIFEST));
    const offline = lingkungan(fetchPalsu({}).fetch, { penyimpanan });
    expect((await muatManifest(base, offline))?.episodes.map((e) => e.url)).toEqual(mutlak);
    // Di web, base relatif: manifest dipakai apa adanya.
    const relatif = fetchPalsu({ '/content/manifest.json': json(MANIFEST) });
    expect(await muatManifest('/content', lingkungan(relatif.fetch))).toEqual(MANIFEST);
  });

  test('lambat tanpa salinan: jawaban jaringan ditunggu melewati batas waktu', async () => {
    const penyimpanan = penyimpananPalsu();
    const ling = lingkungan(fetchLambat(MANIFEST, 60), { penyimpanan });
    expect(await muatManifest('/content', ling, 20)).toEqual(MANIFEST);
    expect(penyimpanan.peta.has('qissa.v1.manifest')).toBe(true);
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

  test('versi baru belum tersimpan dan jaringan gagal atau server menolak: versi lama dipakai (G2)', async () => {
    const LAMA = { format: 1, id: 'ep01', isi: 'lama' };
    const { caches, isi } = cachesPalsu();
    await muatEpisode(
      entri('ep01'),
      lingkungan(fetchPalsu({ '/content/ep01.json': json(LAMA) }).fetch, { caches }),
    );
    const baru = entri('ep01', { versi_konten: '2026-10-23.1' });
    expect(await muatEpisode(baru, lingkungan(fetchPalsu({}).fetch, { caches }))).toEqual(LAMA);
    const { fetch } = fetchPalsu({ '/content/ep01.json': new Response('', { status: 503 }) });
    expect(await muatEpisode(baru, lingkungan(fetch, { caches }))).toEqual(LAMA);
    // Versi lama tetap tersimpan sampai versi baru berhasil diunduh.
    expect([...isi.keys()]).toEqual(['https://qissah.id/content/ep01.json?v=2026-10-22.1']);
  });

  test('versi lama baru dihapus setelah versi baru tersimpan: cache penuh atau unduhan putus (G2)', async () => {
    const LAMA = { format: 1, id: 'ep01', isi: 'lama' };
    const BARU = { format: 1, id: 'ep01', isi: 'baru' };
    const { caches, isi, kontrol } = cachesPalsu();
    await muatEpisode(
      entri('ep01'),
      lingkungan(fetchPalsu({ '/content/ep01.json': json(LAMA) }).fetch, { caches }),
    );
    const baru = entri('ep01', { versi_konten: '2026-10-23.1' });
    const kunciLama = ['https://qissah.id/content/ep01.json?v=2026-10-22.1'];

    kontrol.tolakPut = true;
    const online = lingkungan(fetchPalsu({ '/content/ep01.json': json(BARU) }).fetch, { caches });
    expect(await muatEpisode(baru, online)).toEqual(BARU);
    expect([...isi.keys()]).toEqual(kunciLama);
    kontrol.tolakPut = false;

    const terputus = lingkungan(fetchPalsu({ '/content/ep01.json': putus() }).fetch, { caches });
    expect(await muatEpisode(baru, terputus)).toEqual(LAMA);
    expect([...isi.keys()]).toEqual(kunciLama);
    expect(await muatEpisode(baru, lingkungan(fetchPalsu({}).fetch, { caches }))).toEqual(LAMA);
  });

  test('versi baru menggantung dan versi lama tersimpan: versi lama dipakai setelah batas waktu', async () => {
    const LAMA = { format: 1, id: 'ep01', isi: 'lama' };
    const { caches, isi } = cachesPalsu();
    await muatEpisode(
      entri('ep01'),
      lingkungan(fetchPalsu({ '/content/ep01.json': json(LAMA) }).fetch, { caches }),
    );
    const baru = entri('ep01', { versi_konten: '2026-10-23.1' });
    const { fetch } = fetchPalsu({ '/content/ep01.json': 'gantung' });
    expect(await muatEpisode(baru, lingkungan(fetch, { caches }), 20)).toEqual(LAMA);
    expect([...isi.keys()]).toEqual(['https://qissah.id/content/ep01.json?v=2026-10-22.1']);
  });

  test('versi baru dengan body macet dan versi lama tersimpan: versi lama dipakai setelah batas waktu', async () => {
    const LAMA = { format: 1, id: 'ep01', isi: 'lama' };
    const { caches } = cachesPalsu();
    await muatEpisode(
      entri('ep01'),
      lingkungan(fetchPalsu({ '/content/ep01.json': json(LAMA) }).fetch, { caches }),
    );
    const baru = entri('ep01', { versi_konten: '2026-10-23.1' });
    const ling = lingkungan(fetchBodyMacet('{"format":1,'), { caches });
    expect(await muatEpisode(baru, ling, 20)).toEqual(LAMA);
  });

  test('versi baru lambat tanpa versi lama: jawaban jaringan ditunggu melewati batas waktu', async () => {
    // Cache Storage ada tetapi kosong, seperti di produksi pada kunjungan pertama.
    const { caches } = cachesPalsu();
    const ling = lingkungan(fetchLambat(EPISODE, 60), { caches });
    expect(await muatEpisode(entri('ep01'), ling, 20)).toEqual(EPISODE);
  });

  test('cadangan dengan format yang tidak dikenal shell tidak dipakai (ADR-015)', async () => {
    const { caches } = cachesPalsu();
    await muatEpisode(
      entri('ep01'),
      lingkungan(fetchPalsu({ '/content/ep01.json': json({ format: 99, id: 'ep01' }) }).fetch, {
        caches,
      }),
    );
    const baru = entri('ep01', { versi_konten: '2026-10-23.1' });
    await expect(muatEpisode(baru, lingkungan(fetchPalsu({}).fetch, { caches }))).rejects.toThrow(
      'jaringan tidak tersedia',
    );
  });

  test('JSON rusak tanpa cadangan: GalatMuat “rusak”', async () => {
    const { fetch } = fetchPalsu({ '/content/ep01.json': new Response('{', { status: 200 }) });
    await expect(muatEpisode(entri('ep01'), lingkungan(fetch))).rejects.toThrow(
      'rusak: bukan JSON yang sah',
    );
  });

  test('versi lama episode lain tidak dipakai sebagai cadangan', async () => {
    const { caches } = cachesPalsu();
    await muatEpisode(
      entri('ep10'),
      lingkungan(fetchPalsu({ '/content/ep10.json': json({ format: 1, id: 'ep10' }) }).fetch, {
        caches,
      }),
    );
    await expect(
      muatEpisode(entri('ep01'), lingkungan(fetchPalsu({}).fetch, { caches })),
    ).rejects.toThrow(GalatMuat);
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
