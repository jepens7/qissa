import { describe, expect, test } from 'vitest';
import { pengumpul } from '../src/diagnostics.ts';
import { bacaFrontMatter, type FieldFrontMatter } from '../src/front-matter.ts';
import { KEY_EPISODE } from '../src/parse.ts';
import { NASKAH, bacaRepo, ringkas } from './bantuan.ts';

const KEY_DALIL = {
  status: { teksBebas: false },
  reviewed_by: { teksBebas: false },
  reviewed_at: { teksBebas: false },
};

function baca(sumber: string, keys: Parameters<typeof bacaFrontMatter>[1] = KEY_EPISODE) {
  const { daftar, lapor } = pengumpul('uji.md');
  const hasil = bacaFrontMatter(sumber.split('\n'), keys, lapor);
  return { ...hasil, diagnostik: ringkas(daftar) };
}

function nilai(field: FieldFrontMatter | undefined) {
  return field?.nilai;
}

describe('front matter naskah di content/', () => {
  test('ep01 terbaca tanpa diagnostik dengan nilai yang sama seperti YAML 1.2', () => {
    const { fields, awalIsi, diagnostik } = baca(bacaRepo(NASKAH.ep01));
    expect(diagnostik).toEqual([]);
    expect(awalIsi).toBe(20);
    expect(nilai(fields.get('nomor'))).toEqual({ kind: 'teks', teks: '1' });
    expect(nilai(fields.get('rating'))).toEqual({ kind: 'teks', teks: '17+' });
    expect(nilai(fields.get('vars'))).toEqual({ kind: 'daftar', isi: ['dibaca', 'menegur'] });
    expect(nilai(fields.get('bagikan'))).toEqual({
      kind: 'teks',
      teks: 'Temen lu ngirim screenshot chat pribadi orang yang lu kenal. Caption-nya: “anak hijrah ternyata gitu ya”.\n\nLu bakal gimana?\nBuka · Tutup · Tegur\n\nQissa, Episode 1: Tangkapan Layar',
    });
    expect(fields.get('bagikan')?.line).toBe(11);
  });

  test('berikutnya kosong di ep02 terbaca sebagai kosong', () => {
    const { fields, diagnostik } = baca(bacaRepo(NASKAH.ep02));
    expect(diagnostik).toEqual([]);
    expect(nilai(fields.get('berikutnya'))).toEqual({ kind: 'kosong' });
  });

  test('templat dalil.md: komentar di belakang nilai dibuang', () => {
    const sumber = [
      '---',
      'status: draft            # draft | reviewed',
      'reviewed_by:             # nama pereview, kosong bila draft',
      'reviewed_at:             # YYYY-MM-DD',
      '---',
    ].join('\n');
    const { fields, diagnostik } = baca(sumber, KEY_DALIL);
    expect(diagnostik).toEqual([]);
    expect(nilai(fields.get('status'))).toEqual({ kind: 'teks', teks: 'draft' });
    expect(nilai(fields.get('reviewed_by'))).toEqual({ kind: 'kosong' });
    expect(nilai(fields.get('reviewed_at'))).toEqual({ kind: 'kosong' });
  });
});

describe('bentuk di luar subset YAML ditolak dengan S1', () => {
  const kasus: [string, string, string][] = [
    ['tanpa pembuka', 'id: ep01\n---', 'S1@1: Berkas harus diawali front matter'],
    ['tidak ditutup', '---\nid: ep01\n== pembuka', 'S1@1: Front matter tidak ditutup'],
    ['key tak dikenal', '---\nwarna: biru\n---', 'S1@2: Key “warna” tidak dikenal'],
    ['key ganda', '---\nid: ep01\nid: ep02\n---', 'S1@3: Key “id” ditulis dua kali'],
    ['tab', '---\nid:\tep01\n---', 'S1@2: Front matter tidak boleh memakai tab'],
    ['tanpa spasi', '---\nid:ep01\n---', 'S1@2: Setelah “id:” harus ada spasi'],
    ['diawali spasi', '---\n  id: ep01\n---', 'S1@2: Baris front matter tidak boleh diawali spasi'],
    ['titik dua di teks', '---\nteaser: Saldo: habis.\n---', 'S1@2: Nilai “teaser” memuat “: ”'],
    [
      'pagar di teks bebas',
      '---\nrefleksi: Kapan #jujur ke diri?\n---',
      'S1@2: Nilai “refleksi” memuat “ #”',
    ],
    ['awalan khusus', '---\nteaser: *Bukan* untukmu.\n---', 'S1@2: Nilai “teaser” diawali “*”'],
    ['kutip lurus', '---\njudul: "Uji"\n---', 'S1@2: Nilai “judul” diawali “"”'],
    [
      'indikator blok',
      '---\nbagikan: |-\n  teks\n---',
      'S1@2: Blok “bagikan” hanya boleh ditulis “|”',
    ],
    ['daftar tak ditutup', '---\nvars: [a, b\n---', 'S1@2: Daftar “vars” harus ditutup dengan ]'],
  ];
  test.each(kasus)('%s', (_nama, sumber, awalPesan) => {
    const { diagnostik } = baca(sumber);
    expect(diagnostik).toHaveLength(1);
    expect(diagnostik[0]).toContain(awalPesan);
  });

  test('blok | menyimpan baris kosong di tengah dan memangkas newline akhir', () => {
    const { fields } = baca('---\nbagikan: |\n  satu\n\n  dua\n\nberikutnya:\n---');
    expect(nilai(fields.get('bagikan'))).toEqual({ kind: 'teks', teks: 'satu\n\ndua' });
    expect(nilai(fields.get('berikutnya'))).toEqual({ kind: 'kosong' });
  });
});

describe('subset YAML: perbaikan dari review B2', () => {
  const satu = (sumber: string, keys: Parameters<typeof bacaFrontMatter>[1] = KEY_EPISODE) =>
    baca(sumber, keys).diagnostik;

  test('baris komentar penuh di front matter diterima', () => {
    expect(satu('---\n# catatan penulis\nid: ep01\n---')).toEqual([]);
  });

  test('pembatas dengan komentar YAML diterima', () => {
    expect(satu('--- # front matter\nid: ep01\n--- # selesai')).toEqual([]);
  });

  test('front matter yang tidak dibuka di baris pertama: satu S1, isinya tetap terbaca', () => {
    const { diagnostik, fields, awalIsi } = baca('\n---\nid: ep01\n---\n== a');
    expect(diagnostik).toEqual(['S1@1: Front matter harus dibuka dengan --- di baris pertama.']);
    expect(nilai(fields.get('id'))).toEqual({ kind: 'teks', teks: 'ep01' });
    expect(awalIsi).toBe(4);
  });

  test('front matter tidak ditutup: berhenti tepat di baris naskah pertama', () => {
    expect(baca('---\nid: ep01\n== pembuka\n-> END').awalIsi).toBe(2);
  });

  test.each([
    ['diakhiri titik dua', 'teaser: Saldo habis:', 'S1@2: Nilai “teaser” diakhiri “:”'],
    ['daftar untuk key teks', 'judul: [Draft]', 'S1@2: Nilai “judul” diawali “[”'],
    ['teks untuk vars', 'vars: dibaca', 'S1@2: “vars” harus ditulis sebagai daftar'],
    ['blok untuk vars', 'vars: |\n  dibaca', 'S1@2: “vars” harus ditulis sebagai daftar'],
    [
      'blok untuk bilangan',
      'nomor: |\n  7',
      'S1@2: “nomor” harus ditulis langsung sebagai bilangan',
    ],
    ['null YAML', 'berikutnya: null', 'S1@2: Nilai “berikutnya” dibaca YAML sebagai null'],
    ['tilde YAML', 'berikutnya: ~', 'S1@2: Nilai “berikutnya” dibaca YAML sebagai null'],
    ['boolean YAML', 'judul: true', 'S1@2: Nilai “judul” dibaca YAML sebagai boolean'],
    ['angka YAML di key teks', 'teaser: 2026', 'S1@2: Nilai “teaser” dibaca YAML sebagai angka'],
    ['item daftar kosong', 'vars: [a, , b]', 'S1@2: Daftar “vars” memuat item kosong'],
    ['tab di baris kosong', 'id: ep01\n\t', 'S1@3: Front matter tidak boleh memakai tab'],
    ['tab di isi blok', 'bagikan: |\n  Lu\tbakal', 'S1@3: Front matter tidak boleh memakai tab'],
    [
      'nilai berlanjut ke baris berikutnya',
      'teaser: Satu dua\n  tiga empat',
      'S1@2: Nilai “teaser” berlanjut',
    ],
    ['key milik Object.prototype', 'constructor: x', 'S1@2: Key “constructor” tidak dikenal'],
    ['pagar di awal teks bebas', 'judul: #1', 'S1@2: Nilai “judul” memuat “ #”'],
  ])('%s: satu S1', (_nama, isi, awalPesan) => {
    const diagnostik = satu(`---\n${isi}\n---`);
    expect(diagnostik).toHaveLength(1);
    expect(diagnostik[0]).toContain(awalPesan);
  });

  test('key yang ditolak beserta bloknya hanya memberi satu S1', () => {
    expect(satu('---\ncatatan: |\n  satu\n\n  dua\nid: ep01\n---')).toEqual([
      'S1@2: Key “catatan” tidak dikenal di front matter.',
    ]);
    expect(satu('---\nbagikan: >\n  satu\n  dua\n---')).toEqual([
      'S1@2: Blok “bagikan” hanya boleh ditulis “|” tanpa indikator tambahan.',
    ]);
  });

  test('bilangan di key angka tidak dianggap “angka YAML”', () => {
    expect(satu('---\nnomor: 1\ndurasi_menit: 5\nrating: 17+\n---')).toEqual([]);
  });
});
