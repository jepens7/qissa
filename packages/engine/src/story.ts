// Mesin cerita (docs/ARCHITECTURE.md §5): state machine murni tanpa DOM, timer, dan I/O.
// UI memanggil next() per ketukan, menunggu sendiri durasi typing, dan merender langkah yang keluar.
import {
  FORMAT_EPISODE,
  type BankLine,
  type ChoiceLine,
  type Cond,
  type Episode,
  type Line,
  type NotifLine,
  type ShotLine,
  type ViewLine,
} from '@qissa/script/types';

/** Header chat aktif, dari baris `view` terakhir. */
export type Header = { name: string; initial: string; sub: string };

/** Baris yang dirender UI; kondisinya sudah dievaluasi, jadi tanpa `cond`. */
export type VisibleLine =
  | ViewLine
  | { t: 'nar'; text: string }
  | { t: 'in'; text: string; from?: string; attach?: string }
  | { t: 'out'; text: string; attach?: string }
  | ShotLine
  | { t: 'sys'; text: string }
  | NotifLine
  | BankLine;

export type Step =
  | { kind: 'render'; line: VisibleLine; header: Header | null }
  /** UI menunggu `ms`, lalu memanggil next() lagi. */
  | { kind: 'typing'; ms: number }
  | { kind: 'choice'; line: ChoiceLine }
  | { kind: 'end'; path: string[] }
  /** next() saat menunggu pilihan atau sesudah tamat, atau choose() di luar pilihan; tidak ada perubahan. */
  | { kind: 'wait' };

export type StoryState = {
  knot: string;
  idx: number;
  vars: Record<string, boolean>;
  /** Nama pendek opsi yang dipilih, berurutan (SRS ENG-6). */
  path: string[];
  header: Header | null;
  waiting: boolean;
  ended: boolean;
  /** Jumlah langkah `render` dan `choice` yang sudah keluar; saat restore, UI memotong itemnya ke angka ini. */
  rendered: number;
};

export type Story = {
  /** Salinan state; mengubahnya tidak memengaruhi cerita. */
  readonly state: Readonly<StoryState>;
  /** Majukan sampai satu langkah terlihat, typing, pilihan, atau tamat. */
  next(): Step;
  /** Pilih opsi ke-`index` dari pilihan yang sedang menunggu, lalu majukan satu langkah. */
  choose(index: number): Step;
  /** Dipanggil UI saat menerima langkah `choice`; menyimpan state tepat sebelum baris pilihan itu. */
  snapshot(key: string): void;
  /** Kembali ke snapshot; false bila kuncinya belum pernah disimpan. */
  restore(key: string): boolean;
};

/** Durasi indikator mengetik dalam milidetik (SRS ENG-4). */
export const DURASI_MENGETIK = 950;
export const DURASI_MENGETIK_REDUKSI = 350;

/** Kesalahan konten yang lolos compiler, atau episode dengan format yang belum didukung (ADR-015). */
export class StoryContentError extends Error {
  /** Knot yang tidak ada atau tidak tertutup, bila itu penyebabnya. */
  readonly knot: string | null;
  /** Format JSON episode yang tidak didukung, bila itu penyebabnya; UI meminta pembaca memperbarui aplikasi. */
  readonly format: number | null;

  constructor(message: string, sebab: { knot?: string; format?: number }) {
    super(message);
    this.name = 'StoryContentError';
    this.knot = sebab.knot ?? null;
    this.format = sebab.format ?? null;
  }
}

function salin(s: StoryState): StoryState {
  return {
    ...s,
    vars: { ...s.vars },
    path: [...s.path],
    header: s.header === null ? null : { ...s.header },
  };
}

export function createStory(episode: Episode, opsi: { reducedMotion?: boolean } = {}): Story {
  if (episode.format !== FORMAT_EPISODE) {
    throw new StoryContentError(
      `Episode ${episode.id} memakai format ${String(episode.format)}, yang belum didukung aplikasi ini.`,
      { format: episode.format },
    );
  }
  const msMengetik = opsi.reducedMotion === true ? DURASI_MENGETIK_REDUKSI : DURASI_MENGETIK;

  // Object.hasOwn baru ada di Chrome 93; engine menargetkan ES2021 (Android Chrome 90).
  const barisKnot = (nama: string): Line[] => {
    const baris = Object.prototype.hasOwnProperty.call(episode.knots, nama)
      ? episode.knots[nama]
      : undefined;
    if (baris === undefined) {
      throw new StoryContentError(`Knot “${nama}” tidak ada di episode ${episode.id}.`, {
        knot: nama,
      });
    }
    return baris;
  };

  let s: StoryState = {
    knot: episode.start,
    idx: 0,
    vars: {},
    path: [],
    header: null,
    waiting: false,
    ended: false,
    rendered: 0,
  };
  barisKnot(s.knot);
  const snapshots = new Map<string, StoryState>();

  const benar = (cond: Cond | undefined): boolean => {
    if (cond === undefined) {
      return true;
    }
    return cond.startsWith('!') ? s.vars[cond.slice(1)] !== true : s.vars[cond] === true;
  };

  const pindah = (tujuan: string) => {
    barisKnot(tujuan);
    s.knot = tujuan;
    s.idx = 0;
  };

  const render = (line: VisibleLine): Step => {
    s.rendered += 1;
    return { kind: 'render', line, header: s.header === null ? null : { ...s.header } };
  };

  function next(): Step {
    if (s.waiting || s.ended) {
      return { kind: 'wait' };
    }
    for (;;) {
      const line = barisKnot(s.knot)[s.idx];
      if (line === undefined) {
        throw new StoryContentError(`Knot “${s.knot}” berakhir tanpa penutup.`, { knot: s.knot });
      }
      s.idx += 1;
      switch (line.t) {
        case 'set':
          s.vars[line.v] = true;
          break;
        case 'go':
          pindah(line.to);
          break;
        case 'branch': {
          const kasus = line.cases.find((c) => benar(c.cond));
          if (kasus === undefined) {
            throw new StoryContentError(
              `Branch di knot “${s.knot}” tidak punya kasus yang cocok.`,
              {
                knot: s.knot,
              },
            );
          }
          pindah(kasus.to);
          break;
        }
        case 'nar': {
          if (line.cases !== undefined) {
            const kasus = line.cases.find((c) => benar(c.cond));
            if (kasus !== undefined) {
              return render({ t: 'nar', text: kasus.text });
            }
          } else if (benar(line.cond)) {
            return render({ t: 'nar', text: line.text });
          }
          break;
        }
        case 'in':
          if (benar(line.cond)) {
            return render({
              t: 'in',
              text: line.text,
              ...(line.from === undefined ? {} : { from: line.from }),
              ...(line.attach === undefined ? {} : { attach: line.attach }),
            });
          }
          break;
        case 'out':
          if (benar(line.cond)) {
            return render({
              t: 'out',
              text: line.text,
              ...(line.attach === undefined ? {} : { attach: line.attach }),
            });
          }
          break;
        case 'sys':
          if (benar(line.cond)) {
            return render({ t: 'sys', text: line.text });
          }
          break;
        case 'view':
          s.header = { name: line.name, initial: line.initial, sub: line.sub };
          return render(line);
        case 'shot':
        case 'notif':
        case 'bank':
          return render(line);
        case 'typing':
          return { kind: 'typing', ms: msMengetik };
        case 'choice':
          s.waiting = true;
          s.rendered += 1;
          return { kind: 'choice', line };
        case 'end':
          s.ended = true;
          return { kind: 'end', path: [...s.path] };
      }
    }
  }

  function choose(index: number): Step {
    if (!s.waiting) {
      return { kind: 'wait' };
    }
    const line = barisKnot(s.knot)[s.idx - 1];
    if (line?.t !== 'choice') {
      throw new StoryContentError(`Tidak ada pilihan yang menunggu di knot “${s.knot}”.`, {
        knot: s.knot,
      });
    }
    const pilihan = line.options[index];
    if (pilihan === undefined) {
      throw new RangeError(`Opsi ${String(index)} tidak ada di pilihan ${line.key}.`);
    }
    s.path.push(pilihan.name);
    s.waiting = false;
    pindah(pilihan.go);
    return next();
  }

  function snapshot(key: string) {
    const simpanan = salin(s);
    if (s.waiting) {
      // Mundur ke baris pilihan: setelah restore, next() memunculkan blok pilihan yang sama.
      simpanan.idx -= 1;
      simpanan.waiting = false;
      simpanan.rendered -= 1;
    }
    snapshots.set(key, simpanan);
  }

  function restore(key: string): boolean {
    const simpanan = snapshots.get(key);
    if (simpanan === undefined) {
      return false;
    }
    s = salin(simpanan);
    return true;
  }

  return {
    get state() {
      return salin(s);
    },
    next,
    choose,
    snapshot,
    restore,
  };
}
