import { defineConfig } from 'vitest/config';

// Інтеграційні тести API на реальній тестовій БД (TEST_DATABASE_URL)
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.integration.js'],
    include: ['tests/integration/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
