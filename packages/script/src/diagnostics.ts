// Diagnostik compiler dan linter (docs/QISSA-SCRIPT.md §6, docs/ARCHITECTURE.md §4).

/** S1 sintaks dan struktur; L1–L7 error; W1–W4 peringatan. */
export type DiagnosticCode =
  'S1' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'W1' | 'W2' | 'W3' | 'W4';

export type Diagnostic = {
  level: 'error' | 'warn';
  code: DiagnosticCode;
  /** Path relatif dari akar repo dengan pemisah `/`. */
  file: string;
  /** Nomor baris di berkas, mulai dari 1. */
  line: number;
  message: string;
};

export type Lapor = (code: DiagnosticCode, line: number, message: string) => void;

/** Pengumpul diagnostik untuk satu berkas. */
export function pengumpul(
  file: string,
  daftar: Diagnostic[] = [],
): { daftar: Diagnostic[]; lapor: Lapor } {
  const lapor: Lapor = (code, line, message) => {
    daftar.push({ level: code.startsWith('W') ? 'warn' : 'error', code, file, line, message });
  };
  return { daftar, lapor };
}

export function adaError(daftar: readonly Diagnostic[]): boolean {
  return daftar.some((d) => d.level === 'error');
}

/**
 * Anotasi GitHub Actions untuk satu diagnostik; peringatan tampil kuning tanpa memerahkan job. Pesan
 * dan properti di-escape sesuai format workflow command, supaya newline tidak memotong anotasi.
 */
export function anotasiGithub(d: Diagnostic): string {
  const data = (s: string) =>
    s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  const properti = (s: string) => data(s).replaceAll(':', '%3A').replaceAll(',', '%2C');
  const jenis = d.level === 'error' ? 'error' : 'warning';
  return `::${jenis} file=${properti(d.file)},line=${String(d.line)},title=${properti(d.code)}::${data(d.message)}`;
}

/** Urutan stabil untuk keluaran: berkas, baris, lalu kode. */
export function urutkan(daftar: readonly Diagnostic[]): Diagnostic[] {
  return [...daftar].sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.code.localeCompare(b.code),
  );
}
