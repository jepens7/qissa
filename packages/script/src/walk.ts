// Penjelajah jalur: menjalankan JSON episode untuk semua kombinasi pilihan, beserta nilai variabelnya.
// Dipakai linter (L2, L4, W1, W3), tes paritas dengan prototipe, dan `qs walk`. Engine (Epik C) punya
// implementasi runtime sendiri; ini alat periksa saat compile.
import type { Cond, Episode, Line, NarCase } from './types.ts';

/** Baris yang terlihat pembaca (atau sementara, untuk typing), dengan kondisi yang sudah dievaluasi. */
export type ItemTerlihat =
  | { t: 'view'; name: string; initial: string; sub: string; pill: string; group: boolean }
  | { t: 'nar'; text: string }
  | { t: 'in'; text: string; from?: string; attach?: string }
  | { t: 'out'; text: string; attach?: string }
  | { t: 'typing' }
  | { t: 'shot'; state: string }
  | { t: 'sys'; text: string }
  | { t: 'notif'; app: string; text: string; time: string }
  | { t: 'bank'; amount: string; from: string }
  | { t: 'choice'; key: string; label: string; options: { text: string; name: string }[] }
  | { t: 'end' };

/**
 * Letak baris JSON yang dijalankan; `kasus` adalah indeks kasus `nar` yang terpilih, `opsi` indeks
 * opsi blok pilihan.
 */
export type Letak = { knot: string; idx: number; kasus?: number; opsi?: number };

export type Langkah = Letak & { item: ItemTerlihat };

export type AkhirJalur =
  /** Sampai di `-> END`. */
  | 'END'
  /** Berhenti karena knot tidak ada, baris knot habis tanpa penutup, atau blok pilihan tanpa opsi. */
  | 'buntu'
  /**
   * Masuk lagi ke knot yang sudah dimasuki jalur ini dengan nilai variabel yang sama. Variabel hanya
   * bisa di-@set, tidak pernah dihapus, jadi pilihan yang sama bisa diulang tanpa akhir.
   */
  | 'putar'
  /** Melebihi 300 baris terlihat sebelum sampai `-> END`. */
  | 'panjang'
  /** Penjelajahan dihentikan karena jumlah jalur mencapai BATAS_JALUR. */
  | 'batas';

export type Jalur = {
  /** Opsi yang dipilih, berurutan. */
  pilihan: { key: string; name: string }[];
  /** Baris terlihat, berurutan. */
  langkah: Langkah[];
  /** Semua baris JSON yang dijalankan, termasuk yang tak terlihat dan yang kondisinya salah. */
  dijalankan: Letak[];
  /** Knot yang dimasuki, berurutan dari knot awal, termasuk knot tanpa baris. */
  masuk: string[];
  akhir: AkhirJalur;
  /**
   * Letak berhenti bila akhirnya bukan END. Untuk `putar`, baris `->` atau `=>` atau opsi yang
   * kembali; untuk knot yang barisnya habis, indeks sesudah baris terakhirnya.
   */
  berhenti?: Letak;
  /** Knot yang dimasuki lagi (hanya untuk `putar`). */
  putarKe?: string;
};

/** Batas panjang jalur dalam baris terlihat (SRS §9). */
export const BATAS_BARIS_TERLIHAT = 300;

/**
 * Batas jumlah jalur yang dijelajahi. Episode punya dua titik pilihan dengan tiga opsi
 * (CONTENT-RULES), jadi sembilan jalur; batas ini hanya menjaga memori dari naskah yang keliru.
 */
export const BATAS_JALUR = 1000;

/** Baris terlihat menurut W3: typing dan penutup END tidak dihitung; blok pilihan dihitung satu. */
export function terhitung(item: ItemTerlihat): boolean {
  return item.t !== 'typing' && item.t !== 'end';
}

export function panjang(jalur: Jalur): number {
  return jalur.langkah.filter((l) => terhitung(l.item)).length;
}

function benar(cond: Cond | undefined, vars: ReadonlySet<string>): boolean {
  if (cond === undefined) {
    return true;
  }
  return cond.startsWith('!') ? !vars.has(cond.slice(1)) : vars.has(cond);
}

function kasusPertama(cases: readonly NarCase[], vars: ReadonlySet<string>): number {
  return cases.findIndex((c) => benar(c.cond, vars));
}

type Keadaan = {
  knot: string;
  idx: number;
  vars: Set<string>;
  pilihan: Jalur['pilihan'];
  langkah: Langkah[];
  dijalankan: Letak[];
  masuk: string[];
  /** `knot|variabel` setiap kali jalur ini memasuki knot, untuk mengenali putaran. */
  sudahMasuk: Set<string>;
  /** Jumlah baris terlihat yang terhitung (W3) sejauh ini. */
  terlihat: number;
};

/** Jalur yang menunggu dijelajahi: memasuki knot `tujuan` dari baris atau opsi `asal`. */
type Antrean = { k: Keadaan; tujuan: string; asal: Letak | null };

function itemDari(line: Exclude<Line, { t: 'set' | 'go' | 'branch' | 'nar' }>): ItemTerlihat {
  switch (line.t) {
    case 'view':
      return {
        t: 'view',
        name: line.name,
        initial: line.initial,
        sub: line.sub,
        pill: line.pill,
        group: line.group,
      };
    case 'in':
      return {
        t: 'in',
        text: line.text,
        ...(line.from === undefined ? {} : { from: line.from }),
        ...(line.attach === undefined ? {} : { attach: line.attach }),
      };
    case 'out':
      return {
        t: 'out',
        text: line.text,
        ...(line.attach === undefined ? {} : { attach: line.attach }),
      };
    case 'typing':
      return { t: 'typing' };
    case 'shot':
      return { t: 'shot', state: line.state };
    case 'sys':
      return { t: 'sys', text: line.text };
    case 'notif':
      return { t: 'notif', app: line.app, text: line.text, time: line.time };
    case 'bank':
      return { t: 'bank', amount: line.amount, from: line.from };
    case 'choice':
      return {
        t: 'choice',
        key: line.key,
        label: line.label,
        options: line.options.map((o) => ({ text: o.text, name: o.name })),
      };
    case 'end':
      return { t: 'end' };
  }
}

/**
 * Menjelajahi semua jalur episode, berurutan seperti urutan opsi di naskah. Jalur yang masuk lagi ke
 * knot dengan nilai variabel yang sama berhenti di sana sebagai `putar`, sehingga putaran lewat
 * pilihan tidak dijelajahi berulang-ulang.
 */
export function walkEpisode(episode: Pick<Episode, 'start' | 'knots'>): Jalur[] {
  const hasil: Jalur[] = [];
  const ada = (knot: string) => Object.hasOwn(episode.knots, knot);

  const selesai = (k: Keadaan, akhir: AkhirJalur, berhenti?: Letak, putarKe?: string) => {
    hasil.push({
      pilihan: k.pilihan,
      langkah: k.langkah,
      dijalankan: k.dijalankan,
      masuk: k.masuk,
      akhir,
      ...(berhenti === undefined ? {} : { berhenti }),
      ...(putarKe === undefined ? {} : { putarKe }),
    });
  };

  /** Memasuki knot; false bila jalur menjadi `putar` (dan sudah diselesaikan). */
  const masuki = (k: Keadaan, tujuan: string, asal: Letak | null): boolean => {
    const kunci = `${tujuan}|${[...k.vars].sort().join(',')}`;
    if (asal !== null && k.sudahMasuk.has(kunci)) {
      selesai(k, 'putar', asal, tujuan);
      return false;
    }
    k.sudahMasuk.add(kunci);
    if (ada(tujuan)) {
      k.masuk.push(tujuan);
    }
    k.knot = tujuan;
    k.idx = 0;
    return true;
  };

  /** Mencatat baris terlihat; false bila jalur menjadi `panjang` (dan sudah diselesaikan). */
  const catat = (k: Keadaan, letak: Letak, item: ItemTerlihat): boolean => {
    k.langkah.push({ ...letak, item });
    if (terhitung(item)) {
      k.terlihat += 1;
    }
    if (k.terlihat > BATAS_BARIS_TERLIHAT) {
      selesai(k, 'panjang', letak);
      return false;
    }
    return true;
  };

  const tumpukan: Antrean[] = [
    {
      k: {
        knot: episode.start,
        idx: 0,
        vars: new Set(),
        pilihan: [],
        langkah: [],
        dijalankan: [],
        masuk: [],
        sudahMasuk: new Set(),
        terlihat: 0,
      },
      tujuan: episode.start,
      asal: null,
    },
  ];

  /** Menjalankan satu jalur sampai selesai, atau sampai blok pilihan yang mendorong cabangnya. */
  const jalankan = (k: Keadaan) => {
    for (;;) {
      const line = ada(k.knot) ? episode.knots[k.knot]?.[k.idx] : undefined;
      if (line === undefined) {
        selesai(k, 'buntu', { knot: k.knot, idx: k.idx });
        return;
      }
      const letak: Letak = { knot: k.knot, idx: k.idx };
      k.dijalankan.push(letak);
      k.idx += 1;

      if (line.t === 'set') {
        k.vars.add(line.v);
        continue;
      }
      if (line.t === 'go') {
        if (!masuki(k, line.to, letak)) {
          return;
        }
        continue;
      }
      if (line.t === 'branch') {
        const kasus = line.cases.find((c) => benar(c.cond, k.vars));
        if (kasus === undefined) {
          selesai(k, 'buntu', letak);
          return;
        }
        if (!masuki(k, kasus.to, letak)) {
          return;
        }
        continue;
      }
      if (line.t === 'nar') {
        let item: { letak: Letak; text: string } | undefined;
        if (line.cases !== undefined) {
          const i = kasusPertama(line.cases, k.vars);
          const kasus = line.cases[i];
          item =
            kasus === undefined ? undefined : { letak: { ...letak, kasus: i }, text: kasus.text };
        } else if (benar(line.cond, k.vars)) {
          item = { letak, text: line.text };
        }
        if (item !== undefined && !catat(k, item.letak, { t: 'nar', text: item.text })) {
          return;
        }
        continue;
      }
      if ((line.t === 'in' || line.t === 'out' || line.t === 'sys') && !benar(line.cond, k.vars)) {
        continue;
      }

      if (!catat(k, letak, itemDari(line))) {
        return;
      }

      if (line.t === 'end') {
        selesai(k, 'END');
        return;
      }
      if (line.t === 'choice') {
        if (line.options.length === 0) {
          selesai(k, 'buntu', letak);
          return;
        }
        // Didorong terbalik supaya opsi pertama dijelajahi lebih dulu.
        for (const [i, opsi] of [...line.options.entries()].reverse()) {
          tumpukan.push({
            k: {
              ...k,
              vars: new Set(k.vars),
              pilihan: [...k.pilihan, { key: line.key, name: opsi.name }],
              langkah: [...k.langkah],
              dijalankan: [...k.dijalankan],
              masuk: [...k.masuk],
              sudahMasuk: new Set(k.sudahMasuk),
            },
            tujuan: opsi.go,
            asal: { ...letak, opsi: i },
          });
        }
        return;
      }
    }
  };

  for (let berikut = tumpukan.pop(); berikut !== undefined; berikut = tumpukan.pop()) {
    if (hasil.length >= BATAS_JALUR) {
      selesai(berikut.k, 'batas', berikut.asal ?? { knot: berikut.k.knot, idx: berikut.k.idx });
      break;
    }
    if (masuki(berikut.k, berikut.tujuan, berikut.asal)) {
      jalankan(berikut.k);
    }
  }
  return hasil;
}
