import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Обов'язкова авторизація: без валідного JWT — 401. */
export function requireAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(unauthorized('Недійсний або прострочений токен'));
  }
}

/** Необов'язкова авторизація: якщо токен є і валідний — заповнює req.user. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      /* гість */
    }
  }
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') return next(forbidden());
  next();
}
