import { expect, test } from 'vitest';

test('paket script bisa dimuat', async () => {
  const modul = await import('../src/index.ts');
  expect(modul).toBeTypeOf('object');
});
