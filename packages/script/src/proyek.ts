// Lint seluruh content/: setiap episode dan dalilnya, ditambah pemeriksaan lintas berkas
// (docs/QISSA-SCRIPT.md §6): id dan nama folder (L6), `berikutnya` (L2), dan kesesuaian
// content/manifest.json dengan front matter (L6) serta dalil.md (L7). Fungsi ini murni; CLI yang
// membaca berkasnya.
import { periksaDalil, periksaNaskah, type HasilNaskah, type OpsiLint } from './compile.ts';
import type { DalilAst } from './dalil.ts';
import { pengumpul, urutkan, type Diagnostic, type Lapor } from './diagnostics.ts';
import type { FieldFrontMatter } from './front-matter.ts';

export type BerkasEpisode = {
  /** Nama folder di content/episodes, mis. `ep01-tangkapan-layar`. */
  folder: string;
  /** Path episode.qs.md relatif dari akar repo. */
  file: string;
  sumber: string;
  /** Path dalil.md relatif dari akar repo. */
  dalilFile: string;
  /** Isi dalil.md; null bila berkasnya tidak ada. */
  dalil: string | null;
};

export type Proyek = {
  /** Path content/manifest.json relatif dari akar repo. */
  manifestFile: string;
  /** Isi content/manifest.json; null bila berkasnya tidak ada. */
  manifest: string | null;
  episodes: BerkasEpisode[];
};

export type EpisodeTerperiksa = {
  berkas: BerkasEpisode;
  naskah: HasilNaskah;
  dalil: { ast: DalilAst; diagnostik: Diagnostic[] } | null;
};

/** Entri content/manifest.json yang sah: objek ber-`id`, sekali per episode, dan punya folder. */
export type EntriManifest = { id: string; line: number; data: Record<string, unknown> };

export type HasilProyek = {
  episodes: EpisodeTerperiksa[];
  manifest: EntriManifest[];
  diagnostik: Diagnostic[];
};

const BOM = String.fromCharCode(0xfeff);

function teks(field: FieldFrontMatter | undefined): string | null {
  return field?.nilai.kind === 'teks' ? field.nilai.teks : null;
}

function adalahObjek(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === 'object' && nilai !== null && !Array.isArray(nilai);
}

/** Baris pertama yang memuat `teks`, atau 1. */
function barisPertama(baris: readonly string[], teks: string): number {
  const i = baris.findIndex((b) => b.includes(teks));
  return i === -1 ? 1 : i + 1;
}

/** Baris kemunculan ke-`ke` (mulai 0) `"id": "<id>"`, untuk nomor baris diagnostik per entri. */
function barisEntri(baris: readonly string[], id: string, ke: number): number {
  const cocok = baris.flatMap((b, i) => (b.includes(`"id": "${id}"`) ? [i + 1] : []));
  return cocok[ke] ?? barisPertama(baris, '"episodes"');
}

/** Baris kesalahan JSON.parse dari posisi di pesannya, bila ada. */
function barisGalatJson(sumber: string, galat: unknown): number {
  const posisi = /position (\d+)/.exec(galat instanceof Error ? galat.message : '');
  return posisi === null ? 1 : sumber.slice(0, Number(posisi[1])).split('\n').length;
}

/** Entri episodes yang sah; entri yang bukan objek ber-`id` (S1) atau kembar (L6) dilaporkan. */
function bacaManifest(proyek: Proyek, lapor: Lapor): EntriManifest[] {
  if (proyek.manifest === null) {
    lapor('S1', 1, 'content/manifest.json tidak ada.');
    return [];
  }
  const sumber = proyek.manifest.startsWith(BOM) ? proyek.manifest.slice(1) : proyek.manifest;
  const baris = sumber.split(/\r?\n/);
  let data: unknown;
  try {
    data = JSON.parse(sumber);
  } catch (galat) {
    lapor('S1', barisGalatJson(sumber, galat), 'manifest.json bukan JSON yang sah.');
    return [];
  }
  const episodes = adalahObjek(data) ? data['episodes'] : undefined;
  if (!Array.isArray(episodes)) {
    lapor('S1', 1, 'manifest.json harus berupa objek yang memuat daftar “episodes”.');
    return [];
  }

  const entri: EntriManifest[] = [];
  const kemunculan = new Map<string, number>();
  episodes.forEach((e: unknown, i) => {
    const id = adalahObjek(e) ? e['id'] : undefined;
    if (!adalahObjek(e) || typeof id !== 'string' || id === '') {
      lapor(
        'S1',
        barisPertama(baris, '"episodes"'),
        `Entri ke-${String(i + 1)} di “episodes” harus objek dengan “id”, misalnya { "id": "ep01", … }.`,
      );
      return;
    }
    const ke = kemunculan.get(id) ?? 0;
    kemunculan.set(id, ke + 1);
    const line = barisEntri(baris, id, ke);
    if (ke > 0) {
      lapor('L6', line, `Episode “${id}” ditulis dua kali di manifest.`);
      return;
    }
    entri.push({ id, line, data: e });
  });
  return entri;
}

/** Lint semua episode di content/ beserta pemeriksaan lintas berkas. */
export function lintProyek(
  proyek: Proyek,
  opsi: Pick<OpsiLint, 'wajibReview' | 'daftar'> = {},
): HasilProyek {
  const diagnostik: Diagnostic[] = [];
  const episodes: EpisodeTerperiksa[] = proyek.episodes.map((berkas) => {
    const naskah = periksaNaskah(berkas.sumber, { file: berkas.file, ...opsi });
    diagnostik.push(...naskah.diagnostik);
    if (berkas.dalil === null) {
      diagnostik.push({
        level: 'error',
        code: 'L7',
        file: berkas.dalilFile,
        line: 1,
        message: 'dalil.md tidak ada; setiap episode wajib punya kartu dalil.',
      });
      return { berkas, naskah, dalil: null };
    }
    const dalil = periksaDalil(berkas.dalil, { dalilFile: berkas.dalilFile, ...opsi });
    diagnostik.push(...dalil.diagnostik);
    return { berkas, naskah, dalil };
  });

  // id unik dan sama dengan awalan folder; berikutnya menunjuk episode yang ada.
  const perId = new Map<string, EpisodeTerperiksa>();
  for (const ep of episodes) {
    const { lapor } = pengumpul(ep.berkas.file, diagnostik);
    const id = ep.naskah.isi.id;
    const lineId = ep.naskah.ast.frontMatter.get('id')?.line ?? 1;
    const awalan = ep.berkas.folder.split('-')[0] ?? '';
    if (id !== '' && id !== awalan) {
      lapor('L6', lineId, `“id” ${id} tidak sama dengan awalan folder “${ep.berkas.folder}”.`);
    }
    const lain = perId.get(id);
    if (id !== '' && lain !== undefined) {
      lapor('L6', lineId, `“id” ${id} juga dipakai ${lain.berkas.file}.`);
    } else {
      perId.set(id, ep);
    }
  }
  for (const ep of episodes) {
    const berikutnya = ep.naskah.isi.meta.berikutnya;
    if (berikutnya !== null && /^ep\d{2,}$/.test(berikutnya) && !perId.has(berikutnya)) {
      const { lapor } = pengumpul(ep.berkas.file, diagnostik);
      lapor(
        'L2',
        ep.naskah.ast.frontMatter.get('berikutnya')?.line ?? 1,
        `“berikutnya” menunjuk ${berikutnya}, yang tidak ada di content/episodes.`,
      );
    }
  }

  // content/manifest.json: setiap entri punya folder, dan field ganda sama dengan sumbernya.
  const manifest = pengumpul(proyek.manifestFile, diagnostik);
  const terdaftar: EntriManifest[] = [];
  for (const { id, line, data: entri } of bacaManifest(proyek, manifest.lapor)) {
    const ep = perId.get(id);
    if (ep === undefined) {
      manifest.lapor(
        'L2',
        line,
        `Episode “${id}” di manifest tidak punya folder di content/episodes.`,
      );
      continue;
    }
    terdaftar.push({ id, line, data: entri });
    // Sampai M3a, qs compile selalu menulis /content/epNN.json (DATA-CONTRACTS §2).
    const url = `/content/${id}.json`;
    if (entri['url'] !== undefined && entri['url'] !== url) {
      manifest.lapor(
        'L6',
        line,
        `“url” ${id} di manifest harus ${url}, berkas yang ditulis qs compile.`,
      );
    }
    const isi = ep.naskah.isi;
    const sama: [string, unknown, unknown][] = [
      ['nomor', entri['nomor'], isi.nomor],
      ['judul', entri['judul'], isi.judul],
      ['teaser', entri['teaser'], isi.meta.teaser],
      ['durasi_menit', entri['durasi_menit'], isi.meta.durasi_menit],
    ];
    for (const [key, diManifest, diNaskah] of sama) {
      if (diManifest !== diNaskah) {
        manifest.lapor(
          'L6',
          line,
          `“${key}” ${id} di manifest berbeda dengan front matter ${ep.berkas.file}.`,
        );
      }
    }
    const rilis = entri['rilis'];
    if (typeof rilis !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rilis)) {
      manifest.lapor('L6', line, `“rilis” ${id} harus tanggal berformat YYYY-MM-DD.`);
    }
    if (ep.dalil !== null) {
      const fm = ep.dalil.ast.frontMatter;
      const review = entri['review'] as Record<string, unknown> | undefined;
      const pasangan: [string, string | null][] = [
        ['status', teks(fm.get('status'))],
        ['oleh', teks(fm.get('reviewed_by'))],
        ['tanggal', teks(fm.get('reviewed_at'))],
      ];
      for (const [key, diDalil] of pasangan) {
        if ((review?.[key] ?? null) !== diDalil) {
          manifest.lapor(
            'L7',
            line,
            `“review.${key}” ${id} di manifest berbeda dengan front matter ${ep.berkas.dalilFile}.`,
          );
        }
      }
    }
  }

  return { episodes, manifest: terdaftar, diagnostik: urutkan(diagnostik) };
}
