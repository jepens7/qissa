import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// BACKLOG A3: `vite build` gagal dengan pesan jelas bila VITE_SITE_URL kosong.
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
      build: { write: false },
    });

  test('gagal dengan pesan jelas bila VITE_SITE_URL kosong', async () => {
    writeFileSync(join(envDir, '.env'), 'VITE_SITE_URL=\nVITE_CONTENT_BASE=/content\n');
    await expect(jalankanBuild()).rejects.toThrow(
      'VITE_SITE_URL kosong; isi dengan URL situs, misalnya https://qissa.id.',
    );
  }, 30_000);

  test('berhasil bila variabel wajib terisi', async () => {
    writeFileSync(
      join(envDir, '.env'),
      'VITE_SITE_URL=https://qissa.id\nVITE_CONTENT_BASE=/content\n',
    );
    await expect(jalankanBuild()).resolves.toBeDefined();
  }, 30_000);
});
