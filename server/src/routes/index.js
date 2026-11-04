import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as S from './schemas.js';
import * as auth from '../services/auth.service.js';
import * as usersSvc from '../services/users.service.js';

const r = Router();
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Auth ----
r.post(
  '/auth/register',
  validate(S.registerSchema),
  h(async (req, res) => {
    res.status(201).json(await auth.register(req.body));
  }),
);
r.post(
  '/auth/login',
  validate(S.loginSchema),
  h(async (req, res) => {
    res.json(await auth.login(req.body));
  }),
);

// ---- Users ----
r.get(
  '/users/me',
  requireAuth,
  h(async (req, res) => res.json(await usersSvc.getMe(req.user.id))),
);
r.patch(
  '/users/me',
  requireAuth,
  validate(S.updateProfileSchema),
  h(async (req, res) => {
    res.json(await usersSvc.updateProfile(req.user.id, req.body));
  }),
);

export default r;
