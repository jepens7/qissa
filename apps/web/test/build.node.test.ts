import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// BACKLOG A3: `vite build` gagal dengan pesan jelas bila VITE_SITE_URL kosong. G1: isi service worker hasil build.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VARIABEL_WAJIB = ['VITE_SITE_URL', 'VITE_CONTENT_BASE'] as const;

describe('vite build', () => {
  let envDir = '';
  const nilaiLama = new Map<string, string | undefined>();

  beforeEach(() => {
    envDir = mkdtempSync(join(tmpdir(), 'qissa-env-'));
    // Variabel dari lingkungan pemanggil (mis. CI) tidak boleh ikut memengaruhi tes.
    for (const nama of VARIABEL_WAJIB) {
      nilaiLama.set(nama, process.env[nama]);
      Reflect.deleteProperty(process.env, nama);
    }
  });

  afterEach(() => {
    rmSync(envDir, { recursive: true, force: true });
    for (const [nama, nilai] of nilaiLama) {
      if (nilai === undefined) {
        Reflect.deleteProperty(process.env, nama);
      } else {
        process.env[nama] = nilai;
      }
    }
  });

  const jalankanBuild = () =>
    build({
      root: ROOT,
      configFile: join(ROOT, 'vite.config.ts'),
      envDir,
      mode: 'production',
      logLevel: 'silent',
      // Build sungguhan ke folder sementara (bukan apps/web/dist): service worker butuh berkas hasil build untuk
      // di-precache, jadi write: false tidak bisa dipakai.
      build: { outDir: join(envDir, 'dist'), emptyOutDir: true },
    });

  test('gagal dengan pesan jelas bila VITE_SITE_URL kosong', async () => {
    writeFileSync(join(envDir, '.env'), 'VITE_SITE_URL=\nVITE_CONTENT_BASE=/content\n');
    await expect(jalankanBuild()).rejects.toThrow(
      'VITE_SITE_URL kosong; isi dengan URL situs, misalnya https://qissah.id.',
    );
  }, 30_000);

  test('build APK (mode android) gagal bila VITE_CONTENT_BASE bukan https (BACKLOG H2)', async () => {
    writeFileSync(
      join(envDir, '.env'),
      'VITE_SITE_URL=https://qissah.id\nVITE_CONTENT_BASE=/content\n',
    );
    await expect(
      build({
        root: ROOT,
        configFile: join(ROOT, 'vite.config.ts'),
        envDir,
        mode: 'android',
        logLevel: 'silent',
        build: { outDir: join(envDir, 'dist'), emptyOutDir: true },
      }),
    ).rejects.toThrow('VITE_CONTENT_BASE untuk APK (mode android) harus diawali https://');
  }, 30_000);

  test('berhasil bila variabel wajib terisi', async () => {
    writeFileSync(
      join(envDir, '.env'),
      'VITE_SITE_URL=https://qissah.id\nVITE_CONTENT_BASE=/content\n',
    );
    await expect(jalankanBuild()).resolves.toBeDefined();
  }, 30_000);

  test('service worker mem-precache shell dan halaman statis, tanpa konten dan tanpa navigateFallback (ADR-017)', async () => {
    writeFileSync(
      join(envDir, '.env'),
      'VITE_SITE_URL=https://qissah.id\nVITE_CONTENT_BASE=/content\n',
    );
    // public/ disalin dan diberi satu berkas konten palsu, supaya asersi "tanpa konten" tetap bermakna di CI,
    // tempat public/content belum dibuat qs compile saat tes berjalan.
    const publicDir = join(envDir, 'public');
    cpSync(join(ROOT, 'public'), publicDir, { recursive: true });
    mkdirSync(join(publicDir, 'content'), { recursive: true });
    writeFileSync(join(publicDir, 'content', 'ep99.json'), '{}');
    const outDir = join(envDir, 'dist');
    await build({
      root: ROOT,
      configFile: join(ROOT, 'vite.config.ts'),
      envDir,
      publicDir,
      mode: 'production',
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    const sw = readFileSync(join(outDir, 'sw.js'), 'utf8');
    // Di bawah vitest (NODE_ENV=test) Workbox menulis sw.js tanpa minify: `"url": "…"`, bukan `url:"…"`.
    const precache = [...sw.matchAll(/url"?\s*:\s*"([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(precache).toEqual(
      expect.arrayContaining([
        'index.html',
        'privasi/index.html',
        'tentang/index.html',
        'manifest.webmanifest',
        // Font di-host sendiri (ADR-019).
        'fonts/plus-jakarta-sans-latin.woff2',
        'fonts/newsreader-latin.woff2',
        'fonts/amiri-arabic.woff2',
      ]),
    );
    expect(existsSync(join(outDir, 'content', 'ep99.json'))).toBe(true);
    expect(precache.filter((u) => u.startsWith('content/') || u === 'og.png')).toEqual([]);
    expect(sw).not.toContain('NavigationRoute');
    expect(sw).not.toContain('googleapis');
  }, 60_000);
});
