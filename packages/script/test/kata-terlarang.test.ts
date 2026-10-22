// Pencocok L5. Kasus yang harus kena memakai kata taruhan dan nama aplikasi sintetis, karena nominal
// taruhan dan nama aplikasi judi dilarang muncul di fixture test (CLAUDE.md).
import { describe, expect, test } from 'vitest';
import { KATA_KETUAAN } from '../src/dated-words.ts';
import { HASH_NAMA_APLIKASI_JUDI, KATA_TARUHAN } from '../src/forbidden.ts';
import {
  DAFTAR_BAWAAN,
  adaNominalTaruhan,
  hashNama,
  kataKata,
  periksaKataKetuaan,
  periksaKataTerlarang,
  type DaftarKata,
} from '../src/kata-terlarang.ts';

describe('daftar bawaan', () => {
  test('setiap hash nama aplikasi berupa SHA-256 heksadesimal dan tidak kembar', () => {
    expect(HASH_NAMA_APLIKASI_JUDI.length).toBeGreaterThan(0);
    for (const h of HASH_NAMA_APLIKASI_JUDI) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(new Set(HASH_NAMA_APLIKASI_JUDI).size).toBe(HASH_NAMA_APLIKASI_JUDI.length);
  });

  test('kata ketuaan bawaan: satu kata huruf kecil, tidak kembar, dan memicu W4', () => {
    for (const k of KATA_KETUAAN) {
      expect(kataKata(k)).toEqual([k]);
    }
    expect(new Set(KATA_KETUAAN).size).toBe(KATA_KETUAAN.length);
    expect(periksaKataKetuaan('Ciyus? Miapah?').map((t) => t.message)).toEqual([
      'Kata “ciyus” terdengar ketuaan bagi pembaca (dated-words.ts).',
      'Kata “miapah” terdengar ketuaan bagi pembaca (dated-words.ts).',
    ]);
  });
});

const pesan = (baris: string, daftar: DaftarKata = DAFTAR_BAWAAN) =>
  periksaKataTerlarang(baris, daftar).map((t) => t.message);

describe('nominal taruhan', () => {
  const SINTETIS = ['sintetis'];

  test.each([
    'Sintetis 50rb lagi.',
    'Sintetis 50 ribu lagi.',
    'Sintetis 50 rb.',
    'Sintetis 2 juta.',
    'Sintetis 1,5 juta.',
    'Sintetis 2,5 jt.',
    'Sintetis Rp 50 ribu.',
    'Sintetis Rp50.000.',
    'Sintetis 1.200.000.',
    'Sintetis 50000.',
    'Sintetis50rb.',
    'SINTETIS 10K.',
    'Sintetisnya 10k.',
    '50rb buat sintetis.',
    'Sintetis satu dua 50rb.',
  ])('“%s” kena', (baris) => {
    expect(adaNominalTaruhan(baris, SINTETIS)).toBe(true);
  });

  test.each([
    'Sintetis satu dua tiga 50rb.',
    'Kirim 50rb buat makan.',
    '> 01.30. Sintetis kelima malam itu.',
  ])('“%s” tidak kena', (baris) => {
    expect(adaNominalTaruhan(baris, SINTETIS)).toBe(false);
  });

  test.each([
    '> Senin, 02.14. Taruhan pertama.',
    'Sudah 214 orang ikut taruhan itu.',
    'Pasal 303 KUHP melarang taruhan dalam bentuk apa pun.',
  ])('jam, hitungan, dan nomor pasal bukan nominal: “%s”', (baris) => {
    expect(adaNominalTaruhan(baris, KATA_TARUHAN)).toBe(false);
  });
});

describe('kata terlarang dan gacor', () => {
  test.each([
    'Ada deposit.',
    'DEPOSIT',
    'Depositnya udah masuk?',
    'Depositmu kurang.',
    'Deposit-nya',
  ])('“%s” kena', (baris) => {
    expect(pesan(baris)).toContain('Kata “deposit” dilarang di naskah dan dalil.');
  });

  test.each(['Bunga deposito naik.', 'Kos di Depok.'])('“%s” tidak kena', (baris) => {
    expect(pesan(baris)).toEqual([]);
  });

  test('gacor tanpa membedakan huruf besar-kecil, kecuali nama grup', () => {
    expect(pesan('Grup GACOR ramai.')).toEqual([
      '“gacor” hanya boleh muncul sebagai nama grup “Gacor Family”.',
    ]);
    expect(pesan('Notifikasi GACOR FAMILY masuk.')).toEqual([]);
  });
});

describe('tautan', () => {
  test.each([
    'Buka https://contoh.com malam ini.',
    'Cek www.contoh.com',
    'Cek WWW.CONTOH.COM',
    'Buka contoh.id sekarang.',
    'Buka contoh.co.id sekarang.',
    'Buka contoh.vip sekarang.',
    'Mampir ke contoh.tv sekarang.',
    'Cek linktr.ee/raka ya.',
    'Tonton youtu.be/abc123',
    'Buka goo.gl/abc',
    'Buka contoh.shop/abc',
    'Buka 192.168.1.1/login',
  ])('“%s” kena', (baris) => {
    expect(pesan(baris)).toEqual(['Tautan tidak boleh ada di naskah dan dalil.']);
  });

  test.each([
    'Rp380.000 sudah masuk, sisanya Rp1.200.000.',
    '> Selasa, 22.41. Kos Kukusan.',
    'cmt: dion.prtm | komentar',
    'Nilainya 3.5/5.',
    'Dan lain-lain, dll. dan sebagainya.',
    'Bagian dari hadis Jibril, HR Muslim no. 8, sahih',
  ])('“%s” tidak kena', (baris) => {
    expect(pesan(baris)).toEqual([]);
  });
});

describe('tag HTML', () => {
  test.each(['Malam <b>tebal</b>.', '<br>', '<img/src=x>', '<svg/onload=alert(1)>'])(
    '“%s” kena',
    (baris) => {
      expect(pesan(baris)).toEqual(['Tag HTML tidak boleh ada di naskah dan dalil.']);
    },
  );

  test.each(['a < b > c', 'Sayang <3', 'x<y'])('“%s” tidak kena', (baris) => {
    expect(pesan(baris)).toEqual([]);
  });
});

describe('nama aplikasi (hash nama sintetis)', () => {
  const daftar = (...nama: string[]): DaftarKata => ({
    ...DAFTAR_BAWAAN,
    hashNamaAplikasi: new Set(nama.map(hashNama)),
  });
  const NAMA = 'Nama aplikasi judi tidak boleh muncul di naskah dan dalil.';

  test('nama satu kata, huruf besar, diikuti tanda baca', () => {
    expect(pesan('Malam itu dia buka ZORPA.', daftar('zorpa'))).toEqual([NAMA]);
  });

  test('nama dua kata', () => {
    expect(pesan('Main Zorp Kilat terus.', daftar('Zorp Kilat'))).toEqual([NAMA]);
    expect(pesan('Zorp saja.', daftar('Zorp Kilat'))).toEqual([]);
  });

  test('tanda hubung dan batas huruf-angka dinormalkan sama', () => {
    expect(hashNama('Zorp-88')).toBe(hashNama('zorp 88'));
    expect(hashNama('Zorp88')).toBe(hashNama('zorp 88'));
    expect(pesan('Dia buka Zorp-88 lagi.', daftar('zorp 88'))).toEqual([NAMA]);
    expect(pesan('Dia buka zorp88 lagi.', daftar('Zorp-88'))).toEqual([NAMA]);
  });
});
