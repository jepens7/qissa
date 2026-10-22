import { t } from '../lib/i18n.ts';

type Props = { onShare: () => void; onFeedback: () => void; note: string };

/** Bagikan dilema dan kirim masukan; pilihan pembaca tidak pernah ikut (SRS SHR-4). */
export function ShareCard({ onShare, onFeedback, note }: Props) {
  return (
    <section className="card">
      <h3>{t('bagikan.judul')}</h3>
      <p>{t('bagikan.ajakan')}</p>
      <div>
        <button type="button" className="btn" onClick={onShare}>
          {t('bagikan.tombol')}
        </button>
        <button type="button" className="btn ghost" onClick={onFeedback}>
          {t('bagikan.masukan')}
        </button>
      </div>
      <p className="note" role="status">
        {note}
      </p>
    </section>
  );
}
