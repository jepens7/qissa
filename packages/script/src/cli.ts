// CLI `qs` (docs/ARCHITECTURE.md §4). Dijalankan langsung oleh Node lewat type stripping:
// `pnpm qs <perintah>` sama dengan `node packages/script/src/cli.ts <perintah>`.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { adaError, anotasiGithub, urutkan, type Diagnostic } from './diagnostics.ts';
import { bacaProyek, relatif, siapkanKompilasi } from './konten.ts';
import { lintProyek } from './proyek.ts';
import { bacaKunci, hariIniJakarta, tulisKunci } from './versi.ts';
import { namaJalur } from './validate.ts';
import { BATAS_JALUR, panjang, walkEpisode, type Jalur } from './walk.ts';

const PEMAKAIAN = `Pemakaian:
  pnpm qs lint [--in content] [--wajib-review]
  pnpm qs compile [--in content] [--out apps/web/public/content] [--check]
  pnpm qs walk epNN [--in content]
`;

const BERKAS_KUNCI = 'versi-konten.lock.json';

function tulis(teks: string) {
  process.stdout.write(teks);
}

/** Akar repo: folder terdekat di atas CLI yang memuat pnpm-workspace.yaml. */
function cariAkar(dari: string): string {
  let folder = dari;
  while (!existsSync(join(folder, 'pnpm-workspace.yaml'))) {
    const induk = dirname(folder);
    if (induk === folder) {
      throw new Error('Akar repo (pnpm-workspace.yaml) tidak ditemukan.');
    }
    folder = induk;
  }
  return folder;
}

function cetakDiagnostik(daftar: readonly Diagnostic[]) {
  const github = process.env['GITHUB_ACTIONS'] === 'true';
  for (const d of urutkan(daftar)) {
    tulis(`${d.file}:${String(d.line)}  ${d.code}  ${d.message}\n`);
    if (github) {
      tulis(`${anotasiGithub(d)}\n`);
    }
  }
  const error = daftar.filter((d) => d.level === 'error').length;
  tulis(`${error} error, ${daftar.length - error} peringatan.\n`);
}

function perintahLint(akar: string, folderKonten: string, wajibReview: boolean): number {
  const { proyek, diagnostik } = bacaProyek(akar, folderKonten);
  const semua = [...diagnostik, ...lintProyek(proyek, { wajibReview }).diagnostik];
  cetakDiagnostik(semua);
  return adaError(semua) ? 1 : 0;
}

function perintahCompile(
  akar: string,
  folderKonten: string,
  folderKeluaran: string,
  periksa: boolean,
): number {
  // compile menghapus epNN.json dan manifest.json lama di folder keluaran; di dalam content/ itu akan
  // menimpa manifest yang ditulis tangan (ADR-014).
  const dariKonten = relative(folderKonten, folderKeluaran);
  if (
    dariKonten === '' ||
    (!dariKonten.startsWith(`..${sep}`) && dariKonten !== '..' && !isAbsolute(dariKonten))
  ) {
    tulis(
      `Folder keluaran ${relatif(akar, folderKeluaran)} berada di dalam folder konten ${relatif(akar, folderKonten)}; pilih folder lain, misalnya apps/web/public/content.\n`,
    );
    return 1;
  }

  const { proyek, diagnostik } = bacaProyek(akar, folderKonten);
  const pathKunci = join(folderKonten, BERKAS_KUNCI);
  const kunciLama = bacaKunci(
    existsSync(pathKunci) ? readFileSync(pathKunci, 'utf8') : null,
    relatif(akar, pathKunci),
  );
  const hasil = siapkanKompilasi(proyek, kunciLama, hariIniJakarta(new Date()));
  const semua = [...diagnostik, ...hasil.diagnostik];
  if (adaError(semua)) {
    cetakDiagnostik(semua);
    tulis('Tidak ada berkas yang ditulis.\n');
    return 1;
  }
  if (semua.length > 0) {
    cetakDiagnostik(semua);
  }

  const lokasiKunci = relatif(akar, pathKunci);
  if (periksa) {
    if (hasil.kunciBerubah) {
      tulis(
        `${lokasiKunci} basi: jalankan “pnpm qs compile”, lalu commit berkasnya bersama perubahan naskah.\n`,
      );
      return 1;
    }
    tulis(`${lokasiKunci} mutakhir.\n`);
    return 0;
  }

  mkdirSync(folderKeluaran, { recursive: true });
  for (const nama of readdirSync(folderKeluaran)) {
    if (nama === 'manifest.json' || /^ep\d+.*\.json$/.test(nama)) {
      rmSync(join(folderKeluaran, nama));
    }
  }
  for (const [nama, isi] of hasil.berkas) {
    writeFileSync(join(folderKeluaran, nama), isi);
  }
  if (hasil.kunciBerubah) {
    writeFileSync(pathKunci, tulisKunci(hasil.kunci));
    tulis(`${lokasiKunci} diperbarui.\n`);
  }
  const versi = Object.entries(hasil.kunci).map(([id, e]) => `${id} ${e.versi}`);
  tulis(
    `${hasil.berkas.size} berkas ditulis ke ${relatif(akar, folderKeluaran)} (${versi.join(', ')}).\n`,
  );
  return 0;
}

function perintahWalk(akar: string, folderKonten: string, id: string | undefined): number {
  if (id === undefined) {
    tulis(PEMAKAIAN);
    return 1;
  }
  const { proyek } = bacaProyek(akar, folderKonten);
  const hasil = lintProyek(proyek);
  const ep = hasil.episodes.find((e) => e.naskah.isi.id === id);
  if (ep === undefined) {
    tulis(`Episode “${id}” tidak ditemukan di ${relatif(akar, folderKonten)}/episodes.\n`);
    return 1;
  }
  // Error lain dicetak sebagai konteks; kode keluar walk hanya ditentukan akhir jalurnya (qs lint
  // yang menolak error).
  const kesalahan = ep.naskah.diagnostik.filter((d) => d.level === 'error');
  if (kesalahan.length > 0) {
    cetakDiagnostik(kesalahan);
  }

  const jalur = walkEpisode(ep.naskah.isi);
  const nama = jalur.map(namaJalur);
  const lebar = Math.max(...nama.map((n) => n.length));
  const lebarNomor = String(jalur.length).length;
  tulis(`${id} ${ep.naskah.isi.judul}: ${String(jalur.length)} jalur\n`);
  jalur.forEach((j, i) => {
    const nomor = String(i + 1).padStart(lebarNomor);
    tulis(
      `  ${nomor}  ${(nama[i] ?? '').padEnd(lebar)}  ${String(panjang(j)).padStart(3)} baris  ${akhirJalur(j)}\n`,
    );
  });
  const semuaEnd = jalur.every((j) => j.akhir === 'END');
  tulis(semuaEnd ? 'Semua jalur berakhir di END.\n' : 'Ada jalur yang tidak berakhir di END.\n');
  return semuaEnd ? 0 : 1;
}

function akhirJalur(j: Jalur): string {
  switch (j.akhir) {
    case 'END':
      return 'END';
    case 'putar':
      return `berputar ke knot “${j.putarKe ?? ''}”`;
    case 'panjang':
      return 'lebih dari 300 baris terlihat';
    case 'batas':
      return `dihentikan setelah ${String(BATAS_JALUR)} jalur`;
    case 'buntu':
      return `buntu di knot “${j.berhenti?.knot ?? ''}”`;
  }
}

function utama(argumen: string[]): number {
  const { values, positionals } = parseArgs({
    args: argumen,
    allowPositionals: true,
    options: {
      in: { type: 'string' },
      out: { type: 'string' },
      check: { type: 'boolean', default: false },
      'wajib-review': { type: 'boolean', default: false },
    },
  });
  const akar = cariAkar(import.meta.dirname);
  // Path dari pengguna relatif terhadap folder tempat pnpm dipanggil; bawaannya relatif ke akar repo.
  const asal = process.env['INIT_CWD'] ?? process.cwd();
  const folderKonten = values.in === undefined ? join(akar, 'content') : resolve(asal, values.in);
  const folderKeluaran =
    values.out === undefined ? join(akar, 'apps/web/public/content') : resolve(asal, values.out);

  const [perintah, ...sisa] = positionals;
  switch (perintah) {
    case 'lint':
      return perintahLint(akar, folderKonten, values['wajib-review']);
    case 'compile':
      return perintahCompile(akar, folderKonten, folderKeluaran, values.check);
    case 'walk':
      return perintahWalk(akar, folderKonten, sisa[0]);
    default:
      tulis(PEMAKAIAN);
      return 1;
  }
}

try {
  process.exitCode = utama(process.argv.slice(2));
} catch (galat) {
  process.stderr.write(`qs: ${galat instanceof Error ? galat.message : String(galat)}\n`);
  process.exitCode = 1;
}
