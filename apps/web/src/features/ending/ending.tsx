// Layar akhir (BACKLOG D4, SRS UI-5): kartu dalil, refleksi, bagikan dan masukan, saluran, serta lanjut atau
// ulang. Kartu tamat dirender pemutar di dalam region live; bagian ini di luarnya, supaya pembaca layar tidak
// membacakan seluruh kartu dalil sekaligus (DESIGN-SYSTEM §6). Dalil dirender dari struktur Dalil, tidak dari HTML.
import type { Episode, ManifestEpisode } from '@qissa/script/types';
import { useState } from 'react';
import { ChannelCard } from '../../components/channel-card.tsx';
import { NextCard } from '../../components/next-card.tsx';
import { PaperCard } from '../../components/paper-card.tsx';
import { ReflectionCard } from '../../components/reflection-card.tsx';
import { ShareCard } from '../../components/share-card.tsx';
import { track } from '../../lib/analytics.ts';
import { t } from '../../lib/i18n.ts';
import { kirimTeks, teksBagikan, type HasilKirim } from '../../lib/share.ts';
import { bacaRefleksi, simpanRefleksi, type Penyimpanan } from '../../lib/storage.ts';

type Props = {
  episode: Episode;
  path: string[];
  /** Episode berikutnya yang sudah terbit; undefined bila belum ada. */
  berikutnya: ManifestEpisode | undefined;
  penyimpanan: Penyimpanan | null;
  siteUrl: string;
  waChannel: string | null;
  onNext: (id: string) => void;
  onRestartP2: () => void;
  onRestart: () => void;
  onHome: () => void;
};

/** Catatan poll Episode 1 (SRS LIB-2): jawaban poll dibandingkan dengan pilihan pertama. */
export function catatanPoll(
  poll: string | null,
  pilihanPertama: string | undefined,
): string | undefined {
  if (poll === null || pilihanPertama === undefined) {
    return undefined;
  }
  return poll === pilihanPertama
    ? t('akhir.poll.sama', { poll })
    : t('akhir.poll.beda', { poll, pilihan: pilihanPertama });
}

function pesanKirim(hasil: HasilKirim): string {
  if (hasil === 'tersalin') {
    return t('bagikan.tersalin');
  }
  return hasil === 'gagal' ? t('bagikan.gagal') : '';
}

export function Ending(props: Props) {
  const { episode, path, penyimpanan } = props;
  const [refleksi, setRefleksi] = useState(() => bacaRefleksi(penyimpanan, episode.id));
  const [catatanRefleksi, setCatatanRefleksi] = useState('');
  const [catatanKirim, setCatatanKirim] = useState('');

  const kirim = (teks: string) => {
    void kirimTeks(teks).then((hasil) => {
      setCatatanKirim(pesanKirim(hasil));
    });
  };

  return (
    <>
      <PaperCard dalil={episode.dalil} />
      <ReflectionCard
        question={episode.meta.refleksi}
        value={refleksi}
        onChange={setRefleksi}
        onSave={() => {
          const tersimpan = simpanRefleksi(penyimpanan, episode.id, refleksi);
          setCatatanRefleksi(t(tersimpan ? 'refleksi.tersimpan' : 'refleksi.gagal'));
        }}
        note={catatanRefleksi}
      />
      <ShareCard
        onShare={() => {
          track('bagikan', { ep: episode.id });
          kirim(teksBagikan(episode.meta.bagikan, props.siteUrl, episode.id));
        }}
        onFeedback={() => {
          track('masukan', { ep: episode.id });
          kirim(
            t('masukan.templat', {
              nomor: episode.nomor,
              judul: episode.judul,
              jalur: path.join(' → '),
            }),
          );
        }}
        note={catatanKirim}
      />
      {props.waChannel === null ? null : (
        <ChannelCard
          url={props.waChannel}
          text={t(props.berikutnya === undefined ? 'saluran.akhir.menyusul' : 'saluran.akhir')}
          primary={true}
          onFollow={() => {
            track('saluran', { dari: episode.id });
          }}
        />
      )}
      <NextCard
        next={props.berikutnya?.nomor ?? null}
        menyusul={episode.nomor + 1}
        onNext={() => {
          if (props.berikutnya !== undefined) {
            props.onNext(props.berikutnya.id);
          }
        }}
        onRestartP2={props.onRestartP2}
        onRestart={props.onRestart}
        onHome={props.onHome}
      />
    </>
  );
}
