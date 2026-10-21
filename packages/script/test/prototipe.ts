// Akses ke implementasi rujukan infra/prototype/index.html untuk tes paritas (BACKLOG B3).
// Objek EPISODES dan fungsi shot() dievaluasi langsung dari berkas prototipe, dan jalankanPrototipe
// meniru fungsi step() prototipe baris demi baris, termasuk kebiasaannya (cond di `out` dan `sys`
// diabaikan, `attach` di gelembung masuk tidak dirender).
import { runInNewContext } from 'node:vm';
import { bacaRepo } from './bantuan.ts';

export type BarisPrototipe = { t: string } & Record<string, unknown>;

export type EpisodePrototipe = {
  id: string;
  num: number;
  title: string;
  teaser: string;
  cover: string;
  length: string;
  question: string;
  share: string;
  next: string | null;
  start: string;
  knots: Record<string, BarisPrototipe[]>;
};

const HTML = bacaRepo('infra/prototype/index.html');

function potong(dari: string, sampai: string): string {
  const awal = HTML.indexOf(dari);
  const akhir = HTML.indexOf(sampai, awal);
  if (awal < 0 || akhir < 0) {
    throw new Error(`Bagian “${dari}” tidak ditemukan di prototipe`);
  }
  return HTML.slice(awal, akhir);
}

/** Objek EPISODES di prototipe, dievaluasi apa adanya. */
export function episodesPrototipe(): Record<string, EpisodePrototipe> {
  const literal = potong('var EPISODES = {', 'var ORDER')
    .slice('var EPISODES = '.length)
    .trim()
    .replace(/;$/, '');
  const hasil: unknown = runInNewContext(`(${literal})`);
  return hasil as Record<string, EpisodePrototipe>;
}

/** Isi tangkapan layar seperti yang dilihat pembaca. */
export type ShotTampil =
  | { tertutup: true }
  | {
      cap: string;
      cut?: string;
      mini?: { sisi: 'kiri' | 'kanan'; teks: string }[];
      komentar?: { handle: string; teks: string };
    };

type Simpul = { innerHTML: string; appendChild: (anak: Simpul) => void };

/** Menjalankan fungsi shot(state) prototipe dengan DOM tiruan, lalu membaca HTML hasilnya. */
export function shotPrototipe(state: string): ShotTampil {
  let html = '';
  const simpul = (isi?: string): Simpul => ({
    innerHTML: isi ?? '',
    appendChild(anak) {
      this.innerHTML += anak.innerHTML;
    },
  });
  runInNewContext(`${potong('function shot(state) {', 'function typing(then) {')}; shot(state);`, {
    state,
    ICON: '',
    el: (_tag: string, _kelas: string, isi?: string) => simpul(isi),
    append: (node: Simpul) => {
      html = node.innerHTML;
    },
  });
  if (html.includes('class="closed"')) {
    return { tertutup: true };
  }
  const cap = /<div class="cap">(.*?)<\/div>/.exec(html)?.[1] ?? '';
  const cut = /<div class="cut">(.*?)<\/div>/.exec(html)?.[1];
  const komentar = /<div class="cmt"><b>(.*?)<\/b>(.*?)<\/div>/.exec(html);
  const mini = [...html.matchAll(/<span class="(b|n)">(.*?)<\/span>/g)].map((m) => ({
    sisi: m[1] === 'n' ? ('kanan' as const) : ('kiri' as const),
    teks: m[2] ?? '',
  }));
  return {
    cap,
    ...(cut === undefined ? {} : { cut }),
    ...(mini.length === 0 ? {} : { mini }),
    ...(komentar === null
      ? {}
      : { komentar: { handle: komentar[1] ?? '', teks: komentar[2] ?? '' } }),
  };
}

/** Hasil satu jalur di prototipe: baris yang dirender dan semua baris yang dijalankan. */
export type JalurPrototipe = {
  tampil: BarisPrototipe[];
  dijalankan: BarisPrototipe[];
  pilihan: string[];
};

function teks(baris: BarisPrototipe, key: string): string {
  const nilai = baris[key];
  return typeof nilai === 'string' ? nilai : '';
}

/** Meniru step() di prototipe untuk satu jalur; `indeksPilihan` adalah indeks opsi tiap titik pilihan. */
export function jalankanPrototipe(
  ep: EpisodePrototipe,
  indeksPilihan: readonly number[],
): JalurPrototipe {
  const vars: Record<string, boolean> = {};
  const truthy = (cond: unknown) => typeof cond === 'string' && vars[cond] === true;
  const pick = (cases: unknown) =>
    (cases as BarisPrototipe[]).find((c) => c['cond'] === undefined || truthy(c['cond']));

  const tampil: BarisPrototipe[] = [];
  const dijalankan: BarisPrototipe[] = [];
  const pilihan: string[] = [];
  let knot = ep.start;
  let idx = 0;
  let titik = 0;

  for (let langkah = 0; langkah < 10_000; langkah++) {
    const line = ep.knots[knot]?.[idx];
    if (line === undefined) {
      break;
    }
    idx += 1;
    dijalankan.push(line);
    switch (line.t) {
      case 'set':
        vars[teks(line, 'v')] = true;
        continue;
      case 'go':
        knot = teks(line, 'to');
        idx = 0;
        continue;
      case 'branch': {
        const c = pick(line['cases']);
        if (c !== undefined) {
          knot = teks(c, 'to');
          idx = 0;
        }
        continue;
      }
      case 'nar':
        if (line['cases'] !== undefined) {
          const n = pick(line['cases']);
          if (n !== undefined) {
            tampil.push({ t: 'nar', text: teks(n, 'text') });
          }
          continue;
        }
        if (line['cond'] !== undefined && !truthy(line['cond'])) {
          continue;
        }
        tampil.push(line);
        continue;
      case 'in':
        if (line['cond'] !== undefined && !truthy(line['cond'])) {
          continue;
        }
        tampil.push(line);
        continue;
      case 'choice': {
        tampil.push(line);
        const opsi = (line['options'] as BarisPrototipe[])[indeksPilihan[titik] ?? -1];
        titik += 1;
        if (opsi === undefined) {
          return { tampil, dijalankan, pilihan };
        }
        pilihan.push(teks(opsi, 'name'));
        knot = teks(opsi, 'go');
        idx = 0;
        continue;
      }
      case 'end':
        tampil.push(line);
        return { tampil, dijalankan, pilihan };
      default:
        tampil.push(line);
    }
  }
  return { tampil, dijalankan, pilihan };
}
