import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth, optionalAuth, requireAdmin, signToken } from '../../src/middleware/auth.js';
import { validate } from '../../src/middleware/validate.js';
import { errorHandler, notFoundHandler } from '../../src/middleware/error.js';
import { AppError, badRequest, conflict, forbidden, notFound, unauthorized } from '../../src/utils/errors.js';

// Мок-об'єкти Express (тест не піднімає сервер — це unit, а не інтеграційний тест)
const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const reqWithToken = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('requireAuth', () => {
  it('валідний JWT → req.user заповнено, next() без помилки', () => {
    // Arrange
    const token = signToken({ id: 'u1', role: 'USER' });
    const req = reqWithToken(token);
    const next = vi.fn();
    // Act
    requireAuth(req, {}, next);
    // Assert
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'u1', role: 'USER' });
  });

  it('без токена → 401', () => {
    const next = vi.fn();
    requireAuth(reqWithToken(null), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Потрібна авторизація' });
  });

  it('фейковий токен → 401 «Недійсний або прострочений токен»', () => {
    const next = vi.fn();
    requireAuth(reqWithToken('fake.token.value'), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Недійсний або прострочений токен' });
  });

  it('прострочений токен → 401 (edge case)', () => {
    const expired = jwt.sign(
      { sub: 'u1', role: 'USER', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
    );
    const next = vi.fn();
    requireAuth(reqWithToken(expired), {}, next);
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('схема відмінна від Bearer → 401', () => {
    const next = vi.fn();
    requireAuth({ headers: { authorization: 'Basic abc' } }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});

describe('optionalAuth', () => {
  it('із валідним токеном заповнює req.user', () => {
    const req = reqWithToken(signToken({ id: 'u2', role: 'ADMIN' }));
    const next = vi.fn();
    optionalAuth(req, {}, next);
    expect(req.user).toEqual({ id: 'u2', role: 'ADMIN' });
    expect(next).toHaveBeenCalledWith();
  });
  it('з невалідним токеном — гість без помилки', () => {
    const req = reqWithToken('broken');
    const next = vi.fn();
    optionalAuth(req, {}, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
  it('без токена — гість', () => {
    const req = reqWithToken(null);
    const next = vi.fn();
    optionalAuth(req, {}, next);
    expect(req.user).toBeUndefined();
  });
});

describe('requireAdmin', () => {
  it('ADMIN проходить', () => {
    const next = vi.fn();
    requireAdmin({ user: { role: 'ADMIN' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('USER → 403', () => {
    const next = vi.fn();
    requireAdmin({ user: { role: 'USER' } }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(403);
  });
});

describe('validate', () => {
  const schema = z.object({ age: z.coerce.number().int().min(18, 'Від 18 років') });

  it('коректні дані — замінює req.body розпарсеними', () => {
    const req = { body: { age: '21' } };
    const next = vi.fn();
    validate(schema)(req, {}, next);
    expect(req.body).toEqual({ age: 21 });
    expect(next).toHaveBeenCalledWith();
  });

  it('некоректні дані → 400 з деталями полів', () => {
    const next = vi.fn();
    validate(schema)({ body: { age: 10 } }, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.message).toBe('Від 18 років');
    expect(err.details).toEqual([{ field: 'age', message: 'Від 18 років' }]);
  });

  it('перевіряє вказане джерело (query)', () => {
    const req = { query: { age: '30' } };
    validate(schema, 'query')(req, {}, vi.fn());
    expect(req.query.age).toBe(30);
  });

  it("помилка на рівні всього об'єкта — поле дорівнює назві джерела", () => {
    const next = vi.fn();
    validate(z.object({}).refine(() => false, 'Порожньо'))({ body: {} }, {}, next);
    expect(next.mock.calls[0][0].details[0].field).toBe('body');
  });
});

describe('errorHandler', () => {
  const run = (err) => {
    const res = mockRes();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, vi.fn());
    return res;
  };

  it.each([
    [badRequest('a', [{ field: 'f' }]), 400],
    [unauthorized(), 401],
    [forbidden(), 403],
    [notFound(), 404],
    [conflict('dup'), 409],
    [new AppError(418, 'teapot'), 418],
  ])('AppError → відповідний статус', (err, status) => {
    const res = run(err);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ message: err.message, details: err.details });
  });

  it('битий JSON → 400', () => {
    expect(run({ type: 'entity.parse.failed' }).status).toHaveBeenCalledWith(400);
  });

  it('порушення UNIQUE у PostgreSQL (23505) → 409', () => {
    expect(run({ code: '23505' }).status).toHaveBeenCalledWith(409);
    expect(run({ cause: { code: '23505' } }).status).toHaveBeenCalledWith(409);
  });

  it('невідома помилка → 500 без витоку деталей', () => {
    const res = run(new Error('secret stack info'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Внутрішня помилка сервера' });
  });

  it('notFoundHandler → 404 з маршрутом', () => {
    const res = mockRes();
    notFoundHandler({ method: 'POST', originalUrl: '/api/v1/nope' }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toContain('POST /api/v1/nope');
  });
});
