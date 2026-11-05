import 'dotenv/config';

process.env.NODE_ENV = 'test';
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Для інтеграційних тестів задайте TEST_DATABASE_URL (окрема тестова БД!)');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET ??= 'integration-test-secret';
