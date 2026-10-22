import { t } from '../lib/i18n.ts';

type Props = {
  /** Nomor episode berikutnya yang sudah rilis; null bila belum ada. */
  next: number | null;
  /** Nomor episode yang menyusul, ditampilkan bila `next` null. */
  menyusul: number;
  onNext: () => void;
  onRestartP2: () => void;
  onRestart: () => void;
  onHome: () => void;
};

/** Lanjut ke episode berikutnya, ulang dari Pilihan 2, ulang dari awal, atau kembali ke daftar. */
export function NextCard({ next, menyusul, onNext, onRestartP2, onRestart, onHome }: Props) {
  return (
    <section className="card">
      <h3>{next === null ? t('lanjut.judul.terakhir') : t('lanjut.judul')}</h3>
      {next === null ? <p>{t('lanjut.menyusul', { nomor: menyusul })}</p> : null}
      <div>
        {next === null ? null : (
          <button type="button" className="btn" onClick={onNext}>
            {t('lanjut.tombol', { nomor: next })}
          </button>
        )}
        <button type="button" className="btn ghost" onClick={onRestartP2}>
          {t('lanjut.ulang.p2')}
        </button>
        <button type="button" className="btn ghost" onClick={onRestart}>
          {t('lanjut.ulang.awal')}
        </button>
        <button type="button" className="btn ghost" onClick={onHome}>
          {t('lanjut.daftar')}
        </button>
      </div>
    </section>
  );
}
