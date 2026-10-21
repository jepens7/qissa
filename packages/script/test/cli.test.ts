import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { compileEpisode } from '../src/compile.ts';
import type { Manifest } from '../src/types.ts';
import { DALIL, NASKAH, bacaRepo } from './bantuan.ts';

const AKAR = fileURLToPath(new URL('../../../', import.meta.url));
const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

function qs(argumen: string[], env: Record<string, string> = {}) {
  const hasil = spawnSync(process.execPath, [CLI, ...argumen], {
    cwd: AKAR,
    encoding: 'utf8',
    env: { ...process.env, INIT_CWD: AKAR, GITHUB_ACTIONS: 'false', ...env },
  });
  return { kode: hasil.status, keluar: hasil.stdout, galat: hasil.stderr };
}

const sementara: string[] = [];
function folderSementara(): string {
  const folder = mkdtempSync(join(tmpdir(), 'qissa-qs-'));
  sementara.push(folder);
  return folder;
}
afterEach(() => {
  for (const f of sementara.splice(0)) {
    rmSync(f, { recursive: true, force: true });
  }
});

/** Salinan content/ yang boleh diubah tes. */
function salinKonten(): string {
  const folder = join(folderSementara(), 'content');
  cpSync(join(AKAR, 'content'), folder, { recursive: true });
  return folder;
}

const NASKAH_EP01 = 'episodes/ep01-tangkapan-layar/episode.qs.md';
const NASKAH_EP02 = 'episodes/ep02-transferan-nyasar/episode.qs.md';

function ubahBerkas(path: string, ubah: (isi: string) => string) {
  const isi = readFileSync(path, 'utf8');
  const baru = ubah(isi);
  if (baru === isi) {
    throw new Error(`${path} tidak berubah; teks yang diganti tidak ditemukan`);
  }
  writeFileSync(path, baru);
}

function versiDiKunci(konten: string): Record<string, string | undefined> {
  const kunci = JSON.parse(readFileSync(join(konten, 'versi-konten.lock.json'), 'utf8')) as Record<
    string,
    { versi: string }
  >;
  return Object.fromEntries(Object.entries(kunci).map(([id, e]) => [id, e.versi]));
}

describe('qs walk (BACKLOG B6)', () => {
  test('ep02 mencetak 9 jalur yang semuanya berakhir di END', () => {
    const { kode, keluar } = qs(['walk', 'ep02']);
    expect(kode).toBe(0);
    const baris = keluar.trimEnd().split('\n');
    expect(baris[0]).toBe('ep02 Transferan Nyasar: 9 jalur');
    expect(baris.filter((b) => b.endsWith('  END'))).toHaveLength(9);
    expect(baris).toContain('  2  Pakai dulu > Sebenernya         58 baris  END');
    expect(baris.at(-1)).toBe('Semua jalur berakhir di END.');
  });

  test('ep01 juga 9 jalur, semuanya END', () => {
    const { kode, keluar } = qs(['walk', 'ep01']);
    expect(kode).toBe(0);
    expect(keluar).toContain('ep01 Tangkapan Layar: 9 jalur');
    expect(keluar.split('\n').filter((b) => b.endsWith('  END'))).toHaveLength(9);
  });

  test('episode yang tidak ada', () => {
    expect(qs(['walk', 'ep99'])).toMatchObject({
      kode: 1,
      keluar: 'Episode “ep99” tidak ditemukan di content/episodes.\n',
    });
  });

  test('jalur yang berputar lewat pilihan: selesai seketika, dicetak, dan keluar 1', () => {
    const konten = salinKonten();
    ubahBerkas(join(konten, NASKAH_EP01), (s) =>
      s
        .replace('-> akhir_gatau #Ga tau', '-> pagi #Ga tau')
        .replace('-> akhir_cerita #Cerita semuanya', '-> pagi #Cerita semuanya'),
    );
    const { kode, keluar } = qs(['walk', 'ep01', '--in', konten]);
    expect(kode).toBe(1);
    expect(keluar.split('\n').filter((b) => b.endsWith('berputar ke knot “pagi”'))).toHaveLength(6);
    expect(keluar.trimEnd().split('\n').at(-1)).toBe('Ada jalur yang tidak berakhir di END.');
  });

  test('error lain dicetak sebagai konteks, tetapi semua jalur END berarti keluar 0', () => {
    const konten = salinKonten();
    ubahBerkas(join(konten, NASKAH_EP02), (s) =>
      s.replace('> Senin, 19.20.', '> Senin, 19.20. Lihat contoh.com.'),
    );
    const { kode, keluar } = qs(['walk', 'ep02', '--in', konten]);
    expect(keluar).toContain('L5  Tautan tidak boleh ada di naskah dan dalil.');
    expect(keluar.trimEnd().split('\n').at(-1)).toBe('Semua jalur berakhir di END.');
    expect(kode).toBe(0);
  });
});

describe('qs lint', () => {
  test('content/ apa adanya: tanpa error, tiga peringatan, keluar 0', () => {
    const { kode, keluar } = qs(['lint']);
    expect(kode).toBe(0);
    expect(keluar).toContain(
      'content/episodes/ep02-transferan-nyasar/episode.qs.md:195  W1  4 kartu narasi berturut-turut',
    );
    expect(keluar.trimEnd().split('\n').at(-1)).toBe('0 error, 3 peringatan.');
  });

  test('di GitHub Actions peringatan juga dicetak sebagai anotasi', () => {
    expect(qs(['lint'], { GITHUB_ACTIONS: 'true' }).keluar).toContain(
      '::warning file=content/episodes/ep02-transferan-nyasar/episode.qs.md,line=195,title=W1::4 kartu narasi',
    );
  });

  test('--wajib-review menolak episode draft dan keluar 1', () => {
    const { kode, keluar } = qs(['lint', '--wajib-review']);
    expect(kode).toBe(1);
    expect(keluar.trimEnd().split('\n').at(-1)).toBe('2 error, 3 peringatan.');
  });

  test('error di naskah membuat lint keluar 1', () => {
    const konten = salinKonten();
    const naskah = join(konten, 'episodes/ep01-tangkapan-layar/episode.qs.md');
    writeFileSync(naskah, readFileSync(naskah, 'utf8').replace('-> pagi', '-> pagii'));
    const { kode, keluar } = qs(['lint', '--in', konten]);
    expect(kode).toBe(1);
    expect(keluar).toContain('L2  Knot “pagii” tidak ada.');
  });

  test('putaran lewat pilihan dilaporkan di opsi yang kembali', () => {
    const konten = salinKonten();
    ubahBerkas(join(konten, NASKAH_EP01), (s) =>
      s
        .replace('-> akhir_gatau #Ga tau', '-> pagi #Ga tau')
        .replace('-> akhir_cerita #Cerita semuanya', '-> pagi #Cerita semuanya'),
    );
    const { kode, keluar } = qs(['lint', '--in', konten]);
    expect(kode).toBe(1);
    expect(keluar).toContain(
      `${NASKAH_EP01}:110  L2  Jalur “Buka > Ga tau” kembali ke knot “pagi” dengan nilai variabel yang sama`,
    );
    expect(keluar).toContain(`${NASKAH_EP01}:111  L2  Jalur “Buka > Cerita semuanya” kembali`);
  });
});

describe('qs compile', () => {
  test('menulis epNN.json dan manifest.json dengan rating dan versi_konten', () => {
    // Salinan content/, supaya tes tidak pernah menulis berkas kunci di repo.
    const keluaran = folderSementara();
    const { kode } = qs(['compile', '--in', salinKonten(), '--out', keluaran]);
    expect(kode).toBe(0);

    const manifest = JSON.parse(readFileSync(join(keluaran, 'manifest.json'), 'utf8')) as Manifest;
    expect(manifest.versi).toBe(1);
    expect(manifest.episodes[0]).toEqual({
      id: 'ep01',
      nomor: 1,
      judul: 'Tangkapan Layar',
      teaser:
        'Seorang teman mengirimkan tangkapan layar chat pribadi Nadia. Kamu belum membukanya. Tapi ibu jarimu sudah di atasnya.',
      durasi_menit: 5,
      rating: '17+',
      url: '/content/ep01.json',
      versi_konten: '2026-10-21.1',
      review: { status: 'draft', oleh: null, tanggal: null },
      rilis: '2026-11-04',
    });

    const harapan = compileEpisode(bacaRepo(NASKAH.ep01), {
      file: NASKAH.ep01,
      dalil: bacaRepo(DALIL.ep01),
      dalilFile: DALIL.ep01,
    }).episode;
    expect(JSON.parse(readFileSync(join(keluaran, 'ep01.json'), 'utf8'))).toEqual(harapan);
    // Berkas yang disajikan sama persis dengan golden snapshot: dua spasi, diakhiri newline (§4).
    for (const id of ['ep01', 'ep02']) {
      expect(readFileSync(join(keluaran, `${id}.json`), 'utf8')).toBe(
        bacaRepo(`packages/script/__snapshots__/${id}.json`),
      );
    }
  });

  test('--check tidak menulis apa pun, termasuk berkas kunci yang basi', () => {
    const konten = salinKonten();
    ubahBerkas(join(konten, NASKAH_EP01), (s) =>
      s.replace('Malam itu, 23.58.', 'Malam itu, 23.59.'),
    );
    const pathKunci = join(konten, 'versi-konten.lock.json');
    const kunciSebelum = readFileSync(pathKunci, 'utf8');
    const keluaran = join(folderSementara(), 'keluaran');
    const { kode } = qs(['compile', '--in', konten, '--out', keluaran, '--check']);
    expect(kode).toBe(1);
    expect(readFileSync(pathKunci, 'utf8')).toBe(kunciSebelum);
    expect(existsSync(keluaran)).toBe(false);
  });

  test('folder keluaran di dalam folder konten ditolak; manifest tulisan tangan utuh', () => {
    const konten = salinKonten();
    const manifest = readFileSync(join(konten, 'manifest.json'), 'utf8');
    for (const keluaran of [konten, join(konten, 'hasil')]) {
      const { kode, keluar } = qs(['compile', '--in', konten, '--out', keluaran]);
      expect(kode).toBe(1);
      expect(keluar).toContain('berada di dalam folder konten');
    }
    expect(readFileSync(join(konten, 'manifest.json'), 'utf8')).toBe(manifest);
    expect(existsSync(join(konten, 'ep01.json'))).toBe(false);
  });

  test('episode yang keluar dari manifest tetap tercatat di kunci, jadi versinya tidak terpakai ulang', () => {
    const konten = salinKonten();
    const pathManifest = join(konten, 'manifest.json');
    const asli = readFileSync(pathManifest, 'utf8');
    const data = JSON.parse(asli) as { versi: number; episodes: { id: string }[] };
    writeFileSync(
      pathManifest,
      JSON.stringify({ ...data, episodes: data.episodes.filter((e) => e.id !== 'ep02') }, null, 2),
    );
    expect(qs(['compile', '--in', konten, '--out', folderSementara()]).kode).toBe(0);
    expect(versiDiKunci(konten)['ep02']).toBe('2026-10-21.1');

    ubahBerkas(join(konten, NASKAH_EP02), (s) => s.replace('Senin, 19.20.', 'Senin, 19.21.'));
    writeFileSync(pathManifest, asli);
    expect(qs(['compile', '--in', konten, '--out', folderSementara()]).kode).toBe(0);
    expect(versiDiKunci(konten)['ep02']).not.toBe('2026-10-21.1');
  });

  test('berkas kunci yang rusak: pesan berbahasa Indonesia yang menyebut berkasnya', () => {
    const konten = salinKonten();
    writeFileSync(join(konten, 'versi-konten.lock.json'), '{ "ep01": ');
    const { kode, galat } = qs(['compile', '--in', konten, '--check']);
    expect(kode).toBe(1);
    expect(galat).toContain('versi-konten.lock.json bukan JSON yang sah');
  });

  test('entri manifest yang bukan objek: tidak ada berkas yang ditulis', () => {
    const konten = salinKonten();
    ubahBerkas(join(konten, 'manifest.json'), (s) => s.replace('\n  ]', ',\n    null\n  ]'));
    const keluaran = join(folderSementara(), 'keluaran');
    const { kode, keluar } = qs(['compile', '--in', konten, '--out', keluaran]);
    expect(kode).toBe(1);
    expect(keluar).toContain('Entri ke-3 di “episodes” harus objek dengan “id”');
    expect(keluar).toContain('Tidak ada berkas yang ditulis.');
    expect(existsSync(keluaran)).toBe(false);
  });

  test('--check: berkas kunci di repo mutakhir', () => {
    const { kode, keluar } = qs(['compile', '--check']);
    expect(kode).toBe(0);
    expect(keluar).toContain('content/versi-konten.lock.json mutakhir.');
  });

  test('naskah berubah: --check gagal, compile memberi versi baru hanya untuk episode itu', () => {
    const konten = salinKonten();
    const naskah = join(konten, 'episodes/ep01-tangkapan-layar/episode.qs.md');
    writeFileSync(
      naskah,
      readFileSync(naskah, 'utf8').replace('Malam itu, 23.58.', 'Malam itu, 23.59.'),
    );

    const periksa = qs(['compile', '--in', konten, '--check']);
    expect(periksa.kode).toBe(1);
    expect(periksa.keluar).toContain('basi: jalankan “pnpm qs compile”');

    expect(qs(['compile', '--in', konten, '--out', folderSementara()]).kode).toBe(0);
    const kunci = JSON.parse(
      readFileSync(join(konten, 'versi-konten.lock.json'), 'utf8'),
    ) as Record<string, { versi: string }>;
    expect(kunci['ep01']?.versi).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(kunci['ep01']?.versi).not.toBe('2026-10-21.1');
    expect(kunci['ep02']?.versi).toBe('2026-10-21.1');
  });

  test('ada error: tidak ada berkas yang ditulis dan keluar 1', () => {
    const konten = salinKonten();
    const naskah = join(konten, 'episodes/ep02-transferan-nyasar/episode.qs.md');
    writeFileSync(naskah, readFileSync(naskah, 'utf8').replace('@set dipakai', '@set dipakaii'));
    const keluaran = join(folderSementara(), 'keluaran');
    const { kode, keluar } = qs(['compile', '--in', konten, '--out', keluaran]);
    expect(kode).toBe(1);
    expect(keluar).toContain('Tidak ada berkas yang ditulis.');
    expect(existsSync(keluaran)).toBe(false);
  });
});

test('tanpa perintah: cetak pemakaian dan keluar 1', () => {
  const { kode, keluar } = qs([]);
  expect(kode).toBe(1);
  expect(keluar).toContain('Pemakaian:');
});
