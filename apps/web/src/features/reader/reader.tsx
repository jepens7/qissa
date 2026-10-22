// Layar episode: memuat episode lewat lib/content.ts, lalu memutarnya. Gagal muat menampilkan "Coba lagi";
// kesalahan konten dan format yang belum didukung ditangkap ErrorBoundary.
import type { Episode, ManifestEpisode } from '@qissa/script/types';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '../../components/error-boundary.tsx';
import { Header } from '../../components/header.tsx';
import { muatEpisode, type Lingkungan } from '../../lib/content.ts';
import { t } from '../../lib/i18n.ts';
import { Pemutar } from './pemutar.tsx';

type Props = {
  entri: ManifestEpisode;
  sebelumnya: ManifestEpisode | undefined;
  ling: Lingkungan;
  onHome: () => void;
};

type Muat = { keadaan: 'memuat' } | { keadaan: 'galat' } | { keadaan: 'siap'; episode: Episode };

function geraknDikurangi(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function Reader({ entri, sebelumnya, ling, onHome }: Props) {
  const [muat, setMuat] = useState<Muat>({ keadaan: 'memuat' });
  const [reducedMotion] = useState(geraknDikurangi);

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

  if (muat.keadaan === 'siap') {
    return (
      <ErrorBoundary onHome={onHome}>
        <Pemutar
          episode={muat.episode}
          sebelumnya={sebelumnya}
          penyimpanan={ling.penyimpanan}
          reducedMotion={reducedMotion}
          onHome={onHome}
        />
      </ErrorBoundary>
    );
  }
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
      </main>
    </>
  );
}
