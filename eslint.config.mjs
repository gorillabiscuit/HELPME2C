// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/*.tsbuildinfo',
      // Skill packages installed via `npx skills add` — vendored content
      // we don't lint. ESLint doesn't respect .gitignore, hence the
      // duplicate exclusion alongside the .gitignore entry.
      '.agents/**',
      '.claude/skills/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // packages/shared must stay platform-agnostic per CLAUDE.md §2.
  {
    files: ['packages/shared/**/*.{ts,tsx,js,mjs,cjs}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'document',
          message: 'packages/shared is platform-agnostic per CLAUDE.md §2',
        },
        {
          name: 'window',
          message: 'packages/shared is platform-agnostic per CLAUDE.md §2',
        },
        {
          name: 'navigator',
          message: 'packages/shared is platform-agnostic per CLAUDE.md §2',
        },
      ],
    },
  },
  // Config files and project scripts may use console.
  {
    files: ['**/*.config.{js,mjs,cjs,ts}', 'scripts/**/*.{js,mjs,cjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
);
