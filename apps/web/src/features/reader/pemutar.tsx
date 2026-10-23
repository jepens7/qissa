// Pemutar cerita (BACKLOG D3). Story dipegang di state dan daftar item di state; komponen ini hanya
// mengurus waktu (typing, jeda sesudah memilih), ketukan, keyboard, dan gulir. Logika langkahnya ada di
// langkah.ts dan diuji untuk semua jalur.
import { createStory, type Header as HeaderChat, type VisibleLine } from '@qissa/engine';
import type { Episode, ManifestEpisode } from '@qissa/script/types';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { BankCard } from '../../components/bank-card.tsx';
import { Bubble } from '../../components/bubble.tsx';
import { ChoiceBlock } from '../../components/choice-block.tsx';
import { Cover } from '../../components/cover.tsx';
import { EndCard } from '../../components/end-card.tsx';
import { Header } from '../../components/header.tsx';
import { NarrationCard } from '../../components/narration-card.tsx';
import { NotifCard } from '../../components/notif-card.tsx';
import { Pill } from '../../components/pill.tsx';
import { ShotCard } from '../../components/shot-card.tsx';
import { TapHint } from '../../components/tap-hint.tsx';
import { TypingDots } from '../../components/typing-dots.tsx';
import { catatanPoll, Ending } from '../ending/ending.tsx';
import { track } from '../../lib/analytics.ts';
import { t } from '../../lib/i18n.ts';
import {
  bacaJalur,
  bacaPoll,
  simpanJalur,
  tambahAkhir,
  type Penyimpanan,
} from '../../lib/storage.ts';
import {
  jumlahPilihan,
  ketuk,
  pilih,
  tandai,
  ulangDari,
  type Hasil,
  type Item,
} from './langkah.ts';

type Mode = 'sampul' | 'baca' | 'mengetik' | 'jeda' | 'memilih' | 'tamat';

type Props = {
  episode: Episode;
  /** Episode sebelumnya yang sudah terbit, untuk memo sampul (SRS LIB-3). */
  sebelumnya: ManifestEpisode | undefined;
  /** Episode berikutnya yang sudah terbit, untuk tombol lanjut. */
  berikutnya: ManifestEpisode | undefined;
  penyimpanan: Penyimpanan | null;
  reducedMotion: boolean;
  siteUrl: string;
  waChannel: string | null;
  onHome: () => void;
  onNext: (id: string) => void;
  onRestart: () => void;
};

/** Jeda sesudah memilih sebelum baris berikutnya muncul, seperti prototipe. */
const JEDA_PILIHAN_MS = 250;

function Baris({ line, shots }: { line: VisibleLine; shots: Episode['shots'] }) {
  switch (line.t) {
    case 'view':
      return <Pill text={line.pill} />;
    case 'nar':
      return <NarrationCard text={line.text} />;
    case 'in':
      return (
        <Bubble
          side="in"
          text={line.text}
          {...(line.from === undefined ? {} : { from: line.from })}
          {...(line.attach === undefined ? {} : { attach: line.attach })}
        />
      );
    case 'out':
      return (
        <Bubble
          side="out"
          text={line.text}
          {...(line.attach === undefined ? {} : { attach: line.attach })}
        />
      );
    case 'shot':
      return <ShotCard shot={line.state === 'closed' ? null : (shots[line.state] ?? null)} />;
    case 'sys':
      return <Pill text={line.text} />;
    case 'notif':
      return <NotifCard app={line.app} text={line.text} time={line.time} />;
    case 'bank':
      return <BankCard amount={line.amount} from={line.from} />;
  }
}

/** Memo sampul: jalur episode sebelumnya bila tersimpan, selain itu catatan bahwa episode bisa berdiri sendiri. */
function memoSampul(
  episode: Episode,
  sebelumnya: ManifestEpisode | undefined,
  penyimpanan: Penyimpanan | null,
) {
  if (episode.nomor <= 1) {
    return undefined;
  }
  const [pertama, kedua] = sebelumnya === undefined ? [] : bacaJalur(penyimpanan, sebelumnya.id);
  return pertama !== undefined && kedua !== undefined
    ? { text: t('sampul.memo', { pertama, kedua }), ingat: true }
    : { text: t('sampul.mandiri', { nomor: episode.nomor - 1 }), ingat: false };
}

export function Pemutar(props: Props) {
  const { episode, sebelumnya, penyimpanan, reducedMotion, onHome } = props;
  const [story] = useState(() => createStory(episode, { reducedMotion }));
  const [memo] = useState(() => memoSampul(episode, sebelumnya, penyimpanan));
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>('sampul');
  const [header, setHeader] = useState<HeaderChat | null>(null);
  const [akhir, setAkhir] = useState<{
    path: string[];
    jumlah: number;
    pollNote: string | undefined;
  } | null>(null);
  const [galat, setGalat] = useState<Error | null>(null);
  const waktu = useRef<number | undefined>(undefined);
  const mulaiTerkirim = useRef(false);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mulaiTerkirim.current) {
      mulaiTerkirim.current = true;
      track('mulai', { ep: episode.id });
    }
    return () => {
      window.clearTimeout(waktu.current);
    };
  }, [episode.id]);

  const terapkan = useCallback(
    (h: Hasil) => {
      setItems(h.items);
      setHeader(story.state.header);
      switch (h.henti.kind) {
        case 'typing': {
          setMode('mengetik');
          const sebelum = h.items;
          waktu.current = window.setTimeout(() => {
            try {
              terapkan(ketuk(story, sebelum));
            } catch (e) {
              setGalat(e instanceof Error ? e : new Error(String(e)));
            }
          }, h.henti.ms);
          break;
        }
        case 'choice':
          setMode('memilih');
          break;
        case 'end': {
          const { path } = h.henti;
          const jumlah = tambahAkhir(penyimpanan, episode.id, path[path.length - 1] ?? '').length;
          simpanJalur(penyimpanan, episode.id, path);
          track('selesai', { ep: episode.id, jalur: path.join('>') });
          // Catatan poll hanya untuk Episode 1 (SRS LIB-2).
          const pollNote =
            episode.nomor === 1 ? catatanPoll(bacaPoll(penyimpanan), path[0]) : undefined;
          setAkhir({ path, jumlah, pollNote });
          setMode('tamat');
          break;
        }
        default:
          setMode('baca');
      }
    },
    [story, penyimpanan, episode.id, episode.nomor],
  );

  /** Satu ketukan; false bila saat ini tidak bisa maju (typing, jeda, pilihan, atau tamat). */
  const maju = useCallback((): boolean => {
    if (mode !== 'sampul' && mode !== 'baca') {
      return false;
    }
    try {
      terapkan(ketuk(story, items));
    } catch (e) {
      setGalat(e instanceof Error ? e : new Error(String(e)));
    }
    return true;
  }, [mode, story, items, terapkan]);

  const majuTerbaru = useRef(maju);
  useEffect(() => {
    majuTerbaru.current = maju;
  }, [maju]);

  // Space, Enter, dan panah kanan memajukan cerita, kecuali saat fokus di kontrol (SRS UI-1).
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      const tag = e.target instanceof HTMLElement ? e.target.tagName : '';
      if (['TEXTAREA', 'INPUT', 'BUTTON', 'A'].includes(tag)) {
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') && majuTerbaru.current()) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', tekan);
    return () => {
      document.removeEventListener('keydown', tekan);
    };
  }, []);

  // Gulir ke baris terbaru; tanpa animasi bila prefers-reduced-motion (SRS UI-6). Saat tamat, baris terbaru
  // adalah kartu tamat (anak terakhir log), bukan dasar halaman: ia ditengahkan supaya kartu dalil di bawahnya
  // tidak terlewati (SRS UI-5).
  useEffect(() => {
    if (mode === 'sampul') {
      return;
    }
    const behavior = reducedMotion ? 'auto' : 'smooth';
    if (mode === 'tamat') {
      log.current?.lastElementChild?.scrollIntoView({ block: 'center', behavior });
      return;
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior });
  }, [items, mode, reducedMotion]);

  if (galat !== null) {
    throw galat;
  }

  const onPilih = (i: number) => {
    const terakhir = items[items.length - 1];
    const opsi = terakhir?.jenis === 'pilihan' ? terakhir.line.options[i] : undefined;
    if (mode !== 'memilih' || terakhir?.jenis !== 'pilihan' || opsi === undefined) {
      return;
    }
    const ditandai = tandai(items, i);
    setItems(ditandai);
    setMode('jeda');
    track('pilihan', { ep: episode.id, titik: terakhir.line.key, pilih: opsi.name });
    waktu.current = window.setTimeout(
      () => {
        try {
          terapkan(pilih(story, ditandai, i));
        } catch (e) {
          setGalat(e instanceof Error ? e : new Error(String(e)));
        }
      },
      reducedMotion ? 0 : JEDA_PILIHAN_MS,
    );
  };

  /** Ulang dari Pilihan 2: log dipotong ke snapshot, lalu blok pilihan yang sama muncul lagi. */
  const ulangP2 = () => {
    const potong = ulangDari(story, items, 'p2');
    if (potong === null) {
      props.onRestart();
      return;
    }
    setAkhir(null);
    try {
      terapkan(ketuk(story, potong));
    } catch (e) {
      setGalat(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const klikLog = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest('button, a, textarea, input') !== null) {
      return;
    }
    maju();
  };

  return (
    <>
      <Header
        name={header?.name ?? t('app.nama')}
        initial={header?.initial ?? t('app.nama').charAt(0)}
        status={
          mode === 'mengetik'
            ? t('header.mengetik')
            : (header?.sub ??
              t('header.episode.status', { nomor: episode.nomor, judul: episode.judul }))
        }
        right={
          <button className="ep" type="button" onClick={onHome}>
            {t('header.daftar')}
          </button>
        }
      />
      <main>
        <div ref={log} aria-live="polite" onClick={klikLog}>
          <Cover
            kicker={t('sampul.kicker', { nomor: episode.nomor })}
            title={episode.judul}
            body={episode.meta.sampul}
            {...(memo === undefined ? {} : { memo })}
            length={t('sampul.panjang', {
              menit: episode.meta.durasi_menit,
              pilihan: jumlahPilihan(episode.knots),
            })}
          />
          {items.map((item, i) =>
            item.jenis === 'baris' ? (
              <Baris key={i} line={item.line} shots={episode.shots} />
            ) : (
              <ChoiceBlock
                key={i}
                label={item.line.label}
                options={item.line.options}
                picked={item.dipilih}
                disabled={item.dipilih !== null || mode !== 'memilih'}
                onPick={onPilih}
              />
            ),
          )}
          {mode === 'mengetik' ? <TypingDots /> : null}
          {akhir === null ? null : (
            <EndCard
              nomor={episode.nomor}
              path={akhir.path}
              endings={akhir.jumlah}
              {...(akhir.pollNote === undefined ? {} : { pollNote: akhir.pollNote })}
            />
          )}
        </div>
        {/* Di luar region live: pembaca layar mengumumkan kartu tamat saja, bukan seluruh kartu dalil
            (DESIGN-SYSTEM §6). */}
        {akhir === null ? null : (
          <Ending
            episode={episode}
            path={akhir.path}
            berikutnya={props.berikutnya}
            penyimpanan={penyimpanan}
            siteUrl={props.siteUrl}
            waChannel={props.waChannel}
            onNext={props.onNext}
            onRestartP2={ulangP2}
            onRestart={props.onRestart}
            onHome={onHome}
          />
        )}
        <TapHint
          text={mode === 'sampul' ? t('reader.hint.mulai') : t('reader.hint.lanjut')}
          hidden={mode !== 'sampul' && mode !== 'baca' && mode !== 'jeda'}
          onTap={maju}
        />
      </main>
    </>
  );
}
