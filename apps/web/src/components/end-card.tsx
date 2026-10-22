import { t } from '../lib/i18n.ts';

type Props = {
  nomor: number;
  /** Nama pendek pilihan pembaca, berurutan. */
  path: string[];
  /** Jumlah akhir berbeda yang sudah dibaca di perangkat ini. */
  endings: number;
  pollNote?: string;
};

/** Kartu tamat: diumumkan datar, tanpa penilaian (DESIGN-SYSTEM §5). */
export function EndCard({ nomor, path, endings, pollNote }: Props) {
  return (
    <section className="card">
      <h3>{t('akhir.selesai', { nomor })}</h3>
      <p>{t('akhir.jalur', { jalur: path.join(' → ') })}</p>
      {pollNote === undefined ? null : <p>{pollNote}</p>}
      <p>{t('akhir.dibaca', { jumlah: endings })}</p>
    </section>
  );
}
