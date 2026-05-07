import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `@/*` → `apps/web/src/*` path mapping in apps/web/tsconfig.json
      // so vitest can resolve imports inside files under apps/web during tests.
      '@/': fileURLToPath(new URL('./apps/web/src/', import.meta.url)),
    },
  },
  test: {
    globals: false,
    include: ['{apps,packages}/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
});
