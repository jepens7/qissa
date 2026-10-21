// Daftar untuk aturan L5 (docs/QISSA-SCRIPT.md §6, ADR-013).
//
// Nama aplikasi judi dilarang muncul di konten maupun kode (CLAUDE.md), jadi di sini hanya hash
// SHA-256-nya yang disimpan. Nama dinormalkan sama seperti teks naskah: huruf kecil, tanda baca dan
// batas huruf-angka menjadi pemisah kata, kata dipisah satu spasi ("Nama-88" sama dengan "nama 88").
// Untuk menambah nama, hitung hash-nya dengan hashNama dari akar repo, lalu tambahkan hasilnya ke
// HASH_NAMA_APLIKASI_JUDI:
//
//   node --input-type=module -e "import { hashNama } from './packages/script/src/kata-terlarang.ts'; console.log(hashNama(process.argv[1]))" "Nama Aplikasi"
//
// Nama sampai tiga kata dicocokkan per frasa.

export const HASH_NAMA_APLIKASI_JUDI: readonly string[] = [];

/**
 * Kata yang dilarang apa adanya, dicocokkan per kata utuh, termasuk dengan klitika ("depositnya");
 * "deposito" tidak kena.
 */
export const KATA_TERLARANG: readonly string[] = ['deposit'];

/** "gacor" hanya boleh muncul sebagai bagian dari nama grup ini. */
export const NAMA_GRUP_GACOR = 'gacor family';

/** Kata yang menandai taruhan bila berada dekat nominal uang. "slot" dan "withdraw" bukan termasuk. */
export const KATA_TARUHAN: readonly string[] = ['deposit', 'depo', 'taruhan', 'bet'];

/** Jarak maksimal, dalam kata, antara nominal uang dan kata taruhan. */
export const JARAK_NOMINAL_TARUHAN = 3;
