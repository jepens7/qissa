import { expect, test } from 'vitest';
import {
  adaError,
  anotasiGithub,
  pengumpul,
  urutkan,
  type Diagnostic,
} from '../src/diagnostics.ts';

test('pengumpul: S1 dan L* adalah error, W* peringatan', () => {
  const { daftar, lapor } = pengumpul('a.qs.md');
  lapor('S1', 3, 'x');
  lapor('L2', 1, 'y');
  lapor('W1', 2, 'z');
  expect(daftar.map((d) => [d.code, d.level])).toEqual([
    ['S1', 'error'],
    ['L2', 'error'],
    ['W1', 'warn'],
  ]);
  expect(adaError(daftar)).toBe(true);
  expect(adaError(daftar.filter((d) => d.level === 'warn'))).toBe(false);
});

test('anotasi GitHub: newline, %, titik dua, dan koma di-escape supaya anotasi tidak terpotong', () => {
  expect(
    anotasiGithub({
      level: 'error',
      code: 'L6',
      file: 'content/a,b:c.qs.md',
      line: 2,
      message: '“id” harus epNN, bukan “ep01\nx” (100%).',
    }),
  ).toBe(
    '::error file=content/a%2Cb%3Ac.qs.md,line=2,title=L6::“id” harus epNN, bukan “ep01%0Ax” (100%25).',
  );
  expect(anotasiGithub({ level: 'warn', code: 'W1', file: 'a.qs.md', line: 1, message: 'x' })).toBe(
    '::warning file=a.qs.md,line=1,title=W1::x',
  );
});

test('urutkan: per berkas, lalu baris, lalu kode', () => {
  const d = (file: string, line: number, code: Diagnostic['code']): Diagnostic => ({
    level: 'error',
    code,
    file,
    line,
    message: '',
  });
  expect(urutkan([d('b', 1, 'L1'), d('a', 9, 'L2'), d('a', 9, 'L1'), d('a', 2, 'W1')])).toEqual([
    d('a', 2, 'W1'),
    d('a', 9, 'L1'),
    d('a', 9, 'L2'),
    d('b', 1, 'L1'),
  ]);
});
