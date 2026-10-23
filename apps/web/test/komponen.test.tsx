// Markup komponen dirender ke string dengan react-dom/server, tanpa DOM (ADR-016). Teks naskah selalu
// lewat escaping React; kartu dalil dirender dari struktur Dalil.
import type { Dalil, Shot } from '@qissa/script/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Bubble } from '../src/components/bubble.tsx';
import { ChoiceBlock } from '../src/components/choice-block.tsx';
import { NextCard } from '../src/components/next-card.tsx';
import { inisialAplikasi } from '../src/components/notif-card.tsx';
import { PaperCard, kelompokDalil } from '../src/components/paper-card.tsx';
import { ShotCard } from '../src/components/shot-card.tsx';
import { akhiranKunci, t } from '../src/lib/i18n.ts';

const tanpaAksi = () => undefined;

describe('i18n', () => {
  test('t mengganti placeholder dan membiarkan yang tanpa isian', () => {
    expect(t('akhir.selesai', { nomor: 2 })).toBe('Episode 2 selesai');
    expect(t('sampul.memo', { pertama: 'Tutup' })).toBe(
      'Di episode sebelumnya kamu memilih Tutup, lalu {kedua}.',
    );
  });

  test('nama opsi poll diambil dari kunci i18n, berurutan', () => {
    expect(akhiranKunci('home.poll.opsi.')).toEqual(['Buka', 'Tutup', 'Tegur']);
  });
});

describe('komponen', () => {
  test('Bubble: nama pengirim dan lampiran; teks naskah di-escape', () => {
    expect(
      renderToStaticMarkup(<Bubble side="in" text="<b>halo</b>" from="Tika" attach="Foto: resi" />),
    ).toBe(
      '<div class="row in"><div class="bubble"><span class="from">Tika</span><span class="attach">Foto: resi</span>&lt;b&gt;halo&lt;/b&gt;</div></div>',
    );
  });

  test('ShotCard: tertutup, mini-chat dengan pov, dan komentar', () => {
    expect(renderToStaticMarkup(<ShotCard shot={null} />)).toContain(
      '<div class="closed">Belum dibuka</div>',
    );
    const chat: Shot = {
      cap: 'Tangkapan layar, chat',
      cut: 'dipotong di sini',
      pov: 'Nadia',
      lines: [
        { from: 'Bram', text: 'Besok?' },
        { from: 'Nadia', text: 'Lihat nanti.' },
      ],
    };
    expect(renderToStaticMarkup(<ShotCard shot={chat} />)).toContain(
      '<div class="cut">dipotong di sini</div><div class="mini"><span class="b">Bram: Besok?</span><span class="n">Lihat nanti.</span></div>',
    );
    const komentar: Shot = { cap: 'Kolom komentar', cmt: { handle: 'akun.uji', text: 'teks' } };
    expect(renderToStaticMarkup(<ShotCard shot={komentar} />)).toContain(
      '<div class="cmt"><b>akun.uji</b>teks</div>',
    );
  });

  test('ChoiceBlock: opsi terpilih ditandai, semuanya bisa dinonaktifkan', () => {
    const html = renderToStaticMarkup(
      <ChoiceBlock
        label="Pilihan 1 dari 2"
        options={[{ text: 'A' }, { text: 'B' }]}
        picked={1}
        disabled={true}
        onPick={tanpaAksi}
      />,
    );
    expect(html).toContain('<button type="button" class="choice" disabled="">A</button>');
    expect(html).toContain('<button type="button" class="choice picked" disabled="">B</button>');
  });

  test('NotifCard: dua huruf ikon dari nama aplikasi', () => {
    expect(inisialAplikasi('Gacor Family')).toBe('GF');
    expect(inisialAplikasi('bank')).toBe('B');
  });

  test('NextCard tanpa episode berikutnya: templat menyusul, tanpa tombol lanjut', () => {
    const html = renderToStaticMarkup(
      <NextCard
        next={null}
        menyusul={3}
        onNext={tanpaAksi}
        onRestartP2={tanpaAksi}
        onRestart={tanpaAksi}
        onHome={tanpaAksi}
      />,
    );
    expect(html).toContain('<p>Episode 3 menyusul.</p>');
    expect(html).not.toContain('Lanjut ke Episode');
  });
});

describe('PaperCard', () => {
  const DALIL: Dalil = {
    status: 'draft',
    reviewed_by: null,
    reviewed_at: null,
    sections: [
      {
        kind: 'ayat',
        entries: [
          {
            title: 'QS Uji 1:1',
            lines: [
              { kind: 'arab', text: 'نص' },
              { kind: 'teks', text: 'Terjemahan.' },
              { kind: 'rujukan', text: 'Terjemahan Kemenag' },
            ],
          },
        ],
      },
      { kind: 'catatan', entries: [{ lines: [{ kind: 'teks', text: 'Catatan.' }] }] },
      { kind: 'hukum', entries: [{ lines: [{ kind: 'teks', text: 'Hukum.' }] }] },
    ],
  };

  test('Arab RTL, rujukan, hukum menempel di catatan sebagai rujukan, badge draft', () => {
    const html = renderToStaticMarkup(<PaperCard dalil={DALIL} />);
    expect(html).toBe(
      '<section class="paper"><h2>Apa kata Al-Qur’an dan Sunnah</h2>' +
        '<h4>QS Uji 1:1</h4><p class="ar" lang="ar" dir="rtl">نص</p><p>Terjemahan.</p><p class="ref">Terjemahan Kemenag</p>' +
        '<hr/><h4>Catatan</h4><p>Catatan.</p><p class="ref">Hukum.</p>' +
        '<span class="badge">Belum direview ulama</span></section>',
    );
  });

  test('reviewed menampilkan pereview dan tanggal dalam format Indonesia', () => {
    const html = renderToStaticMarkup(
      <PaperCard
        dalil={{
          ...DALIL,
          status: 'reviewed',
          reviewed_by: 'Pereview Uji',
          reviewed_at: '2026-11-10',
        }}
      />,
    );
    expect(html).toContain(
      '<span class="badge">Direview oleh Pereview Uji, 10 November 2026</span>',
    );
  });

  test('ulama berbeda: label, dua pendapat berujukan, kalimat penutup, lalu hukum menempel (F2)', () => {
    const html = renderToStaticMarkup(
      <PaperCard
        dalil={{
          ...DALIL,
          sections: [
            { kind: 'catatan', entries: [{ lines: [{ kind: 'teks', text: 'Catatan.' }] }] },
            {
              kind: 'ikhtilaf',
              entries: [
                {
                  title: 'Pendapat pertama',
                  lines: [
                    { kind: 'teks', text: 'Pendapat A.' },
                    { kind: 'rujukan', text: 'Sumber: Kitab Uji A' },
                  ],
                },
                {
                  title: 'Pendapat kedua',
                  lines: [
                    { kind: 'teks', text: 'Pendapat B.' },
                    { kind: 'rujukan', text: 'Sumber: Kitab Uji B' },
                  ],
                },
              ],
            },
            { kind: 'hukum', entries: [{ lines: [{ kind: 'teks', text: 'Hukum.' }] }] },
          ],
        }}
      />,
    );
    expect(html).toContain(
      '<h4>Catatan</h4><p>Catatan.</p>' +
        '<hr/><h4>Ulama berbeda</h4><p>Pendapat A.</p><p class="ref">Sumber: Kitab Uji A</p>' +
        '<p>Pendapat B.</p><p class="ref">Sumber: Kitab Uji B</p>' +
        '<p>Tanyakan ustadz yang Anda percaya untuk kasus Anda.</p><p class="ref">Hukum.</p>',
    );
  });

  test('pengelompokan tidak mengubah struktur Dalil', () => {
    const salinan = structuredClone(DALIL);
    kelompokDalil(DALIL.sections);
    expect(DALIL).toEqual(salinan);
  });
});
