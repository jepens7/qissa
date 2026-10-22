// Logika pemutar tanpa React dan tanpa DOM: satu ketukan pembaca menjadi langkah-langkah engine, dan
// daftar item yang dirender mengikuti `rendered` engine (ARCHITECTURE §5). Diuji untuk semua jalur.
import type { Step, Story, VisibleLine } from '@qissa/engine';
import type { ChoiceLine } from '@qissa/script/types';

/** Satu item di log cerita; jumlahnya selalu sama dengan `state.rendered` engine. */
export type Item =
  | { jenis: 'baris'; line: VisibleLine }
  | { jenis: 'pilihan'; line: ChoiceLine; dipilih: number | null };

/** Item sesudah satu ketukan, dan langkah yang menghentikannya: render, typing, pilihan, tamat, atau tunggu. */
export type Hasil = { items: Item[]; henti: Step };

/**
 * Memproses langkah dari engine. Pil `view` langsung diikuti langkah berikutnya dalam ketukan yang
 * sama, seperti prototipe; blok pilihan di-snapshot dengan kuncinya supaya bisa diulang.
 */
function lanjutkan(story: Story, items: readonly Item[], langkah: Step): Hasil {
  const baru = [...items];
  let s = langkah;
  for (;;) {
    if (s.kind === 'render') {
      baru.push({ jenis: 'baris', line: s.line });
      if (s.line.t === 'view') {
        s = story.next();
        continue;
      }
      return { items: baru, henti: s };
    }
    if (s.kind === 'choice') {
      story.snapshot(s.line.key);
      baru.push({ jenis: 'pilihan', line: s.line, dipilih: null });
    }
    return { items: baru, henti: s };
  }
}

/** Satu ketukan, atau lanjutan otomatis sesudah typing selesai. */
export function ketuk(story: Story, items: readonly Item[]): Hasil {
  return lanjutkan(story, items, story.next());
}

/** Menandai opsi terpilih di blok pilihan terakhir (dipanggil sebelum jeda menuju baris berikutnya). */
export function tandai(items: readonly Item[], index: number): Item[] {
  return items.map((item, i) =>
    i === items.length - 1 && item.jenis === 'pilihan' ? { ...item, dipilih: index } : item,
  );
}

/** Memilih opsi lalu memproses langkah berikutnya. */
export function pilih(story: Story, items: readonly Item[], index: number): Hasil {
  return lanjutkan(story, items, story.choose(index));
}

/** Kembali ke snapshot `kunci`; null bila snapshot itu belum ada (mis. jalur tanpa pilihan kedua). */
export function ulangDari(story: Story, items: readonly Item[], kunci: string): Item[] | null {
  return story.restore(kunci) ? items.slice(0, story.state.rendered) : null;
}

/** Jumlah titik pilihan di episode, untuk teks sampul. */
export function jumlahPilihan(knots: Readonly<Record<string, readonly { t: string }[]>>): number {
  return Object.values(knots).reduce(
    (n, baris) => n + baris.filter((l) => l.t === 'choice').length,
    0,
  );
}
