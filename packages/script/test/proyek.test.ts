import { describe, expect, test } from 'vitest';
import { lintProyek, type BerkasEpisode, type Proyek } from '../src/proyek.ts';
import { DALIL, NASKAH, bacaRepo } from './bantuan.ts';

const MANIFEST = 'content/manifest.json';

function episode(id: 'ep01' | 'ep02', ubah: Partial<BerkasEpisode> = {}): BerkasEpisode {
  return {
    folder: NASKAH[id].split('/')[2] ?? '',
    file: NASKAH[id],
    sumber: bacaRepo(NASKAH[id]),
    dalilFile: DALIL[id],
    dalil: bacaRepo(DALIL[id]),
    ...ubah,
  };
}

function proyek(ubah: Partial<Proyek> = {}): Proyek {
  return {
    manifestFile: MANIFEST,
    manifest: bacaRepo(MANIFEST),
    episodes: [episode('ep01'), episode('ep02')],
    ...ubah,
  };
}

const kesalahan = (p: Proyek, opsi = {}) =>
  lintProyek(p, opsi)
    .diagnostik.filter((d) => d.level === 'error')
    .map((d) => `${d.code} ${d.file}:${d.line}: ${d.message}`);

describe('lintProyek', () => {
  test('content/ apa adanya: tanpa error, hanya tiga peringatan W1 di ep02', () => {
    const { diagnostik } = lintProyek(proyek());
    expect(diagnostik.filter((d) => d.level === 'error')).toEqual([]);
    expect(diagnostik.map((d) => `${d.code} ${d.file}:${d.line}`)).toEqual([
      `W1 ${NASKAH.ep02}:195`,
      `W1 ${NASKAH.ep02}:207`,
      `W1 ${NASKAH.ep02}:211`,
    ]);
  });

  test('L6: id tidak sama dengan awalan folder', () => {
    expect(
      kesalahan(proyek({ episodes: [episode('ep01', { folder: 'ep03-salah' }), episode('ep02')] })),
    ).toEqual([`L6 ${NASKAH.ep01}:2: “id” ep01 tidak sama dengan awalan folder “ep03-salah”.`]);
  });

  test('L6: id dipakai dua episode', () => {
    const kembar = episode('ep01', {
      folder: 'ep01-kembar',
      file: 'content/episodes/ep01-kembar/episode.qs.md',
    });
    expect(kesalahan(proyek({ episodes: [episode('ep01'), kembar, episode('ep02')] }))).toEqual([
      `L6 content/episodes/ep01-kembar/episode.qs.md:2: “id” ep01 juga dipakai ${NASKAH.ep01}.`,
    ]);
  });

  test('L2: berikutnya dan entri manifest yang tidak punya folder', () => {
    expect(kesalahan(proyek({ episodes: [episode('ep01')] }))).toEqual([
      `L2 ${NASKAH.ep01}:18: “berikutnya” menunjuk ep02, yang tidak ada di content/episodes.`,
      `L2 ${MANIFEST}:16: Episode “ep02” di manifest tidak punya folder di content/episodes.`,
    ]);
  });

  test('L6 dan L7: field manifest berbeda dengan front matter dan dalil.md', () => {
    const manifest = bacaRepo(MANIFEST)
      .replace('"judul": "Tangkapan Layar"', '"judul": "Tangkapan"')
      .replace(
        '"review": { "status": "draft", "oleh": null, "tanggal": null },\n      "rilis": "2026-11-04"\n    },\n    {\n      "id": "ep02"',
        '"review": { "status": "reviewed", "oleh": null, "tanggal": null },\n      "rilis": "2026-11-04"\n    },\n    {\n      "id": "ep02"',
      );
    expect(kesalahan(proyek({ manifest }))).toEqual([
      `L6 ${MANIFEST}:5: “judul” ep01 di manifest berbeda dengan front matter ${NASKAH.ep01}.`,
      `L7 ${MANIFEST}:5: “review.status” ep01 di manifest berbeda dengan front matter ${DALIL.ep01}.`,
    ]);
  });

  test.each([
    ['nomor', '"nomor": 1,', '"nomor": 3,'],
    ['teaser', '"teaser": "Seorang teman', '"teaser": "Teman'],
    ['durasi_menit', '"durasi_menit": 5,', '"durasi_menit": 6,'],
  ])('L6: %s di manifest berbeda dengan front matter', (key, dari, ke) => {
    expect(kesalahan(proyek({ manifest: bacaRepo(MANIFEST).replace(dari, ke) }))).toEqual([
      `L6 ${MANIFEST}:5: “${key}” ep01 di manifest berbeda dengan front matter ${NASKAH.ep01}.`,
    ]);
  });

  test.each([
    ['oleh', '"oleh": null', '"oleh": "Pereview Uji"'],
    ['tanggal', '"tanggal": null', '"tanggal": "2026-11-10"'],
  ])('L7: review.%s di manifest berbeda dengan dalil.md', (key, dari, ke) => {
    expect(kesalahan(proyek({ manifest: bacaRepo(MANIFEST).replace(dari, ke) }))).toEqual([
      `L7 ${MANIFEST}:5: “review.${key}” ep01 di manifest berbeda dengan front matter ${DALIL.ep01}.`,
    ]);
  });

  test('L6: episode ditulis dua kali di manifest, dilaporkan di entri keduanya', () => {
    const asli = bacaRepo(MANIFEST);
    const ep01 = asli.slice(asli.indexOf('    {'), asli.indexOf('    },') + '    }'.length);
    const manifest = asli.replace('\n  ]', `,\n${ep01}\n  ]`);
    const kedua = manifest.split('\n').findLastIndex((b) => b.includes('"id": "ep01"')) + 1;
    expect(kedua).toBeGreaterThan(16);
    expect(kesalahan(proyek({ manifest }))).toEqual([
      `L6 ${MANIFEST}:${String(kedua)}: Episode “ep01” ditulis dua kali di manifest.`,
    ]);
  });

  test('S1: entri episodes yang bukan objek ber-id', () => {
    const pesan = (ke: number, line: number) =>
      `S1 ${MANIFEST}:${String(line)}: Entri ke-${String(ke)} di “episodes” harus objek dengan “id”, misalnya { "id": "ep01", … }.`;
    expect(kesalahan(proyek({ manifest: '{ "versi": 1, "episodes": ["ep01", "ep02"] }' }))).toEqual(
      [pesan(1, 1), pesan(2, 1)],
    );
    const denganNull = bacaRepo(MANIFEST).replace('\n  ]', ',\n    null\n  ]');
    expect(kesalahan(proyek({ manifest: denganNull }))).toEqual([pesan(3, 3)]);
  });

  test('L6: url tidak sama dengan berkas yang ditulis qs compile', () => {
    const manifest = bacaRepo(MANIFEST).replace(
      '"url": "/content/ep02.json"',
      '"url": "/content/ep01.json"',
    );
    expect(kesalahan(proyek({ manifest }))).toEqual([
      `L6 ${MANIFEST}:16: “url” ep02 di manifest harus /content/ep02.json, berkas yang ditulis qs compile.`,
    ]);
  });

  test('manifest.json yang diawali BOM tetap terbaca', () => {
    const manifest = `${String.fromCharCode(0xfeff)}${bacaRepo(MANIFEST)}`;
    expect(kesalahan(proyek({ manifest }))).toEqual([]);
  });

  test('S1: manifest.json tidak sah, di baris kesalahannya', () => {
    expect(kesalahan(proyek({ manifest: '{ "versi": 1, ' }))).toEqual([
      `S1 ${MANIFEST}:1: manifest.json bukan JSON yang sah.`,
    ]);
    expect(kesalahan(proyek({ manifest: '{\n  "versi": 1,\n  "episodes": [\n    {,\n' }))).toEqual([
      `S1 ${MANIFEST}:4: manifest.json bukan JSON yang sah.`,
    ]);
  });

  test('entri manifest yang sah dikembalikan untuk qs compile', () => {
    expect(lintProyek(proyek()).manifest.map((e) => [e.id, e.line])).toEqual([
      ['ep01', 5],
      ['ep02', 16],
    ]);
  });

  test('L7: dalil.md tidak ada', () => {
    expect(
      kesalahan(proyek({ episodes: [episode('ep01', { dalil: null }), episode('ep02')] })),
    ).toEqual([`L7 ${DALIL.ep01}:1: dalil.md tidak ada; setiap episode wajib punya kartu dalil.`]);
  });

  test('L7: --wajib-review menolak kedua episode yang masih draft', () => {
    expect(kesalahan(proyek(), { wajibReview: true })).toEqual([
      `L7 ${DALIL.ep01}:2: Episode belum direview ulama (status: draft); gerbang produksi --wajib-review menolaknya.`,
      `L7 ${DALIL.ep02}:2: Episode belum direview ulama (status: draft); gerbang produksi --wajib-review menolaknya.`,
    ]);
  });
});
