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

// Diisi 22 Oktober 2026 dari riset dua sudut (berita Indonesia 2023–2026 dan media komunitas game) yang
// diverifikasi adversarial: 15 nama yang paling mungkin ditulis penulis (judul dan julukan game slot,
// provider, aplikasi chip, dan bandar) dalam 35 bentuk ternormalisasi, berurutan menurut hash. Kata
// umum yang menjadi bagiannya (nama dewa, kata Inggris biasa) sengaja tidak di-hash sendirian.
export const HASH_NAMA_APLIKASI_JUDI: readonly string[] = [
  '06df1b4e80061add1ef0d78465df74d7f01e9eb29fb78e7134eb087704663442',
  '08c3f6bb08d088cad8269a5d12a333b5ea6184108d2df61ed552f1297e85fb64',
  '09feccaf09cdea97be38fbbf97ec715c143e0a209376483cc76f6c0047e4dade',
  '0d1df6038903876aabaa0d5fd08d09161fd4eb50af4a7cd00139042f37e22da5',
  '1535b3d32484b309599c20d9696e62d39dd8f45e2e7a794bd2bb210ac7491898',
  '1bc87bc5dff53fa83250c0bedb8cc4baf9c19186e7b6d0c5243b5c9b3867e413',
  '1e4e9395bf5e72a3e5c758b0a5d27319d445800e3e8613f5f0d60be902208501',
  '20735e9a5673320de9b33b06b6f9e381ea0bbe0994a35c8a14e0d8d83818240d',
  '26d65ad027d9fea65f38c2834a13549595acacb808374b23cce1eb75ec632622',
  '282c7aa5dba82e066a7b029283389bb12a7944d08231e4bbc2038f5ffaebf4ea',
  '312510062eae7f9168c48e14c11c6e358552b1d853f0ec9881f1930e561f8f3c',
  '34c39a9f6d254f2b6a6b8cdc3707a38170498763dc8c137df9b5c628c85a3116',
  '4814335789f64f0c7dbc8ee6e1c74358b425bfc53819bb1e7a1d793c6ccf541f',
  '55677786013dbab5d81c1ea9243f44bab0c21ea8d901ac0652d4f78d173511f3',
  '5a95fea6413fe47b908a0837a2f320926790727fb3dac70e660ad6a94f3178b6',
  '6ef9b17afce10bb3aabd600aba9b80f035fbedcde4d74e597d2ae80c6128dc09',
  '6fede7c4267cf216ee36fa147c0e1b5ed4bf3b4551039f5e18c380391c2c8294',
  '8caa4c1508471b238be563112d676800f4726decc9462f0338667a3ff3953483',
  '9529f8f5dc010588b39a8d7cb1e21be3a327fb89c2f8e226abf391b693af8a75',
  '9c7a6c53eb0169975c91a9229b72d063d8e2d88e7ecbcec526ceea741d7a7c91',
  'a85cedcffd638490244b2cb0411c883ac7be4dfac18bba28cdbfad082d7aafcc',
  'a93f7a91f88ee389a5147b54b22968c2521a59e41b1bf98ff0d22d7b5a704a42',
  'aaea6fa5658d8c08c114aa07322e725f385532cf8c462b6041ac87c656e31345',
  'b488772e5cfa3fbc59b8aa3953cd7d08df67dbc9fae09db4fbe996dd016b19d4',
  'b614660b4628c9993ccfa11dfe2a981e90009db7942cd5662d17a39958113a2b',
  'b6cf356f9e56967d8de6dae269680d0ff37993206043b7a2d0441f03a29d5174',
  'b7c614906904c0ffae834232a5ba50bb953a5d263ff4548ee552f7ba0ff61517',
  'c77f483bbf08e5906c60ba4b22a8e7549dd6826ddb7387b6b5b1a9d6391b0800',
  'ccfc45c72fd4113832142cd050d1d4e9470d8cbc4c2063c0901da3f649e89558',
  'ce9deb5f8690f08828b465a526cba528300b539028bac815c353c1d6288b5af5',
  'df549f85023fb35ee4d11dadb26b5fa18a86f147ed8cc3fbe61e547865e74050',
  'e272acdf9374cfedb0b561ea88bfee7eef9c26120653011904ed82de16c441df',
  'ec58c7c042be0cfc5bb466ae7651495de7aca5cca64bec70429a51bb76a80096',
  'ede863e8a4bc0a2e71d1bd21e507c36ab4edf2dfcb0ca033f19081243005e2d6',
  'f10db75cb2722d7d3b14c79d2553b68cd0d2d06bdddeb6a61546745b1914db99',
];

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
