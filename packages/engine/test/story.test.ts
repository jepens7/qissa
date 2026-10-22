import { FORMAT_EPISODE, type Episode, type Line } from '@qissa/script/types';
import { describe, expect, test } from 'vitest';
import { StoryContentError, createStory, type Step } from '../src/index.ts';

function episode(knots: Record<string, Line[]>, ubah: Partial<Episode> = {}): Episode {
  return {
    format: FORMAT_EPISODE,
    id: 'ep99',
    nomor: 99,
    judul: 'Uji',
    pov: 'Raka',
    meta: {
      teaser: 'Teaser.',
      sampul: 'Sampul.',
      durasi_menit: 3,
      rating: '17+',
      refleksi: 'Apa?',
      bagikan: 'Bagikan.',
      berikutnya: null,
    },
    vars: [],
    start: 'a',
    knots,
    shots: {},
    dalil: { status: 'draft', reviewed_by: null, reviewed_at: null, sections: [] },
    ...ubah,
  };
}

/** Semua langkah sampai menunggu pilihan atau tamat (langkah terakhirnya ikut). */
function sampaiBerhenti(next: () => Step): Step[] {
  const langkah: Step[] = [];
  for (;;) {
    const l = next();
    langkah.push(l);
    if (l.kind === 'choice' || l.kind === 'end' || l.kind === 'wait') {
      return langkah;
    }
  }
}

const VIEW: Line = {
  t: 'view',
  name: 'Gilang',
  initial: 'G',
  sub: 'online',
  pill: 'Chat dengan Gilang',
  group: false,
};

describe('createStory: setiap jenis baris', () => {
  test('view memperbarui header dan keluar sebagai render pil; header ikut di render berikutnya', () => {
    const story = createStory(episode({ a: [VIEW, { t: 'in', text: 'rak' }, { t: 'end' }] }));
    const header = { name: 'Gilang', initial: 'G', sub: 'online' };
    expect(story.state.header).toBeNull();
    expect(story.next()).toEqual({ kind: 'render', line: VIEW, header });
    expect(story.next()).toEqual({ kind: 'render', line: { t: 'in', text: 'rak' }, header });
    expect(story.state.header).toEqual(header);
  });

  test('nar: teks, cond, dan cases; cases tanpa yang cocok dilewati', () => {
    const story = createStory(
      episode({
        a: [
          { t: 'nar', text: 'satu' },
          { t: 'nar', text: 'tersembunyi', cond: 'x' },
          { t: 'nar', cases: [{ cond: 'x', text: 'x' }] },
          { t: 'set', v: 'x' },
          { t: 'nar', text: 'terlihat', cond: 'x' },
          { t: 'nar', cases: [{ cond: '!x', text: 'bukan x' }, { text: 'lainnya' }] },
          { t: 'end' },
        ],
      }),
    );
    expect(sampaiBerhenti(() => story.next())).toEqual([
      { kind: 'render', line: { t: 'nar', text: 'satu' }, header: null },
      { kind: 'render', line: { t: 'nar', text: 'terlihat' }, header: null },
      { kind: 'render', line: { t: 'nar', text: 'lainnya' }, header: null },
      { kind: 'end', path: [] },
    ]);
  });

  test('in, out, dan sys: cond salah dilewati; from dan attach dibawa, cond tidak', () => {
    const story = createStory(
      episode({
        a: [
          { t: 'in', text: 'tersembunyi', cond: 'x' },
          { t: 'in', text: 'halo', from: 'Tika', cond: '!x', attach: 'Foto: resi' },
          { t: 'out', text: 'oke', cond: '!x', attach: 'Foto: struk' },
          { t: 'out', text: 'tersembunyi', cond: 'x' },
          { t: 'sys', text: 'Nadia keluar', cond: '!x' },
          { t: 'sys', text: 'tersembunyi', cond: 'x' },
          { t: 'end' },
        ],
      }),
    );
    expect(
      sampaiBerhenti(() => story.next()).map((l) => (l.kind === 'render' ? l.line : l)),
    ).toEqual([
      { t: 'in', text: 'halo', from: 'Tika', attach: 'Foto: resi' },
      { t: 'out', text: 'oke', attach: 'Foto: struk' },
      { t: 'sys', text: 'Nadia keluar' },
      { kind: 'end', path: [] },
    ]);
  });

  test('shot, notif, dan bank dirender apa adanya', () => {
    const baris: Line[] = [
      { t: 'shot', state: 'closed' },
      { t: 'notif', app: 'Gacor Family', text: '27 pesan baru', time: '03.10' },
      { t: 'bank', amount: 'Rp2.500.000', from: 'DION' },
    ];
    const story = createStory(episode({ a: [...baris, { t: 'end' }] }));
    expect(sampaiBerhenti(() => story.next()).slice(0, 3)).toEqual(
      baris.map((line) => ({ kind: 'render', line, header: null })),
    );
  });

  test('set, go, dan branch tidak terlihat; branch memilih kasus pertama yang benar, lalu default', () => {
    const story = createStory(
      episode({
        a: [
          { t: 'set', v: 'x' },
          { t: 'go', to: 'b' },
        ],
        b: [
          {
            t: 'branch',
            cases: [{ cond: 'y', to: 'salah' }, { cond: 'x', to: 'c' }, { to: 'salah' }],
          },
        ],
        c: [{ t: 'branch', cases: [{ cond: 'y', to: 'salah' }, { to: 'd' }] }],
        d: [{ t: 'nar', text: 'sampai' }, { t: 'end' }],
        salah: [{ t: 'end' }],
      }),
    );
    expect(story.next()).toEqual({
      kind: 'render',
      line: { t: 'nar', text: 'sampai' },
      header: null,
    });
    expect(story.state).toMatchObject({ knot: 'd', vars: { x: true } });
  });

  test('typing 950 ms, atau 350 ms dengan reducedMotion; tidak menambah rendered', () => {
    const knots = { a: [{ t: 'typing' }, { t: 'in', text: 'halo' }, { t: 'end' }] as Line[] };
    const biasa = createStory(episode(knots));
    expect(biasa.next()).toEqual({ kind: 'typing', ms: 950 });
    expect(biasa.state.rendered).toBe(0);
    expect(biasa.next()).toMatchObject({ kind: 'render', line: { t: 'in', text: 'halo' } });
    expect(createStory(episode(knots), { reducedMotion: true }).next()).toEqual({
      kind: 'typing',
      ms: 350,
    });
  });
});

describe('createStory: pilihan, tamat, dan state', () => {
  const PILIHAN: Line = {
    t: 'choice',
    key: 'p1',
    label: 'Pilihan 1 dari 1',
    options: [
      { text: 'Buka', go: 'buka', name: 'Buka' },
      { text: 'Tutup', go: 'tutup', name: 'Tutup' },
      { text: 'Tegur', go: 'tutup', name: 'Tegur' },
    ],
  };
  const KNOTS: Record<string, Line[]> = {
    a: [{ t: 'nar', text: 'awal' }, PILIHAN],
    buka: [{ t: 'nar', text: 'dibuka' }, { t: 'end' }],
    tutup: [{ t: 'nar', text: 'ditutup' }, { t: 'end' }],
  };

  test('choice menunggu; choose mencatat path dan mengembalikan langkah berikutnya', () => {
    const story = createStory(episode(KNOTS));
    story.next();
    expect(story.next()).toEqual({ kind: 'choice', line: PILIHAN });
    expect(story.state.waiting).toBe(true);
    expect(story.next()).toEqual({ kind: 'wait' });
    expect(story.choose(1)).toEqual({
      kind: 'render',
      line: { t: 'nar', text: 'ditutup' },
      header: null,
    });
    expect(story.state).toMatchObject({ waiting: false, path: ['Tutup'], knot: 'tutup' });
  });

  test('choose di luar pilihan adalah wait; indeks yang tidak ada adalah RangeError', () => {
    const story = createStory(episode(KNOTS));
    expect(story.choose(0)).toEqual({ kind: 'wait' });
    sampaiBerhenti(() => story.next());
    expect(() => story.choose(3)).toThrow(RangeError);
  });

  test('end: tamat dengan path; next() sesudahnya wait', () => {
    const story = createStory(episode(KNOTS));
    sampaiBerhenti(() => story.next());
    story.choose(0);
    expect(story.next()).toEqual({ kind: 'end', path: ['Buka'] });
    expect(story.state.ended).toBe(true);
    expect(story.next()).toEqual({ kind: 'wait' });
  });

  test('rendered menghitung langkah render dan choice', () => {
    const story = createStory(episode(KNOTS));
    sampaiBerhenti(() => story.next());
    expect(story.state.rendered).toBe(2);
    story.choose(0);
    expect(story.state.rendered).toBe(3);
  });

  test('state adalah salinan: mengubahnya tidak memengaruhi cerita', () => {
    const story = createStory(episode(KNOTS));
    const state = story.state as { vars: Record<string, boolean>; path: string[] };
    state.vars['x'] = true;
    state.path.push('palsu');
    expect(story.state).toMatchObject({ vars: {}, path: [] });
  });
});

describe('StoryContentError', () => {
  test('format yang belum didukung (ADR-015)', () => {
    const galat = (() => {
      try {
        createStory(episode({ a: [{ t: 'end' }] }, { format: FORMAT_EPISODE + 1 }));
      } catch (e) {
        return e;
      }
      return null;
    })();
    expect(galat).toBeInstanceOf(StoryContentError);
    expect(galat).toMatchObject({ format: FORMAT_EPISODE + 1, knot: null });
  });

  test('knot awal atau tujuan yang tidak ada menyebut nama knotnya', () => {
    expect(() => createStory(episode({ a: [] }, { start: 'hilang' }))).toThrow(
      'Knot “hilang” tidak ada di episode ep99.',
    );
    const story = createStory(episode({ a: [{ t: 'go', to: 'hilang' }] }));
    expect(() => story.next()).toThrow(StoryContentError);
  });

  test('knot yang habis tanpa penutup', () => {
    const story = createStory(episode({ a: [{ t: 'nar', text: 'x' }] }));
    story.next();
    expect(() => story.next()).toThrow('Knot “a” berakhir tanpa penutup.');
  });
});
