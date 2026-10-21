// Konfigurasi lingkungan dari variabel VITE_* (docs/DATA-CONTRACTS.md §1).
// cekEnv juga dipakai vite.config.ts, jadi modul ini tidak boleh membaca import.meta.env saat dimuat.

export type AppConfig = {
  readonly siteUrl: string;
  readonly contentBase: string;
  readonly umamiScript: string | null;
  readonly umamiId: string | null;
  readonly waChannel: string | null;
  readonly pbUrl: string | null;
  readonly appVersion: string;
};

type Env = Readonly<Record<string, unknown>>;

const URL_PENUH = /^https?:\/\/[^/\s]+/;

function teks(env: Env, key: string): string {
  const nilai = env[key];
  return typeof nilai === 'string' ? nilai.trim() : '';
}

function opsional(env: Env, key: string): string | null {
  const nilai = teks(env, key);
  return nilai === '' ? null : nilai;
}

function tanpaGarisMiringAkhir(nilai: string): string {
  return nilai.replace(/\/+$/, '');
}

/** Daftar masalah konfigurasi dalam bahasa Indonesia; kosong bila semua wajib terisi dengan benar. */
export function cekEnv(env: Env): string[] {
  const masalah: string[] = [];

  const siteUrl = teks(env, 'VITE_SITE_URL');
  if (siteUrl === '') {
    masalah.push('VITE_SITE_URL kosong; isi dengan URL situs, misalnya https://qissa.id.');
  } else if (!URL_PENUH.test(siteUrl)) {
    masalah.push(`VITE_SITE_URL harus URL lengkap yang diawali https://, bukan “${siteUrl}”.`);
  }

  const contentBase = teks(env, 'VITE_CONTENT_BASE');
  if (contentBase === '') {
    masalah.push('VITE_CONTENT_BASE kosong; isi dengan lokasi konten, misalnya /content.');
  } else if (!contentBase.startsWith('/') && !URL_PENUH.test(contentBase)) {
    masalah.push(`VITE_CONTENT_BASE harus diawali / atau https://, bukan “${contentBase}”.`);
  }

  return masalah;
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
  readonly masalah: readonly string[];

  constructor(masalah: readonly string[]) {
    super(`Konfigurasi apps/web belum lengkap:\n${masalah.map((m) => `- ${m}`).join('\n')}`);
    this.masalah = masalah;
  }
}

/** Membaca env menjadi AppConfig; melempar ConfigError bila variabel wajib kosong atau salah. */
export function parseConfig(env: Env, versiCadangan: string): AppConfig {
  const masalah = cekEnv(env);
  if (masalah.length > 0) {
    throw new ConfigError(masalah);
  }
  return {
    siteUrl: tanpaGarisMiringAkhir(teks(env, 'VITE_SITE_URL')),
    contentBase: tanpaGarisMiringAkhir(teks(env, 'VITE_CONTENT_BASE')),
    umamiScript: opsional(env, 'VITE_UMAMI_SCRIPT'),
    umamiId: opsional(env, 'VITE_UMAMI_ID'),
    waChannel: opsional(env, 'VITE_WA_CHANNEL'),
    pbUrl: opsional(env, 'VITE_PB_URL'),
    appVersion: opsional(env, 'VITE_APP_VERSION') ?? versiCadangan,
  };
}

let tersimpan: AppConfig | undefined;

/** Konfigurasi app; dibaca sekali dari import.meta.env saat pertama dipakai. */
export function getConfig(): AppConfig {
  tersimpan ??= parseConfig(import.meta.env, __APP_VERSION__);
  return tersimpan;
}
