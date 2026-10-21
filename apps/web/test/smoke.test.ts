import { expect, test } from 'vitest';
import { App } from '../src/app.tsx';

test('komponen App bisa dimuat', () => {
  expect(App).toBeTypeOf('function');
});
