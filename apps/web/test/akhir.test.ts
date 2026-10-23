// BACKLOG D4: teks bagikan tanpa pilihan pembaca, cadangan salin ke clipboard, dan catatan poll Episode 1.
// SRS SHR-2: templat masukan berisi jalur, lima pertanyaan, dan alamat tujuan.
import { describe, expect, test, vi } from 'vitest';
import { catatanPoll } from '../src/features/ending/ending.tsx';
import { t } from '../src/lib/i18n.ts';
import { kirimTeks, teksBagikan } from '../src/lib/share.ts';

test('teks bagikan: kalimat bagikan lalu URL episode', () => {
  expect(teksBagikan('Lu bakal gimana?', 'https://qissah.id', 'ep01')).toBe(
    'Lu bakal gimana?\nhttps://qissah.id#ep01',
  );
});

test('templat masukan: jalur, lima pertanyaan, lalu alamat tujuan', () => {
  const teks = t('masukan.templat', {
    nomor: 1,
    judul: 'Tangkapan Layar',
    jalur: 'Tutup → Ketemu dulu',
  });
  expect(teks).toContain('Jalur saya: Tutup → Ketemu dulu');
  expect(teks.match(/^[1-5]\. /gm)).toHaveLength(5);
  expect(teks.endsWith('\n\nKirim ke halo@qissah.id')).toBe(true);
});

describe('kirimTeks', () => {
  const salin = () => ({ writeText: vi.fn(() => Promise.resolve()) });

  test('memakai lembar bagikan bila ada', async () => {
    const clipboard = salin();
    const share = vi.fn(() => Promise.resolve());
    expect(await kirimTeks('halo', { share, clipboard })).toBe('dibagikan');
    expect(share).toHaveBeenCalledWith({ text: 'halo' });
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  test('dibatalkan atau tanpa lembar bagikan: teks disalin', async () => {
    const batal = vi.fn(() => Promise.reject(new Error('AbortError')));
    const clipboard = salin();
    expect(await kirimTeks('halo', { share: batal, clipboard })).toBe('tersalin');
    expect(clipboard.writeText).toHaveBeenCalledWith('halo');
    expect(await kirimTeks('halo', { clipboard: salin() })).toBe('tersalin');
  });

  test('tanpa clipboard atau clipboard ditolak: gagal', async () => {
    expect(await kirimTeks('halo', {})).toBe('gagal');
    const ditolak = { writeText: vi.fn(() => Promise.reject(new Error('NotAllowedError'))) };
    expect(await kirimTeks('halo', { clipboard: ditolak })).toBe('gagal');
  });
});

test('catatan poll: sama, beda, atau tidak ada', () => {
  expect(catatanPoll('Tutup', 'Tutup')).toBe('Di awal kamu bilang Tutup. Kamu menepatinya.');
  expect(catatanPoll('Tutup', 'Tegur')).toBe(
    'Di awal kamu bilang Tutup. Di dalam cerita kamu memilih Tegur.',
  );
  expect(catatanPoll(null, 'Tegur')).toBeUndefined();
  expect(catatanPoll('Tutup', undefined)).toBeUndefined();
});
