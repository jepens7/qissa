// Kontrak JSON yang melintasi batas paket: episode (docs/QISSA-SCRIPT.md §4),
// dalil (docs/DATA-CONTRACTS.md §4), dan manifest (docs/DATA-CONTRACTS.md §2).
// Ini satu-satunya definisinya; engine dan web mengimpornya lewat `@qissa/script/types`.
// Urutan properti di sini adalah urutan key di JSON hasil compile.

/** Nama variabel, atau `!nama` untuk negasinya. */
export type Cond = string;

/** Ganti chat aktif; header berubah dan pil label ditampilkan. */
export type ViewLine = {
  t: 'view';
  name: string;
  initial: string;
  sub: string;
  pill: string;
  /** true bila label pil diawali "Grup". */
  group: boolean;
};

/** Kartu narasi. */
export type NarLine = { t: 'nar'; text: string; cond?: Cond; cases?: never };

export type NarCase = { cond?: Cond; text: string };

/** Kartu narasi dari blok `??`: kasus pertama yang kondisinya benar yang dirender. */
export type NarCasesLine = { t: 'nar'; cases: NarCase[]; text?: never; cond?: never };

/** Gelembung masuk. `from` hanya ada di tampilan grup. */
export type InLine = { t: 'in'; text: string; from?: string; cond?: Cond; attach?: string };

/** Gelembung keluar (tokoh POV). */
export type OutLine = { t: 'out'; text: string; cond?: Cond; attach?: string };

/** Indikator mengetik; UI menunggu lalu merender baris berikutnya. */
export type TypingLine = { t: 'typing' };

/** Tangkapan layar; `state` berisi `closed` atau nama shot di `Episode.shots`. */
export type ShotLine = { t: 'shot'; state: string };

/** Pil sistem. */
export type SysLine = { t: 'sys'; text: string; cond?: Cond };

/** Kartu notifikasi. */
export type NotifLine = { t: 'notif'; app: string; text: string; time: string };

/** Kartu dana masuk m-banking. */
export type BankLine = { t: 'bank'; amount: string; from: string };

/** Variabel bernilai true. */
export type SetLine = { t: 'set'; v: string };

/** Pindah ke knot lain. */
export type GoLine = { t: 'go'; to: string };

export type BranchCase = { cond?: Cond; to: string };

/** Pindah ke knot pertama yang kondisinya benar; kasus terakhir tanpa kondisi adalah default. */
export type BranchLine = { t: 'branch'; cases: BranchCase[] };

export type ChoiceOption = { text: string; go: string; name: string };

/** Blok pilihan; `key` (p1, p2) dipakai untuk snapshot, `name` opsi untuk jalur dan analitik. */
export type ChoiceLine = { t: 'choice'; key: string; label: string; options: ChoiceOption[] };

/** Tamat. */
export type EndLine = { t: 'end' };

export type Line =
  | ViewLine
  | NarLine
  | NarCasesLine
  | InLine
  | OutLine
  | TypingLine
  | ShotLine
  | SysLine
  | NotifLine
  | BankLine
  | SetLine
  | GoLine
  | BranchLine
  | ChoiceLine
  | EndLine;

export type ShotChatLine = { from: string; text: string };

export type ShotComment = { handle: string; text: string };

/** Isi blok `::: shot`; berisi `lines` (mini-chat) atau `cmt` (komentar media sosial). */
export type Shot = {
  cap: string;
  cut?: string;
  /** Pengirim yang gelembungnya rata kanan di mini-chat. */
  pov?: string;
  lines?: ShotChatLine[];
  cmt?: ShotComment;
};

export type EpisodeMeta = {
  teaser: string;
  sampul: string;
  durasi_menit: number;
  rating: string;
  refleksi: string;
  bagikan: string;
  /** Id episode berikutnya; null untuk episode terakhir. */
  berikutnya: string | null;
};

/**
 * Versi format JSON episode (ADR-015). Naik hanya bila engine lama tidak bisa memutar JSON baru dengan
 * benar. Compiler menulis nilai ini; engine menolak format yang tidak dikenalnya.
 */
export const FORMAT_EPISODE = 1;

export type Episode = {
  /** Versi format JSON; lihat FORMAT_EPISODE. */
  format: number;
  id: string;
  nomor: number;
  judul: string;
  pov: string;
  meta: EpisodeMeta;
  vars: string[];
  /** Knot awal: knot pertama di naskah. */
  start: string;
  knots: Record<string, Line[]>;
  shots: Record<string, Shot>;
  dalil: Dalil;
};

export type DalilLineKind = 'arab' | 'teks' | 'rujukan';

export type DalilLine = { kind: DalilLineKind; text: string };

export type DalilEntry = { title?: string; lines: DalilLine[] };

export type DalilSectionKind = 'riwayat' | 'ayat' | 'hadis' | 'catatan' | 'ikhtilaf' | 'hukum';

export type DalilSection = { kind: DalilSectionKind; entries: DalilEntry[] };

export type ReviewStatus = 'draft' | 'reviewed';

/** Hasil compileDalil (docs/DATA-CONTRACTS.md §4). */
export type Dalil = {
  status: ReviewStatus;
  reviewed_by: string | null;
  /** Tanggal review, YYYY-MM-DD. */
  reviewed_at: string | null;
  sections: DalilSection[];
};

export type ManifestReview = { status: ReviewStatus; oleh: string | null; tanggal: string | null };

export type ManifestEpisode = {
  id: string;
  nomor: number;
  judul: string;
  teaser: string;
  durasi_menit: number;
  rating: string;
  url: string;
  /** YYYY-MM-DD.n, dihitung qs compile (docs/DATA-CONTRACTS.md §9). */
  versi_konten: string;
  review: ManifestReview;
  /** Tanggal rilis ISO, zona waktu Asia/Jakarta. */
  rilis: string;
};

/** manifest.json yang disajikan ke app (docs/DATA-CONTRACTS.md §2). */
export type Manifest = { versi: 1; episodes: ManifestEpisode[] };
