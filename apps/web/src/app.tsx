// Kerangka aplikasi: routing hash (BACKLOG D8) di atas manifest yang dimuat sekali.
import type { Manifest } from '@qissa/script/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DebugPage } from './features/debug/debug-page.tsx';
import { HomeScreen } from './features/home/home-screen.tsx';
import { Reader } from './features/reader/reader.tsx';
import { getConfig } from './lib/config.ts';
import { episodeTerbit, hariIniJakarta, lingkunganBrowser, muatManifest } from './lib/content.ts';
import { t } from './lib/i18n.ts';
import { bacaRute, hashRute, type Rute } from './lib/route.ts';
import { penyimpananBrowser } from './lib/storage.ts';

export function App() {
  const [rute, setRute] = useState<Rute>(() => bacaRute(window.location.hash));
  const [ling] = useState(() => lingkunganBrowser(penyimpananBrowser()));
  const [manifest, setManifest] = useState<Manifest | null | 'memuat'>('memuat');

  useEffect(() => {
    const ubah = () => {
      setRute(bacaRute(window.location.hash));
    };
    window.addEventListener('hashchange', ubah);
    return () => {
      window.removeEventListener('hashchange', ubah);
    };
  }, []);

  useEffect(() => {
    let batal = false;
    void muatManifest(getConfig().contentBase, ling).then((m) => {
      if (!batal) {
        setManifest(m);
      }
    });
    return () => {
      batal = true;
    };
  }, [ling]);

  const pindah = useCallback((r: Rute) => {
    window.history.replaceState(null, '', hashRute(r));
    setRute(r);
    window.scrollTo(0, 0);
  }, []);

  // Episode dengan rilis di masa depan disembunyikan, kecuali saat vite dev (docs/PLAN.md D6).
  const terbit = useMemo(() => {
    if (manifest === 'memuat' || manifest === null) {
      return [];
    }
    return import.meta.env.DEV
      ? manifest.episodes
      : episodeTerbit(manifest, hariIniJakarta(new Date()));
  }, [manifest]);

  const entri = rute.nama === 'episode' ? terbit.find((e) => e.id === rute.id) : undefined;

  // #epNN hanya untuk episode yang sudah terbit; selain itu kembali ke daftar.
  useEffect(() => {
    if (rute.nama === 'episode' && manifest !== 'memuat' && entri === undefined) {
      pindah({ nama: 'home' });
    }
  }, [rute, manifest, entri, pindah]);

  const keHome = useCallback(() => {
    pindah({ nama: 'home' });
  }, [pindah]);

  // import.meta.env.DEV menjadi false di build produksi, sehingga modul debug ikut terbuang.
  if (import.meta.env.DEV && rute.nama === 'debug') {
    return <DebugPage />;
  }
  const buka = (id: string) => {
    pindah({ nama: 'episode', id });
  };
  let layar;
  if (rute.nama === 'episode') {
    layar =
      entri === undefined ? (
        <main />
      ) : (
        <Reader
          key={entri.id}
          entri={entri}
          terbit={terbit}
          ling={ling}
          onHome={keHome}
          onOpen={buka}
        />
      );
  } else {
    layar = (
      <HomeScreen
        episodes={terbit}
        gagal={manifest === null}
        penyimpanan={ling.penyimpanan}
        waChannel={getConfig().waChannel}
        onOpen={buka}
      />
    );
  }
  return (
    <>
      {layar}
      {/* Footer baru tampil setelah manifest termuat, bersama daftar episode, supaya tidak terdorong ke bawah
          saat kartu muncul (layout shift, SRS §11). */}
      {manifest === 'memuat' ? null : (
        <footer>
          {t('footer')}
          {/* Halaman statis di apps/web/public (BACKLOG E2); garis miring akhir menghindari redirect. */}
          <span className="tautan">
            <a href="/tentang/">{t('footer.tentang')}</a>
            <a href="/privasi/">{t('footer.privasi')}</a>
          </span>
        </footer>
      )}
    </>
  );
}
