// E2E SRS §9 (BACKLOG G3, ADR-018): landing, poll, satu episode tamat, refleksi tersimpan, bagikan dengan
// cadangan salin, dan muat ulang offline, di 360×780 terhadap build produksi.
import { expect, test, type Locator, type Page } from '@playwright/test';

// Build produksi menyembunyikan episode sebelum `rilis`. Jam diset ke `rilis` terakhir di manifest yang
// disajikan (hari rilis ikut tampil), bukan tanggal tertulis, supaya PR yang memajukan `rilis` saat insiden
// (RUNBOOK §7) tidak memerahkan E2E. Timer tetap berjalan.
test.beforeEach(async ({ page, request }) => {
  const manifest = (await (await request.get('/content/manifest.json')).json()) as {
    episodes: { rilis: string }[];
  };
  const terakhir =
    manifest.episodes
      .map((e) => e.rilis)
      .sort()
      .at(-1) ?? '2026-11-04';
  await page.clock.setFixedTime(new Date(`${terakhir}T12:00:00+07:00`));
});

/** Mengetuk "Ketuk untuk lanjut" sampai `sasaran` terlihat; typing berlanjut sendiri. */
async function majuSampai(page: Page, sasaran: Locator) {
  const hint = page.locator('button.hint');
  for (let i = 0; i < 300; i++) {
    if (await sasaran.isVisible()) {
      return;
    }
    if (await hint.isVisible()) {
      await hint.click();
    } else {
      await page.waitForTimeout(50);
    }
  }
  throw new Error('Sasaran tidak muncul setelah 300 langkah.');
}

/** Maju sampai opsi pilihan aktif bernama `nama`, lalu memilihnya. */
async function pilih(page: Page, nama: string | RegExp) {
  const opsi = page.locator('.choices button:not([disabled])').filter({ hasText: nama });
  await majuSampai(page, opsi);
  await opsi.click();
}

test('landing: poll, daftar episode dengan status, dan tautan footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Lu bakal gimana?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tutup, jangan dibuka' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tangkapan Layar/ })).toContainText(
    'Mulai dari sini',
  );
  await expect(page.getByRole('button', { name: /Transferan Nyasar/ })).toContainText('Baru');
  await expect(page.getByRole('link', { name: 'Kebijakan privasi' })).toHaveAttribute(
    'href',
    '/privasi/',
  );
});

test('poll membuka Episode 1 sampai tamat, refleksi tersimpan, bagikan memakai cadangan salin', async ({
  page,
}) => {
  // Tanpa Web Share dan dengan clipboard palsu, supaya cadangan salin teruji sama di Windows dan Linux.
  await page.addInitScript(() => {
    const salinan: string[] = [];
    Object.defineProperty(window, '__salinan', { value: salinan });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (teks: string) => {
          salinan.push(teks);
          return Promise.resolve();
        },
      },
      configurable: true,
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutup, jangan dibuka' }).click();
  await expect(page).toHaveURL(/#ep01$/);
  await expect(page.getByRole('heading', { name: 'Tangkapan Layar', level: 1 })).toBeVisible();

  await pilih(page, 'Tutup, jangan dibuka');
  await pilih(page, /Ketemu dulu/);
  const tamat = page.getByRole('heading', { name: 'Episode 1 selesai' });
  await majuSampai(page, tamat);
  // Saat tamat halaman berhenti di kartu tamat, bukan di dasar halaman (SRS UI-5, UI-6).
  await expect(tamat).toBeInViewport();
  await expect(page.getByText('Jalur kamu: Tutup → Ketemu dulu.')).toBeVisible();
  await expect(page.getByText('Di awal kamu bilang Tutup. Kamu menepatinya.')).toBeVisible();
  // Kartu dalil tampil; status review-nya tidak dikunci, karena akan berubah setelah review ulama.
  await expect(page.getByRole('heading', { name: 'Apa kata Al-Qur’an dan Sunnah' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Jawaban refleksi' }).fill('Refleksi uji E2E.');
  await page.getByRole('button', { name: 'Simpan di HP ini' }).click();
  await expect(page.getByText('Tersimpan di HP ini.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('qissa.v1.ep01.refleksi'))).toBe(
    JSON.stringify('Refleksi uji E2E.'),
  );

  await page.getByRole('button', { name: 'Bagikan dilemanya' }).click();
  await expect(page.getByText('Teks tersalin. Tempel di WhatsApp atau mana saja.')).toBeVisible();
  const salinan = await page.evaluate(
    () => (window as unknown as { __salinan: string[] }).__salinan,
  );
  expect(salinan).toHaveLength(1);
  expect(salinan[0]).toMatch(/Lu bakal gimana\?[\s\S]*#ep01$/);
  expect(salinan[0]).not.toContain('Ketemu dulu');
});

test('muat ulang offline: episode yang pernah dibuka tetap terbaca', async ({ page, context }) => {
  await page.goto('/');
  // Kunjungan pertama memasang service worker; muat ulang supaya halaman dikendalikannya.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await page.getByRole('button', { name: /Tangkapan Layar/ }).click();
  await expect(page.getByRole('heading', { name: 'Tangkapan Layar', level: 1 })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tangkapan Layar', level: 1 })).toBeVisible();
  await pilih(page, 'Tutup, jangan dibuka');
  await pilih(page, /Ketemu dulu/);
  await majuSampai(page, page.getByRole('heading', { name: 'Episode 1 selesai' }));

  await page.getByRole('button', { name: 'Daftar episode' }).first().click();
  await expect(page.getByRole('button', { name: /Tangkapan Layar/ })).toContainText(
    'Selesai. Akhir yang sudah dibaca: 1 dari 3',
  );
});
