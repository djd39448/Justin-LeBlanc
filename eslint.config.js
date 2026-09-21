/** Enforces safe TypeScript boundaries. Depends on typescript-eslint; consumed by CI and hooks. */
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.astro/**', 'work/**', 'private/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    plugins: { import: importPlugin },
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    },
  },
);
