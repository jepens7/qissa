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
export function pengumpul(file: string): { daftar: Diagnostic[]; lapor: Lapor } {
  const daftar: Diagnostic[] = [];
  const lapor: Lapor = (code, line, message) => {
    daftar.push({ level: code.startsWith('W') ? 'warn' : 'error', code, file, line, message });
  };
  return { daftar, lapor };
}

export function adaError(daftar: readonly Diagnostic[]): boolean {
  return daftar.some((d) => d.level === 'error');
}

/** Urutan stabil untuk keluaran: berkas, baris, lalu kode. */
export function urutkan(daftar: readonly Diagnostic[]): Diagnostic[] {
  return [...daftar].sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.code.localeCompare(b.code),
  );
}
