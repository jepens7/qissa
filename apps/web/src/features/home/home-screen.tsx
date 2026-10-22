// Layar home (BACKLOG D5, SRS LIB-1): poll Episode 1, daftar episode yang sudah terbit dengan status baca di
// perangkat ini, dan kartu saluran. Teks poll dari id.json; nama pendeknya sama dengan opsi p1 ep01.
import type { ManifestEpisode } from '@qissa/script/types';
import { ChannelCard } from '../../components/channel-card.tsx';
import { EpisodeCard } from '../../components/episode-card.tsx';
import { Header } from '../../components/header.tsx';
import { PollCard } from '../../components/poll-card.tsx';
import { track } from '../../lib/analytics.ts';
import { akhiranKunci, t, type KunciPesan } from '../../lib/i18n.ts';
import { bacaAkhir, simpanPoll, type Penyimpanan } from '../../lib/storage.ts';

type Props = {
  episodes: ManifestEpisode[];
  /** Manifest gagal dimuat dan tidak ada salinan tersimpan. */
  gagal: boolean;
  penyimpanan: Penyimpanan | null;
  waChannel: string | null;
  onOpen: (id: string) => void;
};

const OPSI_POLL = akhiranKunci('home.poll.opsi.').map((name) => ({
  name,
  text: t(`home.poll.opsi.${name}` as KunciPesan),
}));

function statusEpisode(episode: ManifestEpisode, penyimpanan: Penyimpanan | null): string {
  const jumlah = bacaAkhir(penyimpanan, episode.id).length;
  if (jumlah > 0) {
    return t('home.episode.selesai', { jumlah });
  }
  return t(episode.nomor === 1 ? 'home.episode.mulai' : 'home.episode.baru');
}

export function HomeScreen({ episodes, gagal, penyimpanan, waChannel, onOpen }: Props) {
  return (
    <>
      <Header
        name={t('app.nama')}
        initial={t('app.nama').charAt(0)}
        status={episodes.length > 0 ? t('header.home.status', { jumlah: episodes.length }) : ''}
      />
      <main>
        <section className="home">
          <PollCard
            kicker={t('home.poll.kicker')}
            question={t('home.poll.pertanyaan')}
            ask={t('home.poll.ajakan')}
            options={OPSI_POLL}
            onPick={(name) => {
              simpanPoll(penyimpanan, name);
              track('poll', { pilih: name });
              onOpen('ep01');
            }}
          />
          <p className="lead">{t('home.pengantar')}</p>
          {gagal ? (
            <section className="card">
              <p>{t('galat.daftar')}</p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  window.location.reload();
                }}
              >
                {t('galat.coba')}
              </button>
            </section>
          ) : null}
          {episodes.map((e) => (
            <EpisodeCard
              key={e.id}
              num={t('home.episode.nomor', { nomor: e.nomor })}
              title={e.judul}
              teaser={e.teaser}
              status={statusEpisode(e, penyimpanan)}
              onOpen={() => {
                onOpen(e.id);
              }}
            />
          ))}
          {waChannel === null ? null : (
            <ChannelCard
              url={waChannel}
              text={t('saluran.home')}
              primary={false}
              onFollow={() => {
                track('saluran', { dari: 'home' });
              }}
            />
          )}
        </section>
      </main>
    </>
  );
}
