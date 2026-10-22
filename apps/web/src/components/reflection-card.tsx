import { t } from '../lib/i18n.ts';

type Props = {
  question: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  /** Pesan sesudah menyimpan: tersimpan atau gagal (SRS REF-2). */
  note: string;
};

/** Refleksi privat: hanya disimpan di perangkat, tidak pernah dikirim. */
export function ReflectionCard({ question, value, onChange, onSave, note }: Props) {
  return (
    <section className="card">
      <p className="q">{question}</p>
      <textarea
        name="refleksi"
        aria-label={t('refleksi.label')}
        placeholder={t('refleksi.placeholder')}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      <div>
        <button type="button" className="btn" onClick={onSave}>
          {t('refleksi.simpan')}
        </button>
      </div>
      <p className="note" role="status">
        {note}
      </p>
    </section>
  );
}
