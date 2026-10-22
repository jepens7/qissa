// Halaman #debug (BACKLOG D2): setiap komponen dengan data contoh. Contohnya diambil dari manifest dan
// episode hasil compile, jadi tidak ada teks cerita di kode; label bagian adalah nama komponen.
import type { ChoiceLine, Episode, Line, Manifest } from '@qissa/script/types';
import { useEffect, useState, type ReactNode } from 'react';
import { BankCard } from '../../components/bank-card.tsx';
import { Bubble } from '../../components/bubble.tsx';
import { ChannelCard } from '../../components/channel-card.tsx';
import { ChoiceBlock } from '../../components/choice-block.tsx';
import { Cover } from '../../components/cover.tsx';
import { EndCard } from '../../components/end-card.tsx';
import { EpisodeCard } from '../../components/episode-card.tsx';
import { Header } from '../../components/header.tsx';
import { NarrationCard } from '../../components/narration-card.tsx';
import { NextCard } from '../../components/next-card.tsx';
import { NotifCard } from '../../components/notif-card.tsx';
import { PaperCard } from '../../components/paper-card.tsx';
import { Pill } from '../../components/pill.tsx';
import { PollCard } from '../../components/poll-card.tsx';
import { ReflectionCard } from '../../components/reflection-card.tsx';
import { ShareCard } from '../../components/share-card.tsx';
import { ShotCard } from '../../components/shot-card.tsx';
import { TapHint } from '../../components/tap-hint.tsx';
import { TypingDots } from '../../components/typing-dots.tsx';
import { getConfig } from '../../lib/config.ts';
import { akhiranKunci, t } from '../../lib/i18n.ts';

type Data = { manifest: Manifest; episodes: Episode[] };

const tanpaAksi = () => undefined;

function Bagian({ nama, children }: { nama: string; children: ReactNode }) {
  return (
    <section>
      <p className="note">{nama}</p>
      {children}
    </section>
  );
}

/** Baris pertama yang cocok di semua episode, untuk contoh. */
function cari<T extends Line>(episodes: Episode[], cocok: (l: Line) => l is T): T | undefined {
  for (const ep of episodes) {
    for (const baris of Object.values(ep.knots)) {
      const l = baris.find(cocok);
      if (l !== undefined) {
        return l;
      }
    }
  }
  return undefined;
}

function Isi({ data }: { data: Data }) {
  const { manifest, episodes } = data;
  const [ep] = episodes;
  if (ep === undefined) {
    return null;
  }
  const pilihan = episodes.flatMap((e) =>
    Object.values(e.knots).flatMap((b) => b.filter((l): l is ChoiceLine => l.t === 'choice')),
  );
  const jalurContoh = pilihan
    .slice(0, 2)
    .map((p) => p.options[0]?.name ?? '')
    .filter((n) => n !== '');
  const view = cari(episodes, (l): l is Extract<Line, { t: 'view' }> => l.t === 'view');
  const viewGrup = cari(
    episodes,
    (l): l is Extract<Line, { t: 'view' }> => l.t === 'view' && l.group,
  );
  const nar = cari(episodes, (l): l is Extract<Line, { t: 'nar' }> => l.t === 'nar');
  const masuk = cari(episodes, (l): l is Extract<Line, { t: 'in' }> => l.t === 'in');
  const masukGrup = cari(
    episodes,
    (l): l is Extract<Line, { t: 'in' }> => l.t === 'in' && l.from !== undefined,
  );
  const keluar = cari(episodes, (l): l is Extract<Line, { t: 'out' }> => l.t === 'out');
  const keluarLampiran = cari(
    episodes,
    (l): l is Extract<Line, { t: 'out' }> => l.t === 'out' && l.attach !== undefined,
  );
  const sys = cari(episodes, (l): l is Extract<Line, { t: 'sys' }> => l.t === 'sys');
  const notif = cari(episodes, (l): l is Extract<Line, { t: 'notif' }> => l.t === 'notif');
  const bank = cari(episodes, (l): l is Extract<Line, { t: 'bank' }> => l.t === 'bank');
  const narTeks =
    nar === undefined ? '' : nar.cases === undefined ? nar.text : (nar.cases[0]?.text ?? '');

  return (
    <>
      {view === undefined ? null : (
        <Bagian nama="Header">
          <Header
            name={view.name}
            initial={view.initial}
            status={view.sub}
            right={
              <button className="ep" type="button">
                {t('header.daftar')}
              </button>
            }
          />
        </Bagian>
      )}
      <Bagian nama="Cover">
        <Cover
          kicker={t('sampul.kicker', { nomor: ep.nomor })}
          title={ep.judul}
          body={ep.meta.sampul}
          memo={{
            text: t('sampul.memo', { pertama: jalurContoh[0] ?? '', kedua: jalurContoh[1] ?? '' }),
            ingat: true,
          }}
          length={t('sampul.panjang', { menit: ep.meta.durasi_menit, pilihan: 2 })}
        />
        <Cover
          kicker={t('sampul.kicker', { nomor: ep.nomor })}
          title={ep.judul}
          body={ep.meta.sampul}
          memo={{ text: t('sampul.mandiri', { nomor: ep.nomor }), ingat: false }}
          length={t('sampul.panjang', { menit: ep.meta.durasi_menit, pilihan: 2 })}
        />
      </Bagian>
      <Bagian nama="PollCard">
        <PollCard
          kicker={t('home.poll.kicker')}
          question={t('home.poll.pertanyaan')}
          ask={t('home.poll.ajakan')}
          options={akhiranKunci('home.poll.opsi.').map((name) => ({
            name,
            text: t(`home.poll.opsi.${name}` as Parameters<typeof t>[0]),
          }))}
          onPick={tanpaAksi}
        />
      </Bagian>
      <Bagian nama="EpisodeCard">
        {manifest.episodes.map((e, i) => (
          <EpisodeCard
            key={e.id}
            num={t('home.episode.nomor', { nomor: e.nomor })}
            title={e.judul}
            teaser={e.teaser}
            status={i === 0 ? t('home.episode.selesai', { jumlah: 2 }) : t('home.episode.baru')}
            onOpen={tanpaAksi}
          />
        ))}
      </Bagian>
      <Bagian nama="Pill">
        {view === undefined ? null : <Pill text={view.pill} />}
        {sys === undefined ? null : <Pill text={sys.text} />}
      </Bagian>
      <Bagian nama="NarrationCard">
        <NarrationCard text={narTeks} />
      </Bagian>
      <Bagian nama="Bubble">
        {masuk === undefined ? null : <Bubble side="in" text={masuk.text} />}
        {masukGrup === undefined || viewGrup === undefined ? null : (
          <Bubble
            side="in"
            text={masukGrup.text}
            {...(masukGrup.from === undefined ? {} : { from: masukGrup.from })}
          />
        )}
        {keluar === undefined ? null : <Bubble side="out" text={keluar.text} />}
        {keluarLampiran === undefined ? null : (
          <Bubble
            side="out"
            text={keluarLampiran.text}
            {...(keluarLampiran.attach === undefined ? {} : { attach: keluarLampiran.attach })}
          />
        )}
      </Bagian>
      <Bagian nama="TypingDots">
        <TypingDots />
      </Bagian>
      <Bagian nama="ShotCard">
        <ShotCard shot={null} />
        {episodes.flatMap((e) =>
          Object.entries(e.shots).map(([nama, shot]) => (
            <ShotCard key={`${e.id}-${nama}`} shot={shot} />
          )),
        )}
      </Bagian>
      {notif === undefined ? null : (
        <Bagian nama="NotifCard">
          <NotifCard app={notif.app} text={notif.text} time={notif.time} />
        </Bagian>
      )}
      {bank === undefined ? null : (
        <Bagian nama="BankCard">
          <BankCard amount={bank.amount} from={bank.from} />
        </Bagian>
      )}
      {pilihan[0] === undefined ? null : (
        <Bagian nama="ChoiceBlock">
          <ChoiceBlock
            label={pilihan[0].label}
            options={pilihan[0].options}
            picked={null}
            disabled={false}
            onPick={tanpaAksi}
          />
          <ChoiceBlock
            label={pilihan[0].label}
            options={pilihan[0].options}
            picked={1}
            disabled={true}
            onPick={tanpaAksi}
          />
        </Bagian>
      )}
      <Bagian nama="TapHint">
        <TapHint text={t('reader.hint.lanjut')} hidden={false} onTap={tanpaAksi} />
      </Bagian>
      <Bagian nama="EndCard">
        <EndCard
          nomor={ep.nomor}
          path={jalurContoh}
          endings={1}
          pollNote={t('akhir.poll.beda', {
            poll: pilihan[0]?.options[1]?.name ?? '',
            pilihan: jalurContoh[0] ?? '',
          })}
        />
      </Bagian>
      <Bagian nama="PaperCard">
        {episodes.map((e) => (
          <PaperCard key={e.id} dalil={e.dalil} />
        ))}
      </Bagian>
      <Bagian nama="ReflectionCard">
        <ReflectionCard
          question={ep.meta.refleksi}
          value=""
          onChange={tanpaAksi}
          onSave={tanpaAksi}
          note={t('refleksi.tersimpan')}
        />
      </Bagian>
      <Bagian nama="ShareCard">
        <ShareCard onShare={tanpaAksi} onFeedback={tanpaAksi} note={t('bagikan.tersalin')} />
      </Bagian>
      <Bagian nama="ChannelCard">
        <ChannelCard
          url={getConfig().waChannel ?? '#debug'}
          text={t('saluran.home')}
          primary={false}
          onFollow={tanpaAksi}
        />
      </Bagian>
      <Bagian nama="NextCard">
        <NextCard
          next={2}
          menyusul={2}
          onNext={tanpaAksi}
          onRestartP2={tanpaAksi}
          onRestart={tanpaAksi}
          onHome={tanpaAksi}
        />
        <NextCard
          next={null}
          menyusul={3}
          onNext={tanpaAksi}
          onRestartP2={tanpaAksi}
          onRestart={tanpaAksi}
          onHome={tanpaAksi}
        />
      </Bagian>
    </>
  );
}

export function DebugPage() {
  const [data, setData] = useState<Data | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    const muat = async () => {
      const respons = await fetch(`${getConfig().contentBase}/manifest.json`);
      const manifest = (await respons.json()) as Manifest;
      const episodes = await Promise.all(
        manifest.episodes.map(async (e) => (await (await fetch(e.url)).json()) as Episode),
      );
      setData({ manifest, episodes });
    };
    muat().catch((e: unknown) => {
      setGalat(e instanceof Error ? e.message : String(e));
    });
  }, []);

  return (
    <main>
      {galat === null ? null : <p className="note">{galat}</p>}
      {data === null ? null : <Isi data={data} />}
    </main>
  );
}
