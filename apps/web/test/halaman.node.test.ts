// BACKLOG E2: /privasi memuat teks kebijakan dari docs/PRIVACY-SECURITY.md §6 apa adanya, dan footer menautkan
// kedua halaman statis.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const baca = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const rapikan = (teks: string) => teks.replace(/\s+/g, ' ').trim();

test('teks /privasi sama dengan PRIVACY-SECURITY §6', () => {
  const setelah = baca('../../../docs/PRIVACY-SECURITY.md').split(/^## 6\. .*$/m)[1] ?? '';
  const paragraf = (setelah.split(/^## /m)[0] ?? '')
    .split(/\n\s*\n/)
    .map(rapikan)
    .filter((p) => p !== '' && !p.startsWith('Diperbarui:'));
  // Teks halaman tanpa komentar dan tag; spasi sisa tag sebelum tanda baca dibuang.
  const halaman = rapikan(
    baca('../public/privasi/index.html')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/ ([.,;])/g, '$1');
  expect(paragraf.length).toBeGreaterThan(5);
  for (const p of paragraf) {
    expect(halaman).toContain(p);
  }
  expect(halaman).toMatch(/Diperbarui: \d{1,2} \w+ \d{4}\./);
});

test('footer menautkan /tentang/ dan /privasi/', () => {
  const app = baca('../src/app.tsx');
  expect(app).toContain('href="/tentang/"');
  expect(app).toContain('href="/privasi/"');
});
