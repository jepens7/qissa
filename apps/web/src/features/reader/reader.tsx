// Layar episode: memuat episode lewat lib/content.ts lalu menampilkan sampulnya. Pemutar cerita menyusul
// di D3 (docs/PLAN.md).
import type { Episode, ManifestEpisode } from '@qissa/script/types';
import { useCallback, useEffect, useState } from 'react';
import { Cover } from '../../components/cover.tsx';
import { Header } from '../../components/header.tsx';
import { muatEpisode, type Lingkungan } from '../../lib/content.ts';
import { t } from '../../lib/i18n.ts';

type Props = { entri: ManifestEpisode; ling: Lingkungan; onHome: () => void };

type Muat = { keadaan: 'memuat' } | { keadaan: 'galat' } | { keadaan: 'siap'; episode: Episode };

export function Reader({ entri, ling, onHome }: Props) {
  const [muat, setMuat] = useState<Muat>({ keadaan: 'memuat' });

  const ambil = useCallback(() => {
    setMuat({ keadaan: 'memuat' });
    muatEpisode(entri, ling).then(
      (episode) => {
        setMuat({ keadaan: 'siap', episode });
      },
      () => {
        setMuat({ keadaan: 'galat' });
      },
    );
  }, [entri, ling]);

  useEffect(() => {
    ambil();
  }, [ambil]);

  return (
    <>
      <Header
        name={t('app.nama')}
        initial={t('app.nama').charAt(0)}
        status={t('header.episode.status', { nomor: entri.nomor, judul: entri.judul })}
        right={
          <button className="ep" type="button" onClick={onHome}>
            {t('header.daftar')}
          </button>
        }
      />
      <main>
        {muat.keadaan === 'galat' ? (
          <section className="card">
            <p>{t('galat.muat')}</p>
            <button type="button" className="btn" onClick={ambil}>
              {t('galat.coba')}
            </button>
          </section>
        ) : null}
        {muat.keadaan === 'siap' ? (
          <Cover
            kicker={t('sampul.kicker', { nomor: muat.episode.nomor })}
            title={muat.episode.judul}
            body={muat.episode.meta.sampul}
            length={t('sampul.panjang', { menit: muat.episode.meta.durasi_menit, pilihan: 2 })}
          />
        ) : null}
      </main>
    </>
  );
}
