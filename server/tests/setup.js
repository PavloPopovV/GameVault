// Unit-тести не ходять у БД — підставляємо фіктивні змінні середовища
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'unit-test-secret';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/unused';
