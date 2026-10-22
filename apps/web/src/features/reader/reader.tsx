// Layar episode: memuat episode lewat lib/content.ts, lalu memutarnya. Gagal muat menampilkan "Coba lagi";
// kesalahan konten dan format yang belum didukung ditangkap ErrorBoundary.
import type { Episode, ManifestEpisode } from '@qissa/script/types';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '../../components/error-boundary.tsx';
import { Header } from '../../components/header.tsx';
import { getConfig } from '../../lib/config.ts';
import { muatEpisode, type Lingkungan } from '../../lib/content.ts';
import { t } from '../../lib/i18n.ts';
import { Pemutar } from './pemutar.tsx';

type Props = {
  entri: ManifestEpisode;
  /** Episode yang sudah terbit, untuk memo sampul dan tombol lanjut. */
  terbit: ManifestEpisode[];
  ling: Lingkungan;
  onHome: () => void;
  onOpen: (id: string) => void;
};

type Muat = { keadaan: 'memuat' } | { keadaan: 'galat' } | { keadaan: 'siap'; episode: Episode };

function gerakDikurangi(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function Reader({ entri, terbit, ling, onHome, onOpen }: Props) {
  const [muat, setMuat] = useState<Muat>({ keadaan: 'memuat' });
  const [reducedMotion] = useState(gerakDikurangi);
  /** Naik setiap "Ulang dari awal", supaya pemutar dibuat ulang dari sampul. */
  const [putaran, setPutaran] = useState(0);

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
    const { episode } = muat;
    const config = getConfig();
    return (
      <ErrorBoundary onHome={onHome}>
        <Pemutar
          key={putaran}
          episode={episode}
          sebelumnya={terbit.find((e) => e.nomor === episode.nomor - 1)}
          berikutnya={terbit.find((e) => e.id === episode.meta.berikutnya)}
          penyimpanan={ling.penyimpanan}
          reducedMotion={reducedMotion}
          siteUrl={config.siteUrl}
          waChannel={config.waChannel}
          onHome={onHome}
          onNext={onOpen}
          onRestart={() => {
            setPutaran((p) => p + 1);
            window.scrollTo(0, 0);
          }}
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
