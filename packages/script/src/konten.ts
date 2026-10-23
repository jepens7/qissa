// Membaca content/ dari disk dan menyiapkan keluaran `qs compile` (docs/ARCHITECTURE.md §4 dan §7).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { bentukDalil } from './dalil.ts';
import { adaError, urutkan, type Diagnostic } from './diagnostics.ts';
import { lintProyek, type BerkasEpisode, type Proyek } from './proyek.ts';
import type { Episode, Manifest, ManifestEpisode } from './types.ts';
import { hashIsi, hitungVersi, tulisKunci, type BerkasKunci } from './versi.ts';

/** Path relatif dari akar repo dengan pemisah `/`, sama di Windows dan Linux. */
export function relatif(akar: string, path: string): string {
  return relative(akar, path).replaceAll('\\', '/');
}

function bacaBila(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** Semua episode di `<folderKonten>/episodes/*` beserta manifest-nya. */
export function bacaProyek(
  akar: string,
  folderKonten: string,
): { proyek: Proyek; diagnostik: Diagnostic[] } {
  const diagnostik: Diagnostic[] = [];
  const folderEpisode = join(folderKonten, 'episodes');
  const folders = existsSync(folderEpisode)
    ? readdirSync(folderEpisode, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];
  const episodes: BerkasEpisode[] = [];
  for (const folder of folders) {
    const naskah = join(folderEpisode, folder, 'episode.qs.md');
    const dalil = join(folderEpisode, folder, 'dalil.md');
    const sumber = bacaBila(naskah);
    if (sumber === null) {
      diagnostik.push({
        level: 'error',
        code: 'S1',
        file: relatif(akar, join(folderEpisode, folder)),
        line: 1,
        message: `Folder “${folder}” tidak berisi episode.qs.md.`,
      });
      continue;
    }
    episodes.push({
      folder,
      file: relatif(akar, naskah),
      sumber,
      dalilFile: relatif(akar, dalil),
      dalil: bacaBila(dalil),
    });
  }
  const manifest = join(folderKonten, 'manifest.json');
  return {
    proyek: { manifestFile: relatif(akar, manifest), manifest: bacaBila(manifest), episodes },
    diagnostik,
  };
}

export type Kompilasi = {
  /** Nama berkas di folder keluaran dan isinya; kosong bila ada error. */
  berkas: Map<string, string>;
  kunci: BerkasKunci;
  /** Berkas kunci perlu ditulis ulang (ada hash atau episode yang berubah). */
  kunciBerubah: boolean;
  diagnostik: Diagnostic[];
};

/**
 * JSON setiap episode (berindentasi dua spasi dan diakhiri newline, QISSA-SCRIPT §4, sama dengan golden
 * snapshot), manifest.json untuk episode yang terdaftar di content/manifest.json, dan berkas kunci
 * versinya. Tidak ada yang disiapkan bila ada error. Entri kunci episode yang keluar dari manifest
 * tetap disimpan sebagai riwayat, supaya versinya tidak terpakai ulang bila episode itu kembali.
 */
export function siapkanKompilasi(
  proyek: Proyek,
  kunciLama: BerkasKunci,
  hariIni: string,
): Kompilasi {
  const hasil = lintProyek(proyek);
  if (adaError(hasil.diagnostik)) {
    return {
      berkas: new Map(),
      kunci: kunciLama,
      kunciBerubah: false,
      diagnostik: hasil.diagnostik,
    };
  }

  const berkas = new Map<string, string>();
  const perId = new Map<string, { episode: Episode; json: string }>();
  for (const ep of hasil.episodes) {
    if (ep.dalil === null) {
      continue;
    }
    const episode: Episode = { ...ep.naskah.isi, dalil: bentukDalil(ep.dalil.ast) };
    const json = `${JSON.stringify(episode, null, 2)}\n`;
    berkas.set(`${episode.id}.json`, json);
    perId.set(episode.id, { episode, json });
  }

  const kunci: BerkasKunci = { ...kunciLama };
  const episodes: ManifestEpisode[] = [];
  for (const { id, data: entri } of hasil.manifest) {
    const data = perId.get(id);
    if (data === undefined) {
      continue;
    }
    const { episode, json } = data;
    const hash = hashIsi(json);
    const versi = hitungVersi(
      kunciLama[id],
      hash,
      hariIni,
      typeof entri['versi_konten'] === 'string' ? entri['versi_konten'] : undefined,
    );
    kunci[id] = { hash, versi };
    episodes.push({
      id,
      nomor: episode.nomor,
      judul: episode.judul,
      teaser: episode.meta.teaser,
      durasi_menit: episode.meta.durasi_menit,
      rating: episode.meta.rating,
      // Nama berkas tidak memuat versi; app memakai versi_konten sebagai kunci cache (ADR-017).
      url: `/content/${id}.json`,
      versi_konten: versi,
      review: {
        status: episode.dalil.status,
        oleh: episode.dalil.reviewed_by,
        tanggal: episode.dalil.reviewed_at,
      },
      rilis: typeof entri['rilis'] === 'string' ? entri['rilis'] : '',
    });
  }
  const manifest: Manifest = { versi: 1, episodes };
  berkas.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    berkas,
    kunci,
    kunciBerubah: tulisKunci(kunci) !== tulisKunci(kunciLama),
    diagnostik: urutkan(hasil.diagnostik),
  };
}
