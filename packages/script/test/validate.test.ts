import { describe, expect, test } from 'vitest';
import { lintEpisode, type OpsiLint } from '../src/compile.ts';
import { DAFTAR_BAWAAN, hashNama } from '../src/kata-terlarang.ts';
import { DALIL, FRONT_MATTER_UJI, NASKAH, bacaRepo, ringkas } from './bantuan.ts';

// Naskah uji yang bersih lint. Front matter uji ditutup di baris 15, jadi baris 16 adalah “== awal”.
const DASAR = `== awal
@view Gilang | G | online | Chat dengan Gilang
> Malam.
Gilang: rak
[Pilihan 1 dari 1] #p1
* Buka -> buka #Buka
* Tutup -> tutup #Tutup
* Tegur -> tegur #Tegur
== buka
@set dibaca
-> akhir
== tutup
-> akhir
== tegur
-> akhir
== akhir
> Selesai.
-> END`;

const DALIL_UJI = `---
status: draft
reviewed_by:
reviewed_at:
---
## Ayat
### QS Uji 1:1
“Terjemahan uji.”
Terjemahan Kemenag`;

type Ubah = {
  isi?: (s: string) => string;
  fm?: (s: string) => string;
  dalil?: (s: string) => string;
  opsi?: Partial<OpsiLint>;
};

function lint(ubah: Ubah = {}): string[] {
  const fm = (ubah.fm ?? ((s) => s))(FRONT_MATTER_UJI);
  const isi = (ubah.isi ?? ((s) => s))(DASAR);
  const dalil = (ubah.dalil ?? ((s) => s))(DALIL_UJI);
  return ringkas(
    lintEpisode(`${fm}${isi}`, dalil, { file: 'uji.qs.md', dalilFile: 'dalil.md', ...ubah.opsi }),
  );
}

const ganti = (dari: string, ke: string) => (s: string) => {
  if (!s.includes(dari)) {
    throw new Error(`“${dari}” tidak ada di naskah uji`);
  }
  return s.replace(dari, ke);
};

test('naskah uji dasar bersih lint', () => {
  expect(lint()).toEqual([]);
});

describe('aturan gagal: satu kasus per sub-aturan (BACKLOG B4)', () => {
  const kasus: [string, Ubah, string][] = [
    [
      'S1 direktif tak dikenal',
      { isi: ganti('> Malam.\n', '> Malam.\n@video klip\n') },
      'S1@19: Direktif “@video” tidak dikenal.',
    ],
    [
      'L1 bukan tiga opsi',
      { isi: (s) => ganti('* Tegur -> tegur #Tegur\n', '')(s).replace('== tegur\n-> akhir\n', '') },
      'L1@20: Blok pilihan #p1 punya 2 opsi; harus tepat tiga.',
    ],
    [
      'L1 opsi tanpa nama pendek',
      { isi: ganti('-> tegur #Tegur', '-> tegur') },
      'L1@23: Opsi tidak punya #NamaPendek.',
    ],
    [
      'L1 nama pendek kembar',
      { isi: ganti('-> tegur #Tegur', '-> tegur #Tutup') },
      'L1@23: Nama pendek “Tutup” dipakai dua kali di blok pilihan #p1.',
    ],
    [
      'L1 opsi lebih dari delapan kata',
      {
        isi: ganti(
          '* Buka -> buka',
          '* Buka dan baca semuanya sampai habis tanpa sisa sedikit -> buka',
        ),
      },
      'L1@21: Teks opsi 9 kata; maksimal delapan.',
    ],
    [
      'L2 knot tidak ada',
      { isi: ganti('== tegur\n-> akhir', '== tegur\n-> hilang') },
      'L2@30: Knot “hilang” tidak ada.',
    ],
    [
      'L2 knot tidak terjangkau',
      { isi: (s) => `${s}\n== yatim\n> Sendiri.\n-> END` },
      'L2@34: Knot “yatim” tidak pernah dicapai dari knot awal.',
    ],
    [
      'L2 knot tanpa penutup',
      { isi: ganti('== tutup\n-> akhir', '== tutup\n> Diam.') },
      'L2@27: Knot “tutup” tidak punya penutup; akhiri dengan ->, =>, blok pilihan, atau -> END.',
    ],
    [
      'L2 baris sesudah penutup',
      { isi: ganti('== tegur\n-> akhir', '== tegur\n-> akhir\nGilang: Tak terbaca.') },
      'L2@31: Baris ini tidak akan pernah dibaca: knot “tegur” sudah ditutup di baris 30.',
    ],
    [
      'L2 shot tidak didefinisikan',
      { isi: ganti('> Malam.\n', '> Malam.\n@shot tidak-ada\n') },
      'L2@19: Shot “tidak-ada” tidak didefinisikan; tulis blok “::: shot tidak-ada”.',
    ],
    [
      'L3 variabel tidak ada di vars',
      { isi: ganti('@set dibaca', '@set dibaca\n@set menegur') },
      'L3@26: Variabel “menegur” tidak ada di vars.',
    ],
    [
      'L3 variabel di vars tidak pernah di-@set',
      { fm: ganti('vars: [dibaca]', 'vars: [dibaca, menegur]') },
      'L3@14: Variabel “menegur” ada di vars tetapi tidak pernah di-@set.',
    ],
    [
      'L4 typing lebih dari dua kali',
      { isi: ganti('> Selesai.', '@typing\nGilang: a\n@typing\nGilang: b\n@typing\nGilang: c') },
      'L4@36: @typing muncul 3 kali di jalur “Buka”; maksimal dua.',
    ],
    [
      'L5 gacor di luar Gacor Family',
      { isi: ganti('> Malam.', '> Grup gacor ramai.') },
      'L5@18: “gacor” hanya boleh muncul sebagai nama grup “Gacor Family”.',
    ],
    [
      'L5 kata terlarang',
      { isi: ganti('> Malam.', '> Ada deposit.') },
      'L5@18: Kata “deposit” dilarang di naskah dan dalil.',
    ],
    [
      'L5 tautan',
      { isi: ganti('> Malam.', '> Buka https://contoh.com malam ini.') },
      'L5@18: Tautan tidak boleh ada di naskah dan dalil.',
    ],
    [
      'L5 tag HTML',
      { isi: ganti('> Malam.', '> Malam <b>tebal</b>.') },
      'L5@18: Tag HTML tidak boleh ada di naskah dan dalil.',
    ],
    [
      'L5 nominal taruhan (kata taruhan sintetis)',
      {
        isi: ganti('> Malam.', '> Malam. Sintetis 50rb lagi.'),
        opsi: { daftar: { ...DAFTAR_BAWAAN, kataTaruhan: ['sintetis'] } },
      },
      'L5@18: Nominal taruhan tidak boleh muncul di naskah dan dalil.',
    ],
    [
      'L5 nama aplikasi (hash nama sintetis)',
      {
        isi: ganti('> Malam.', '> Malam. Main Aplikasi Uji Terlarang lagi.'),
        opsi: {
          daftar: {
            ...DAFTAR_BAWAAN,
            hashNamaAplikasi: new Set([hashNama('aplikasi uji terlarang')]),
          },
        },
      },
      'L5@18: Nama aplikasi judi tidak boleh muncul di naskah dan dalil.',
    ],
    [
      'L6 key hilang',
      { fm: ganti('sampul: Sampul uji.\n', '') },
      'L6@1: Front matter belum memuat “sampul”.',
    ],
    ['L6 key kosong', { fm: ganti('teaser: Teaser uji.', 'teaser:') }, 'L6@8: “teaser” kosong.'],
    [
      'L6 refleksi bukan kalimat tanya',
      { fm: ganti('refleksi: Apa yang kamu lakukan?', 'refleksi: Pikirkan baik-baik.') },
      'L6@10: “refleksi” harus satu kalimat tanya yang diakhiri “?”.',
    ],
    [
      'L6 refleksi lebih dari satu kalimat',
      {
        fm: ganti(
          'refleksi: Apa yang kamu lakukan?',
          'refleksi: Ingat malam itu. Apa yang kamu lakukan?',
        ),
      },
      'L6@10: “refleksi” harus satu kalimat tanya yang diakhiri “?”.',
    ],
    [
      'L6 bagikan memuat pilihan',
      { fm: ganti('  Lu bakal gimana?', '  Pilihanmu apa?') },
      'L6@11: “bagikan” tidak boleh memuat “pilih” atau “jalur”: teks bagikan tidak pernah membawa pilihan pembaca.',
    ],
    [
      'L6 nomor bukan bilangan',
      { fm: ganti('nomor: 99', 'nomor: sembilan') },
      'L6@3: “nomor” harus bilangan bulat positif, bukan “sembilan”.',
    ],
    [
      'L6 id bukan epNN',
      { fm: ganti('id: ep99', 'id: episode99') },
      'L6@2: “id” harus berbentuk epNN, misalnya ep01, bukan “episode99”.',
    ],
    [
      'L7 tanpa rujukan',
      { dalil: ganti('Terjemahan Kemenag', 'Penjelasan singkat.') },
      'L7@6: dalil.md belum punya ayat atau hadis dengan rujukan (baris terakhir entri yang diawali “HR”, “Terjemahan”, atau “Sumber”).',
    ],
    [
      'L7 reviewed tanpa pereview',
      {
        dalil: (s) =>
          s
            .replace('status: draft', 'status: reviewed')
            .replace('reviewed_at:', 'reviewed_at: 2026-11-10'),
      },
      'L7@3: status: reviewed, tetapi “reviewed_by” kosong.',
    ],
    [
      'L7 status tidak sah',
      { dalil: ganti('status: draft', 'status: selesai') },
      'L7@2: “status” harus draft atau reviewed.',
    ],
    [
      'L7 tanggal review salah format',
      { dalil: ganti('reviewed_at:', 'reviewed_at: 10-11-2026') },
      'L7@4: “reviewed_at” harus berformat YYYY-MM-DD.',
    ],
    [
      'L7 gerbang --wajib-review',
      { opsi: { wajibReview: true } },
      'L7@2: Episode belum direview ulama (status: draft); gerbang produksi --wajib-review menolaknya.',
    ],
  ];

  test.each(kasus)('%s', (_nama, ubah, harapan) => {
    expect(lint(ubah)).toEqual([harapan]);
  });
});

describe('L2: rujukan, jangkauan, dan akhir jalur', () => {
  test('opsi menunjuk knot yang tidak ada', () => {
    expect(lint({ isi: ganti('-> tutup #Tutup', '-> tutupp #Tutup') })).toEqual([
      'L2@22: Knot “tutupp” tidak ada.',
      'L2@27: Knot “tutup” tidak pernah dicapai dari knot awal.',
    ]);
  });

  test('kasus dan default => menunjuk knot yang tidak ada', () => {
    expect(
      lint({ isi: ganti('== tegur\n-> akhir', '== tegur\n=> dibaca: hilang | akhir') }),
    ).toEqual(['L2@30: Knot “hilang” tidak ada.']);
    expect(
      lint({ isi: ganti('== tegur\n-> akhir', '== tegur\n=> dibaca: akhir | hilang') }),
    ).toEqual(['L2@30: Knot “hilang” tidak ada.']);
  });

  test('knot kosong yang dicapai hanya dilaporkan tidak punya penutup', () => {
    expect(lint({ isi: ganti('== tutup\n-> akhir', '== tutup\n-> kosong\n== kosong') })).toEqual([
      'L2@29: Knot “kosong” tidak punya penutup; akhiri dengan ->, =>, blok pilihan, atau -> END.',
    ]);
  });

  test('naskah tanpa knot', () => {
    expect(lint({ isi: () => '', fm: ganti('vars: [dibaca]', 'vars: []') })).toEqual([
      'L2@1: Naskah belum punya knot; tulis “== nama” untuk knot awal.',
    ]);
  });

  test('perulangan tanpa pilihan dilaporkan di baris -> yang kembali', () => {
    expect(
      lint({ isi: ganti('== tutup\n-> akhir', '== tutup\n> Lagi.\nGilang: lagi\n-> tutup') }),
    ).toEqual([
      'L2@30: Jalur “Tutup” kembali ke knot “tutup” dengan nilai variabel yang sama, jadi bisa berputar tanpa pernah sampai -> END.',
    ]);
  });

  test('putaran lewat pilihan dilaporkan sekali per opsi yang kembali', () => {
    // Dua opsi yang kembali dulu membuat penjelajah kehabisan memori; sekarang selesai seketika.
    const hasil = lint({
      isi: ganti(
        '== tutup\n-> akhir',
        '== tutup\n[Pilihan 2 dari 2] #p2\n* Lagi -> tutup #Lagi\n* Diam -> tutup #Diam\n* Sudah -> akhir #Sudah',
      ),
    });
    expect(hasil).toEqual([
      'L2@29: Jalur “Tutup > Lagi” kembali ke knot “tutup” dengan nilai variabel yang sama, jadi bisa berputar tanpa pernah sampai -> END.',
      'L2@30: Jalur “Tutup > Diam” kembali ke knot “tutup” dengan nilai variabel yang sama, jadi bisa berputar tanpa pernah sampai -> END.',
    ]);
  });

  test('jalur lebih dari 300 baris terlihat tanpa berputar', () => {
    const panjang = Array.from({ length: 301 }, (_, i) =>
      i % 2 === 0 ? 'Gilang: halo' : '> Hening.',
    );
    expect(lint({ isi: ganti('> Selesai.', panjang.join('\n')) })).toEqual([
      'L2@328: Jalur “Buka” melebihi 300 baris terlihat sebelum sampai -> END.',
    ]);
  });

  test('blok pilihan tanpa opsi: jalur berhenti di baris pilihannya', () => {
    const hasil = lint({
      isi: () =>
        '== awal\n@view G | G | online | Chat\n@set dibaca\n[P] #p1\n-> akhir\n== akhir\n-> END',
    });
    expect(hasil.filter((h) => h.includes('berhenti'))).toEqual([
      'L2@19: Jalur “(tanpa pilihan)” berhenti di sini tanpa sampai -> END.',
    ]);
  });
});

describe('L3 di setiap bentuk kondisi', () => {
  test.each([
    [
      '? cond:',
      { isi: ganti('Gilang: rak', '? dibac: Gilang: rak') },
      'L3@19: Variabel “dibac” tidak ada di vars.',
    ],
    [
      '?? cond',
      { isi: ganti('> Selesai.', '?? menegur\n> Selesai.\n?? end') },
      'L3@32: Variabel “menegur” tidak ada di vars.',
    ],
    [
      '=> cond:',
      { isi: ganti('== tegur\n-> akhir', '== tegur\n=> sudah: akhir | akhir') },
      'L3@30: Variabel “sudah” tidak ada di vars.',
    ],
    [
      'vars kembar',
      { fm: ganti('vars: [dibaca]', 'vars: [dibaca, dibaca]') },
      'L3@14: Variabel “dibaca” ditulis dua kali di vars.',
    ],
  ] as [string, Ubah, string][])('%s', (_nama, ubah, harapan) => {
    expect(lint(ubah)).toEqual([harapan]);
  });
});

describe('L5 di front matter dan dalil.md', () => {
  test('tautan di teaser', () => {
    expect(
      lint({ fm: ganti('teaser: Teaser uji.', 'teaser: Lihat www.contoh.com sekarang.') }),
    ).toEqual(['L5@8: Tautan tidak boleh ada di naskah dan dalil.']);
  });

  test('tag HTML di dalil.md dilaporkan untuk berkas dalil.md', () => {
    const hasil = lintEpisode(
      `${FRONT_MATTER_UJI}${DASAR}`,
      DALIL_UJI.replace('“Terjemahan uji.”', '“Terjemahan uji.” <b>tebal</b>'),
      { file: 'uji.qs.md', dalilFile: 'dalil.md' },
    );
    expect(hasil.map((d) => `${d.file} ${d.code}@${String(d.line)}`)).toEqual(['dalil.md L5@8']);
  });
});

describe('L6 dan L7: kasus tambahan', () => {
  test.each([
    [
      'bagikan memuat “jalur”',
      { fm: ganti('  Lu bakal gimana?', '  Jalurmu ke mana?') },
      'L6@11: “bagikan” tidak boleh memuat “pilih” atau “jalur”: teks bagikan tidak pernah membawa pilihan pembaca.',
    ],
    [
      'berikutnya bukan epNN',
      { fm: ganti('berikutnya:', 'berikutnya: episode3') },
      'L6@13: “berikutnya” harus berbentuk epNN, misalnya ep01, bukan “episode3”.',
    ],
    [
      'rujukan hanya ada di Riwayat',
      {
        dalil: (s: string) =>
          s
            .replace('## Ayat', '## Riwayat\n### Kisah\nSumber: riwayat uji\n## Ayat')
            .replace('Terjemahan Kemenag', 'Penjelasan singkat.'),
      },
      'L7@9: dalil.md belum punya ayat atau hadis dengan rujukan (baris terakhir entri yang diawali “HR”, “Terjemahan”, atau “Sumber”).',
    ],
  ] as [string, Ubah, string][])('%s', (_nama, ubah, harapan) => {
    expect(lint(ubah)).toEqual([harapan]);
  });

  test.each([
    ['kutipan bertitik di dalam kalimat', 'Pernahkah kamu bilang “Aman, Mas.” padahal tidak?'],
    ['elipsis tiga titik', 'Kalau tidak ada yang tahu... apa kamu tetap jujur?'],
  ])('refleksi satu kalimat tanya dengan %s', (_nama, refleksi) => {
    expect(
      lint({ fm: ganti('refleksi: Apa yang kamu lakukan?', `refleksi: |\n  ${refleksi}`) }),
    ).toEqual([]);
  });
});

describe('batas aturan tepat di angkanya', () => {
  test('opsi delapan kata, gelembung 160 karakter, dan label lampiran panjang lolos', () => {
    expect(
      lint({
        isi: (s) =>
          s
            .replace('* Buka -> buka', '* Buka dan baca semuanya sampai habis tanpa sisa -> buka')
            .replace(
              'Gilang: rak',
              `Gilang: ${'a'.repeat(160)}\nGilang: [${'L'.repeat(200)}] halo`,
            ),
      }),
    ).toEqual([]);
  });

  test('220 baris terlihat lolos, 221 menjadi W3', () => {
    const baris = (n: number) =>
      Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'Gilang: halo' : '> Hening.')).join('\n');
    expect(lint({ isi: ganti('> Selesai.', baris(216)) })).toEqual([]);
    expect(lint({ isi: ganti('> Selesai.', baris(217)) })).toEqual([
      'W3@16: Jalur terpanjang (“Buka”) 221 baris terlihat; usahakan paling banyak 220.',
    ]);
  });

  test('W1: @typing tidak memutus rangkaian kartu narasi', () => {
    expect(
      lint({ isi: ganti('== tutup\n-> akhir', '== tutup\n> Satu.\n@typing\n> Dua.\n-> akhir') }),
    ).toEqual([
      'W1@35: 3 kartu narasi berturut-turut di jalur “Tutup” (baris 28, 30, 35); maksimal dua.',
    ]);
  });
});

describe('peringatan', () => {
  test('W1 tiga kartu narasi berturut-turut melintasi knot', () => {
    expect(
      lint({ isi: ganti('== tutup\n-> akhir', '== tutup\n> Satu.\n> Dua.\n-> akhir') }),
    ).toEqual([
      'W1@34: 3 kartu narasi berturut-turut di jalur “Tutup” (baris 28, 29, 34); maksimal dua.',
    ]);
  });

  test('W2 gelembung lebih dari 160 karakter', () => {
    expect(lint({ isi: ganti('Gilang: rak', `Gilang: ${'a'.repeat(161)}`) })).toEqual([
      'W2@19: Gelembung 161 karakter; usahakan paling banyak 160 (dua baris di layar HP).',
    ]);
  });

  test('W3 jalur terpanjang lebih dari 220 baris terlihat', () => {
    const panjang = Array.from({ length: 221 }, (_, i) =>
      i % 2 === 0 ? 'Gilang: halo' : '> Hening.',
    );
    const hasil = lint({ isi: ganti('> Selesai.', panjang.join('\n')) });
    expect(hasil).toEqual([
      'W3@16: Jalur terpanjang (“Buka”) 225 baris terlihat; usahakan paling banyak 220.',
    ]);
  });

  test('W4 kata ketuaan (daftar sintetis)', () => {
    const hasil = lint({
      isi: ganti('Gilang: rak', 'Gilang: jadul banget'),
      opsi: { daftar: { ...DAFTAR_BAWAAN, kataKetuaan: ['jadul'] } },
    });
    expect(hasil).toEqual(['W4@19: Kata “jadul” terdengar ketuaan bagi pembaca (dated-words.ts).']);
  });

  test('“Gacor Family” boleh, dan peringatan tidak memblokir', () => {
    expect(lint({ isi: ganti('> Malam.', '@notif Gacor Family | 3 pesan baru | 22.00') })).toEqual(
      [],
    );
  });
});

describe('tes positif: naskah di content/ (BACKLOG B4)', () => {
  test('ep01 tanpa diagnostik', () => {
    expect(
      ringkas(
        lintEpisode(bacaRepo(NASKAH.ep01), bacaRepo(DALIL.ep01), {
          file: NASKAH.ep01,
          dalilFile: DALIL.ep01,
        }),
      ),
    ).toEqual([]);
  });

  test('ep02 tanpa diagnostik', () => {
    expect(
      ringkas(
        lintEpisode(bacaRepo(NASKAH.ep02), bacaRepo(DALIL.ep02), {
          file: NASKAH.ep02,
          dalilFile: DALIL.ep02,
        }),
      ),
    ).toEqual([]);
  });
});
