// BACKLOG D5: status episode di home benar setelah membaca ("Selesai. Akhir yang sudah dibaca: N dari 3"), dan
// poll Episode 1 hanya tampil bila App mengizinkan (selama manifest dimuat atau bila ep01 terbit).
import type { ManifestEpisode } from '@qissa/script/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { HomeScreen } from '../src/features/home/home-screen.tsx';
import type { Penyimpanan } from '../src/lib/storage.ts';

function entri(nomor: number): ManifestEpisode {
  const id = `ep0${String(nomor)}`;
  return {
    id,
    nomor,
    judul: `Judul ${id}`,
    teaser: 'Teaser.',
    durasi_menit: 5,
    rating: '17+',
    url: `/content/${id}.json`,
    versi_konten: '2026-10-22.1',
    review: { status: 'draft', oleh: null, tanggal: null },
    rilis: '2026-11-04',
  };
}

function render(isi: Record<string, string>, poll = true): string {
  const peta = new Map(Object.entries(isi));
  const penyimpanan: Penyimpanan = {
    getItem: (k) => peta.get(k) ?? null,
    setItem: (k, v) => {
      peta.set(k, v);
    },
  };
  return renderToStaticMarkup(
    <HomeScreen
      episodes={[entri(1), entri(2)]}
      poll={poll}
      gagal={false}
      penyimpanan={penyimpanan}
      waChannel={null}
      onOpen={() => undefined}
    />,
  );
}

function statusDi(isi: Record<string, string>): string[] {
  return [...render(isi).matchAll(/<span class="st">([^<]*)<\/span>/g)].map((m) => m[1] ?? '');
}

test('poll Episode 1 tampil hanya bila diizinkan', () => {
  expect(render({})).toContain('Tutup, jangan dibuka');
  expect(render({}, false)).not.toContain('Tutup, jangan dibuka');
});

test('belum dibaca: Episode 1 "Mulai dari sini", episode lain "Baru"', () => {
  expect(statusDi({})).toEqual(['Mulai dari sini', 'Baru']);
});

test('sesudah membaca: jumlah akhir berbeda dari 3', () => {
  expect(
    statusDi({
      'qissa.v1.ep01.akhir': JSON.stringify(['Ketemu dulu', 'Cerita semuanya']),
      'qissa.v1.ep02.akhir': JSON.stringify(['Aman']),
    }),
  ).toEqual([
    'Selesai. Akhir yang sudah dibaca: 2 dari 3',
    'Selesai. Akhir yang sudah dibaca: 1 dari 3',
  ]);
});
