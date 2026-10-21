import { describe, expect, test } from 'vitest';
import { tokenize } from '../src/tokenize.ts';

const t = (baris: string) => tokenize(baris, 7);

describe('tokenize: setiap jenis baris di QISSA-SCRIPT §2', () => {
  test('baris kosong dan komentar diabaikan', () => {
    expect(t('')).toBeNull();
    expect(t('   ')).toBeNull();
    expect(t('// catatan penulis')).toBeNull();
  });

  test('knot, blok shot, dan penutupnya', () => {
    expect(t('== pembuka')).toEqual({ kind: 'knot', line: 7, name: 'pembuka' });
    expect(t('::: shot nadia-bram')).toEqual({ kind: 'shot-buka', line: 7, name: 'nadia-bram' });
    expect(t(':::')).toEqual({ kind: 'shot-tutup', line: 7 });
  });

  test('direktif @', () => {
    expect(t('@view Sisa UI 2021 | S | 12 anggota | Grup Sisa UI 2021')).toEqual({
      kind: 'view',
      line: 7,
      name: 'Sisa UI 2021',
      initial: 'S',
      sub: '12 anggota',
      pill: 'Grup Sisa UI 2021',
    });
    expect(t('@typing')).toEqual({ kind: 'typing', line: 7 });
    expect(t('@shot closed')).toEqual({ kind: 'shot', line: 7, state: 'closed' });
    expect(t('@sys Nadia keluar dari grup')).toEqual({
      kind: 'sys',
      line: 7,
      text: 'Nadia keluar dari grup',
    });
    expect(t('@notif Gacor Family | 14 pesan baru | 23.58')).toEqual({
      kind: 'notif',
      line: 7,
      app: 'Gacor Family',
      text: '14 pesan baru',
      time: '23.58',
    });
    expect(t('@bank Rp2.500.000 | DION PRATAMA')).toEqual({
      kind: 'bank',
      line: 7,
      amount: 'Rp2.500.000',
      from: 'DION PRATAMA',
    });
    expect(t('@set dibaca')).toEqual({ kind: 'set', line: 7, v: 'dibaca' });
  });

  test('perpindahan: ->, -> END, dan =>', () => {
    expect(t('-> pagi')).toEqual({ kind: 'go', line: 7, to: 'pagi' });
    expect(t('-> END')).toEqual({ kind: 'end', line: 7 });
    expect(t('=> dibaca: cerita_dibaca | !menegur: cerita_tegur | cerita_tutup')).toEqual({
      kind: 'branch',
      line: 7,
      cases: [
        { cond: 'dibaca', to: 'cerita_dibaca' },
        { cond: '!menegur', to: 'cerita_tegur' },
        { cond: null, to: 'cerita_tutup' },
      ],
    });
  });

  test('kondisional satu baris dan blok ??', () => {
    expect(t('? dibaca: Nadia: Dan lu baca.')).toEqual({
      kind: 'kondisi-baris',
      line: 7,
      cond: 'dibaca',
      isi: { kind: 'ucapan', line: 7, speaker: 'Nadia', text: 'Dan lu baca.' },
    });
    expect(t('?? !dibaca')).toEqual({ kind: 'kondisi-buka', line: 7, cond: '!dibaca' });
    expect(t('?? else')).toEqual({ kind: 'kondisi-else', line: 7 });
    expect(t('?? end')).toEqual({ kind: 'kondisi-tutup', line: 7 });
  });

  test('label dan opsi pilihan; nama pendek boleh berspasi', () => {
    expect(t('[Pilihan 2 dari 2] #p2')).toEqual({
      kind: 'label',
      line: 7,
      label: 'Pilihan 2 dari 2',
      key: 'p2',
    });
    expect(t('* “Ketemu dulu yuk. Jangan di chat.” -> akhir_ketemu #Ketemu dulu')).toEqual({
      kind: 'opsi',
      line: 7,
      text: '“Ketemu dulu yuk. Jangan di chat.”',
      to: 'akhir_ketemu',
      name: 'Ketemu dulu',
    });
    expect(t('* Balas: “Kenapa lu kirim ke gue?” -> tegur #Tegur')).toMatchObject({
      text: 'Balas: “Kenapa lu kirim ke gue?”',
      to: 'tegur',
      name: 'Tegur',
    });
    expect(t('* Tutup saja -> tutup')).toMatchObject({ kind: 'opsi', to: 'tutup', name: null });
  });

  test('narasi dan gelembung; ucapan dipotong di “: ” pertama', () => {
    expect(t('> Saldo: Rp380.000.')).toEqual({ kind: 'nar', line: 7, text: 'Saldo: Rp380.000.' });
    expect(t('Bu Kos: 1.200.000 seperti biasa.')).toEqual({
      kind: 'ucapan',
      line: 7,
      speaker: 'Bu Kos',
      text: '1.200.000 seperti biasa.',
    });
    expect(t('Raka: [Foto: resi pengiriman] Udah dikirim ya bro')).toEqual({
      kind: 'ucapan',
      line: 7,
      speaker: 'Raka',
      text: 'Udah dikirim ya bro',
      attach: 'Foto: resi pengiriman',
    });
  });
});

describe('tokenize: baris yang salah', () => {
  const kasus: [string, string][] = [
    ['@video klip', 'Direktif “@video” tidak dikenal'],
    ['@view Gilang | G | online', '@view harus punya empat field'],
    ['@notif App | teks', '@notif harus punya tiga field'],
    ['@bank Rp1', '@bank harus punya dua field'],
    ['@typing lama', '@typing tidak memakai isi'],
    ['=> dibaca: a | menegur: b', '=> wajib diakhiri knot default'],
    ['?? dibaca lagi', 'Blok kondisional ditulis'],
    ['[Pilihan 1 dari 2]', 'Label pilihan ditulis'],
    ['* opsi tanpa tujuan', 'Opsi ditulis'],
    ['Gilang:', 'Baris tidak dikenali'],
    ['tanpa titik dua', 'Baris tidak dikenali'],
    ['>', 'Kartu narasi tidak punya teks'],
    ['::: video x', 'Blok tangkapan layar harus dibuka'],
  ];
  test.each(kasus)('%s', (baris, awalPesan) => {
    const token = t(baris);
    expect(token?.kind).toBe('salah');
    expect(token?.kind === 'salah' ? token.message : '').toContain(awalPesan);
  });
});

describe('tokenize: perbaikan dari review B2', () => {
  test.each([
    ['-> a b', '-> harus diikuti satu nama knot atau END'],
    ['== a b', 'Judul knot harus berbentuk'],
    ['@set a b', '@set harus diikuti satu nama variabel'],
    ['@shot a b', '@shot harus diikuti satu nama shot'],
    ['@sys', '@sys harus diikuti teks'],
    ['@view Gilang | G |  | Chat dengan Gilang', 'Field @view tidak boleh kosong'],
    ['Raka: [ ]', 'Label lampiran di gelembung Raka kosong'],
    ['Raka: [Foto tanpa tutup', 'Label lampiran di gelembung Raka kosong atau tidak ditutup'],
    ['*   -> tutup #Tutup', 'Opsi ditulis'],
    ['* Tutup -> tutup #', 'Opsi ditulis'],
    ['[ ] #p1', 'Label pilihan ditulis'],
    ['? a: ? b: > X', 'Kondisional tidak boleh bersarang'],
  ])('%s', (baris, awalPesan) => {
    const token = t(baris);
    expect(token?.kind).toBe('salah');
    expect(token?.kind === 'salah' ? token.message : '').toContain(awalPesan);
  });

  test('?? END dan ?? Else tetap dikenali, dengan peringatan huruf kecil', () => {
    expect(t('?? END')).toEqual({
      kind: 'kondisi-tutup',
      line: 7,
      peringatan: 'Tulis “?? end” dengan huruf kecil.',
    });
    expect(t('?? Else')).toMatchObject({ kind: 'kondisi-else' });
  });

  test('opsi dipisah di “ -> ” terakhir; teks boleh memuat # dan ->', () => {
    expect(t('* Pilih #1 -> lalu -> pagi #Satu')).toEqual({
      kind: 'opsi',
      line: 7,
      text: 'Pilih #1 -> lalu',
      to: 'pagi',
      name: 'Satu',
    });
  });

  test('baris panjang tidak membuat tokenizer lambat', () => {
    const mulai = performance.now();
    expect(t(`* a${' '.repeat(64_000)}b`)?.kind).toBe('salah');
    expect(t(`?a: ${'?a: '.repeat(5000)}> x`)?.kind).toBe('salah');
    expect(performance.now() - mulai).toBeLessThan(500);
  });
});
