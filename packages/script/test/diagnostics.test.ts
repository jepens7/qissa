import { expect, test } from 'vitest';
import { adaError, pengumpul, urutkan, type Diagnostic } from '../src/diagnostics.ts';

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
