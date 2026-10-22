// Layar home: daftar episode yang sudah terbit. Poll, status baca, saluran, dan footer menyusul di D5.
import type { ManifestEpisode } from '@qissa/script/types';
import { EpisodeCard } from '../../components/episode-card.tsx';
import { Header } from '../../components/header.tsx';
import { t } from '../../lib/i18n.ts';

type Props = { episodes: ManifestEpisode[]; onOpen: (id: string) => void };

export function HomeScreen({ episodes, onOpen }: Props) {
  return (
    <>
      <Header
        name={t('app.nama')}
        initial={t('app.nama').charAt(0)}
        status={t('header.home.status', { jumlah: episodes.length })}
      />
      <main>
        <section className="home">
          {episodes.map((e) => (
            <EpisodeCard
              key={e.id}
              num={t('home.episode.nomor', { nomor: e.nomor })}
              title={e.judul}
              teaser={e.teaser}
              status={t('home.episode.baru')}
              onOpen={() => {
                onOpen(e.id);
              }}
            />
          ))}
        </section>
      </main>
    </>
  );
}
