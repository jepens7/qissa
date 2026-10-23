import type { Dalil, DalilLine, DalilSection } from '@qissa/script/types';
import { Fragment } from 'react';
import { t, type KunciPesan } from '../lib/i18n.ts';

const LABEL: Record<DalilSection['kind'], KunciPesan> = {
  riwayat: 'dalil.bagian.riwayat',
  ayat: 'dalil.bagian.ayat',
  hadis: 'dalil.bagian.hadis',
  catatan: 'dalil.bagian.catatan',
  ikhtilaf: 'dalil.bagian.ikhtilaf',
  hukum: 'dalil.bagian.hukum',
};

/** Satu kelompok di antara dua garis; `rujukanSemua` merender setiap baris sebagai rujukan. */
type Kelompok = { judul: string | null; baris: DalilLine[]; rujukanSemua: boolean };

/**
 * Kelompok kartu seperti prototipe: setiap entri riwayat dan ayat berdiri sendiri dengan judulnya;
 * hadis, catatan, dan ulama berbeda masing-masing satu kelompok berjudul bagian; hukum negara menempel
 * di kelompok terakhir sebagai baris rujukan. Ulama berbeda ditutup kalimat penutup dari i18n
 * (CONTENT-RULES §7, STORY-BIBLE).
 */
export function kelompokDalil(sections: readonly DalilSection[]): Kelompok[] {
  const hasil: Kelompok[] = [];
  for (const s of sections) {
    const label = t(LABEL[s.kind]);
    if (s.kind === 'riwayat' || s.kind === 'ayat') {
      for (const e of s.entries) {
        const judul =
          e.title === undefined ? label : s.kind === 'riwayat' ? `${label}: ${e.title}` : e.title;
        hasil.push({ judul, baris: [...e.lines], rujukanSemua: false });
      }
    } else if (s.kind === 'hukum' && hasil.length > 0) {
      const terakhir = hasil[hasil.length - 1];
      terakhir?.baris.push(
        ...s.entries.flatMap((e) => e.lines.map((l) => ({ ...l, kind: 'rujukan' as const }))),
      );
    } else {
      const baris = s.entries.flatMap((e) => e.lines);
      if (s.kind === 'ikhtilaf') {
        baris.push({ kind: 'teks', text: t('dalil.ikhtilaf.penutup') });
      }
      hasil.push({ judul: label, baris, rujukanSemua: s.kind === 'hukum' });
    }
  }
  return hasil;
}

/** Tanggal ISO menjadi format Indonesia, mis. 10 November 2026 (SRS NFR-7). */
export function tanggalIndonesia(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

function Baris({ baris, rujukan }: { baris: DalilLine; rujukan: boolean }) {
  if (baris.kind === 'arab') {
    return (
      <p className="ar" lang="ar" dir="rtl">
        {baris.text}
      </p>
    );
  }
  return <p className={rujukan || baris.kind === 'rujukan' ? 'ref' : undefined}>{baris.text}</p>;
}

/** Kartu dalil sebagai kertas hangat, dari struktur Dalil hasil compile, tanpa HTML mentah. */
export function PaperCard({ dalil }: { dalil: Dalil }) {
  const review =
    dalil.status === 'reviewed' && dalil.reviewed_by !== null && dalil.reviewed_at !== null
      ? t('dalil.reviewed', {
          oleh: dalil.reviewed_by,
          tanggal: tanggalIndonesia(dalil.reviewed_at),
        })
      : t('dalil.draft');
  return (
    <section className="paper">
      <h2>{t('dalil.judul')}</h2>
      {kelompokDalil(dalil.sections).map((k, i) => (
        <Fragment key={i}>
          {i > 0 ? <hr /> : null}
          {k.judul === null ? null : <h4>{k.judul}</h4>}
          {k.baris.map((b, j) => (
            <Baris key={j} baris={b} rujukan={k.rujukanSemua} />
          ))}
        </Fragment>
      ))}
      <span className="badge">{review}</span>
    </section>
  );
}
