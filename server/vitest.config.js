import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // Модуль бізнес-логіки та middleware — те, що покриваємо unit-тестами
      include: ['src/domain/**', 'src/middleware/**', 'src/utils/**'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
