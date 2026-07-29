import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup-timezone.ts'],
    coverage: { include: ['src/core/**/*.ts', 'src/background/service.ts'] },
  },
});
