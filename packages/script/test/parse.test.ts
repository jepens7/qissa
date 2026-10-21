import { describe, expect, test } from 'vitest';
import type { PernyataanKondisiBlok, PernyataanPilihan } from '../src/ast.ts';
import { FRONT_MATTER_UJI, NASKAH, bacaRepo, parse, ringkas } from './bantuan.ts';

describe('naskah di content/ terparse tanpa error (BACKLOG B2)', () => {
  test.each(Object.entries(NASKAH))('%s', (_id, path) => {
    const { diagnostik } = parse(bacaRepo(path));
    expect(ringkas(diagnostik)).toEqual([]);
  });

  test('ep01: urutan knot, shot, blok pilihan, dan blok ??', () => {
    const { ast } = parse(bacaRepo(NASKAH.ep01));
    expect(ast.knots.map((k) => k.name)).toEqual([
      'pembuka',
      'baca',
      'tutup',
      'tegur',
      'pagi',
      'akhir_gatau',
      'akhir_cerita',
      'cerita_dibaca',
      'cerita_tutup',
      'cerita_tegur',
      'akhir_ketemu',
      'penutup',
    ]);
    expect(ast.shots).toEqual([
      {
        name: 'nadia-bram',
        line: 22,
        cap: { text: 'Tangkapan layar, chat Nadia', line: 23 },
        cut: { text: 'dipotong di sini', line: 24 },
        pov: { text: 'Nadia', line: 25 },
        lines: [
          { from: 'Bram', text: 'Besok jadi ke rumah?', line: 26 },
          { from: 'Nadia', text: 'InsyaAllah. Jam 7 ya, aku langsung dari kantor.', line: 27 },
          { from: 'Bram', text: 'Nginep aja kalau kemaleman. Kamar atas kosong.', line: 28 },
          { from: 'Nadia', text: 'Lihat nanti.', line: 29 },
        ],
      },
    ]);

    const pagi = ast.knots.find((k) => k.name === 'pagi');
    const blok = pagi?.isi.find((p) => p.kind === 'kondisi-blok') as PernyataanKondisiBlok;
    expect(blok.cabang.map((c) => [c.cond, c.isi.length])).toEqual([
      ['dibaca', 1],
      [null, 1],
    ]);
    const pilihan = pagi?.isi.at(-1) as PernyataanPilihan;
    expect(pilihan).toMatchObject({
      kind: 'pilihan',
      line: 109,
      label: 'Pilihan 2 dari 2',
      key: 'p2',
    });
    expect(pilihan.opsi.map((o) => [o.to, o.name])).toEqual([
      ['akhir_gatau', 'Ga tau'],
      ['akhir_cerita', 'Cerita semuanya'],
      ['akhir_ketemu', 'Ketemu dulu'],
    ]);
  });

  test('ep02: shot komentar dan blok ?? tiga cabang', () => {
    const { ast } = parse(bacaRepo(NASKAH.ep02));
    expect(ast.shots[0]).toMatchObject({
      name: 'komentar-penipu',
      cap: { text: 'Tangkapan layar, kolom komentar' },
      cmt: { handle: 'dion.prtm', text: 'PENIPU, kelebihan transfer ga dibalikin full', line: 24 },
      lines: [],
    });
    const minggu = ast.knots.find((k) => k.name === 'minggu');
    const blok = minggu?.isi.find((p) => p.kind === 'kondisi-blok') as PernyataanKondisiBlok;
    expect(blok.cabang.map((c) => c.cond)).toEqual(['dipakai', 'sebagian', null]);
  });
});

describe('kesalahan sintaks dilaporkan sebagai S1 dan parser jalan terus', () => {
  const naskah = (isi: string) => `${FRONT_MATTER_UJI}${isi}`;
  // Front matter uji ditutup di baris 15; isi naskah dimulai di baris 16.
  const kasus: [string, string, string[]][] = [
    [
      'baris sebelum knot pertama',
      '> Malam.\n== a\n-> END',
      ['S1@16: Baris naskah harus berada di dalam knot'],
    ],
    ['nama knot tidak sah', '== Pembuka\n-> END', ['S1@16: Nama knot “Pembuka” harus huruf kecil']],
    [
      'nama knot terlarang',
      '== constructor\n-> END',
      ['S1@16: “constructor” tidak boleh dipakai sebagai nama knot'],
    ],
    ['knot ganda', '== a\n-> b\n== a\n-> END', ['S1@18: Knot “a” sudah didefinisikan']],
    [
      '?? tanpa penutup',
      '== a\n?? dibaca\n> X\n-> END',
      ['S1@19: Blok ?? hanya boleh berisi', 'S1@17: Blok ?? belum ditutup'],
    ],
    [
      '?? else ganda',
      '== a\n?? dibaca\n> X\n?? else\n> Y\n?? else\n?? end\n-> END',
      ['S1@21: Blok ?? hanya boleh punya satu'],
    ],
    [
      '?? kondisi setelah else',
      '== a\n?? dibaca\n> X\n?? else\n> Y\n?? menegur\n?? end\n-> END',
      ['S1@21: Cabang “?? kondisi” tidak boleh muncul setelah'],
    ],
    [
      '?? end tanpa pembuka',
      '== a\n?? end\n-> END',
      ['S1@17: “?? end” tanpa “?? kondisi” pembuka'],
    ],
    [
      '@set di dalam ??',
      '== a\n?? dibaca\n@set dibaca\n?? end\n-> END',
      ['S1@18: Blok ?? hanya boleh berisi'],
    ],
    [
      '? dengan perpindahan',
      '== a\n? dibaca: -> b\n-> END',
      ['S1@17: Kondisional satu baris hanya untuk'],
    ],
    [
      'opsi tanpa label',
      '== a\n* Pergi -> b #Pergi',
      ['S1@17: Opsi harus langsung mengikuti label'],
    ],
    [
      'nama variabel tidak sah',
      '== a\n@set Dibaca\n-> END',
      ['S1@17: Nama variabel “Dibaca” harus huruf kecil'],
    ],
    [
      'shot tanpa cap',
      '::: shot x\nBram: Halo\n:::\n== a\n-> END',
      ['S1@16: Shot “x” wajib punya “cap:”'],
    ],
    [
      'shot tidak ditutup',
      '::: shot x\ncap: Tangkapan\n== a\n-> END',
      ['S1@16: Blok shot “x” belum ditutup'],
    ],
    [
      'shot bernama closed',
      '::: shot closed\ncap: X\n:::\n== a\n-> END',
      ['S1@16: “closed” tidak boleh dipakai sebagai nama shot.'],
    ],
    ['::: tanpa pembuka', '== a\n:::\n-> END', ['S1@17: “:::” penutup tanpa blok shot']],
  ];
  test.each(kasus)('%s', (_nama, isi, harapan) => {
    const hasil = ringkas(parse(naskah(isi)).diagnostik);
    expect(hasil).toHaveLength(harapan.length);
    harapan.forEach((awal, i) => {
      expect(hasil[i]).toContain(awal);
    });
  });

  test('baris sesudah penutup knot tetap masuk AST untuk diperiksa L2', () => {
    const { ast, diagnostik } = parse(naskah('== a\n-> END\n> Tidak pernah dibaca.'));
    expect(diagnostik).toEqual([]);
    expect(ast.knots[0]?.isi.map((p) => p.kind)).toEqual(['end', 'baris']);
  });

  test('CRLF dan BOM dibaca sama dengan LF', () => {
    const lf = parse(bacaRepo(NASKAH.ep01));
    const crlf = parse(
      `${String.fromCharCode(0xfeff)}${bacaRepo(NASKAH.ep01).replaceAll('\n', '\r\n')}`,
    );
    expect(crlf.diagnostik).toEqual([]);
    expect(crlf.ast.knots).toEqual(lf.ast.knots);
    expect(crlf.ast.shots).toEqual(lf.ast.shots);
  });
});

describe('AST lengkap untuk setiap jenis pernyataan', () => {
  test('setiap pernyataan masuk AST dengan nomor barisnya', () => {
    const baris = [
      '::: shot s',
      'cap: Tangkapan layar',
      'Bram: Halo',
      ':::',
      '== a',
      '@view Gilang | G | online | Chat dengan Gilang',
      '> Malam.',
      'Gilang: rak',
      'Raka: [Foto: resi] Udah',
      '@typing',
      '@shot s',
      '@sys Nadia keluar dari grup',
      '@notif Gacor Family | 3 pesan | 22.00',
      '@bank Rp1.000 | DION',
      '@set dibaca',
      '? dibaca: Gilang: sudah',
      '?? !dibaca',
      '> Belum.',
      '?? else',
      '> Sudah.',
      '?? end',
      '[Pilihan 1 dari 1] #p1',
      '* Satu -> b #Satu',
      '* Dua -> c #Dua',
      '* Tiga -> b #Tiga',
      '== b',
      '=> dibaca: c | b2',
      '== b2',
      '-> c',
      '== c',
      '-> END',
    ];
    const { ast, diagnostik } = parse(`${FRONT_MATTER_UJI}${baris.join('\n')}`);
    expect(diagnostik).toEqual([]);
    expect(ast.shots).toEqual([
      {
        name: 's',
        line: 16,
        cap: { text: 'Tangkapan layar', line: 17 },
        lines: [{ from: 'Bram', text: 'Halo', line: 18 }],
      },
    ]);
    expect(ast.knots.map((k) => [k.name, k.line])).toEqual([
      ['a', 20],
      ['b', 41],
      ['b2', 43],
      ['c', 45],
    ]);
    const token = (t: Record<string, unknown>) => ({ kind: 'baris', token: t });
    expect(ast.knots[0]?.isi).toEqual([
      token({
        kind: 'view',
        line: 21,
        name: 'Gilang',
        initial: 'G',
        sub: 'online',
        pill: 'Chat dengan Gilang',
      }),
      token({ kind: 'nar', line: 22, text: 'Malam.' }),
      token({ kind: 'ucapan', line: 23, speaker: 'Gilang', text: 'rak' }),
      token({ kind: 'ucapan', line: 24, speaker: 'Raka', text: 'Udah', attach: 'Foto: resi' }),
      token({ kind: 'typing', line: 25 }),
      token({ kind: 'shot', line: 26, state: 's' }),
      token({ kind: 'sys', line: 27, text: 'Nadia keluar dari grup' }),
      token({ kind: 'notif', line: 28, app: 'Gacor Family', text: '3 pesan', time: '22.00' }),
      token({ kind: 'bank', line: 29, amount: 'Rp1.000', from: 'DION' }),
      token({ kind: 'set', line: 30, v: 'dibaca' }),
      {
        kind: 'kondisi-baris',
        line: 31,
        cond: 'dibaca',
        token: { kind: 'ucapan', line: 31, speaker: 'Gilang', text: 'sudah' },
      },
      {
        kind: 'kondisi-blok',
        line: 32,
        cabang: [
          { line: 32, cond: '!dibaca', isi: [{ kind: 'nar', line: 33, text: 'Belum.' }] },
          { line: 34, cond: null, isi: [{ kind: 'nar', line: 35, text: 'Sudah.' }] },
        ],
      },
      {
        kind: 'pilihan',
        line: 37,
        label: 'Pilihan 1 dari 1',
        key: 'p1',
        opsi: [
          { kind: 'opsi', line: 38, text: 'Satu', to: 'b', name: 'Satu' },
          { kind: 'opsi', line: 39, text: 'Dua', to: 'c', name: 'Dua' },
          { kind: 'opsi', line: 40, text: 'Tiga', to: 'b', name: 'Tiga' },
        ],
      },
    ]);
    expect(ast.knots[1]?.isi).toEqual([
      {
        kind: 'branch',
        line: 42,
        cases: [
          { cond: 'dibaca', to: 'c' },
          { cond: null, to: 'b2' },
        ],
      },
    ]);
    expect(ast.knots[2]?.isi).toEqual([{ kind: 'go', line: 44, to: 'c' }]);
    expect(ast.knots[3]?.isi).toEqual([{ kind: 'end', line: 46 }]);
  });

  test('ep01: kondisional satu baris dan => tersimpan dengan benar', () => {
    const { ast } = parse(bacaRepo(NASKAH.ep01));
    const knot = (nama: string) => ast.knots.find((k) => k.name === nama)?.isi ?? [];
    expect(knot('akhir_gatau').at(-3)).toEqual({
      kind: 'kondisi-baris',
      line: 125,
      cond: 'dibaca',
      token: { kind: 'ucapan', line: 125, speaker: 'Nadia', text: 'Dan lu baca.' },
    });
    expect(knot('akhir_gatau').at(-1)).toEqual({ kind: 'go', line: 127, to: 'penutup' });
    expect(knot('akhir_cerita').at(-1)).toEqual({
      kind: 'branch',
      line: 133,
      cases: [
        { cond: 'dibaca', to: 'cerita_dibaca' },
        { cond: 'menegur', to: 'cerita_tegur' },
        { cond: null, to: 'cerita_tutup' },
      ],
    });
  });
});

describe('S1 tambahan dari review B2', () => {
  const naskah = (isi: string) => `${FRONT_MATTER_UJI}${isi}`;
  const kasus: [string, string[], string][] = [
    [
      'shot ganda',
      ['::: shot x', 'cap: A', ':::', '::: shot x', 'cap: B', ':::', '== a', '-> END'],
      'S1@19: Shot “x” sudah didefinisikan.',
    ],
    [
      'cap ganda',
      ['::: shot x', 'cap: A', 'cap: B', ':::', '== a', '-> END'],
      'S1@18: “cap” ditulis dua kali di shot “x”.',
    ],
    [
      'cmt dan chat sekaligus',
      ['::: shot x', 'cap: A', 'Bram: Halo', 'cmt: dion | teks', ':::', '== a', '-> END'],
      'S1@19: Shot “x” berisi cmt atau baris chat, tidak keduanya.',
    ],
    [
      'baris naskah di dalam shot',
      ['::: shot x', 'cap: A', '> Malam: sepi', ':::', '== a', '-> END'],
      'S1@18: Baris di blok shot tidak dikenali: “> Malam: sepi”.',
    ],
    [
      'nama variabel else',
      ['== a', '@set else', '-> END'],
      'S1@17: “else” tidak boleh dipakai sebagai nama variabel.',
    ],
    [
      'nama variabel di kondisi',
      ['== a', '? Dibaca: > X', '-> END'],
      'S1@17: Nama variabel “Dibaca” harus huruf kecil',
    ],
    [
      'kunci pilihan kembar',
      [
        '== a',
        '[P] #p1',
        '* A -> b #A',
        '* B -> b #B',
        '* C -> b #C',
        '== b',
        '[Q] #p1',
        '* D -> c #D',
        '* E -> c #E',
        '* F -> c #F',
        '== c',
        '-> END',
      ],
      'S1@22: Kunci pilihan “#p1” sudah dipakai di baris 17.',
    ],
    [
      '?? END: satu S1, blok tetap tertutup',
      ['== a', '?? dibaca', '> X', '?? END', '-> END'],
      'S1@19: Tulis “?? end” dengan huruf kecil.',
    ],
    [
      '?? belum ditutup saat knot baru',
      ['== a', '?? dibaca', '> X', '== b', '-> END'],
      'S1@17: Blok ?? belum ditutup dengan “?? end”.',
    ],
    [
      'kondisional bersarang',
      ['== a', '? dibaca: ? dibaca: > X', '-> END'],
      'S1@17: Kondisional tidak boleh bersarang.',
    ],
  ];
  test.each(kasus)('%s', (_nama, baris, harapan) => {
    const hasil = ringkas(parse(naskah(baris.join('\n'))).diagnostik);
    expect(hasil).toHaveLength(1);
    expect(hasil[0]).toContain(harapan);
  });

  test('front matter tidak ditutup: satu S1, knot pertama tetap terbaca', () => {
    const { ast, diagnostik } = parse('---\nid: ep01\n== pembuka\n> X\n-> END');
    expect(ringkas(diagnostik)).toEqual(['S1@1: Front matter tidak ditutup dengan ---.']);
    expect(ast.knots.map((k) => k.name)).toEqual(['pembuka']);
  });

  test('diagnostik S1 adalah error dengan nama berkas dan nomor baris', () => {
    expect(parse(naskah('== Pembuka\n-> END')).diagnostik[0]).toMatchObject({
      level: 'error',
      code: 'S1',
      file: 'uji.qs.md',
      line: 16,
    });
  });
});
