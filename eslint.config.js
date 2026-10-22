// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const PESAN_REACT = 'engine dan script tidak boleh bergantung pada React (ARCHITECTURE §3).';

const larangReact = {
  paths: [
    { name: 'react', message: PESAN_REACT },
    { name: 'react-dom', message: PESAN_REACT },
  ],
  patterns: [{ group: ['react/*', 'react-dom/*'], message: PESAN_REACT }],
};

/** @param {string[]} names @param {string} message */
const globalTerlarang = (names, message) => names.map((name) => ({ name, message }));

const globalBrowser = globalTerlarang(
  ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'],
  'engine dan script tidak boleh memakai API browser (ARCHITECTURE §3).',
);

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'coverage/**',
      'infra/prototype/**',
      'apps/web/public/content/**',
      'packages/script/schema/**',
      'packages/script/__snapshots__/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['packages/script/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', larangReact],
      'no-restricted-globals': ['error', ...globalBrowser],
    },
  },
  {
    files: ['packages/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: larangReact.paths,
          patterns: [
            ...larangReact.patterns,
            {
              regex: '^node:',
              message: 'engine murni: tanpa I/O dan tanpa API Node (ARCHITECTURE §1).',
            },
            {
              regex: '^@qissa/script(?!/types$)',
              message: 'engine hanya boleh mengimpor @qissa/script/types (ARCHITECTURE §3).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...globalBrowser,
        ...globalTerlarang(
          ['fetch', 'setTimeout', 'setInterval', 'requestAnimationFrame'],
          'engine tanpa timer dan tanpa I/O; waktu diurus UI (ARCHITECTURE §1).',
        ),
      ],
    },
  },
  {
    // Tes engine boleh membaca golden snapshot packages/script dengan node:fs saja (ADR-016).
    files: ['packages/engine/test/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: larangReact.paths,
          patterns: [
            ...larangReact.patterns,
            {
              regex: '^node:(?!fs$)',
              message:
                'tes engine hanya boleh memakai node:fs untuk membaca golden snapshot (ADR-016).',
            },
            {
              regex: '^@qissa/script(?!/types$)',
              message: 'engine hanya boleh mengimpor @qissa/script/types (ARCHITECTURE §3).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      // Teks naskah dan dalil selalu dirender lewat escaping React (SRS NFR-5, BACKLOG D4).
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Tanpa HTML mentah: render teks lewat React (PRIVACY-SECURITY §3).',
        },
        {
          selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Tanpa HTML mentah: render teks lewat React (PRIVACY-SECURITY §3).',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@qissa/script(?!/types$)',
              message:
                'apps/web tidak boleh mengimpor compiler; pakai @qissa/script/types (ARCHITECTURE §3).',
            },
          ],
        },
      ],
    },
  },
);
