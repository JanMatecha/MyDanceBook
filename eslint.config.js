import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.data/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: [
      'src/{server,application,domain,persistence}/**/*.ts',
      'tests/**/*.ts',
      'scripts/**/*.mjs',
      '*.config.{js,ts}',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['fastify', 'zod', 'better-sqlite3', 'react', 'react-dom', 'node:*'],
              message: 'Doména nesmí záviset na transportu, UI, SQLite ani Node infrastruktuře.',
            },
          ],
        },
      ],
    },
  },
);
