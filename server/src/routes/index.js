import { Router } from 'express';
import { requireAuth, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as S from './schemas.js';
import * as auth from '../services/auth.service.js';
import * as gamesSvc from '../services/games.service.js';
import * as library from '../services/library.service.js';
import * as reviewsSvc from '../services/reviews.service.js';
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

// ---- Catalog (public) ----
r.get(
  '/genres',
  h(async (_req, res) => res.json(await gamesSvc.listGenres())),
);
r.get(
  '/platforms',
  h(async (_req, res) => res.json(await gamesSvc.listPlatforms())),
);
r.get(
  '/games',
  validate(S.listGamesQuery, 'query'),
  h(async (req, res) => res.json(await gamesSvc.listGames(req.query))),
);
r.get(
  '/games/:idOrSlug',
  optionalAuth,
  h(async (req, res) => res.json(await gamesSvc.getGame(req.params.idOrSlug, req.user))),
);

// ---- Catalog (admin) ----
r.post(
  '/games',
  requireAuth,
  requireAdmin,
  validate(S.createGameSchema),
  h(async (req, res) => {
    res.status(201).json(await gamesSvc.createGame(req.body));
  }),
);
r.patch(
  '/games/:id',
  requireAuth,
  requireAdmin,
  validate(S.uuidParam('id'), 'params'),
  validate(S.updateGameSchema),
  h(async (req, res) => res.json(await gamesSvc.updateGame(req.params.id, req.body))),
);
r.delete(
  '/games/:id',
  requireAuth,
  requireAdmin,
  validate(S.uuidParam('id'), 'params'),
  h(async (req, res) => {
    await gamesSvc.deleteGame(req.params.id);
    res.status(204).end();
  }),
);

// ---- Library ----
r.get(
  '/library',
  requireAuth,
  validate(S.libraryQuery, 'query'),
  h(async (req, res) => {
    res.json(await library.listLibrary(req.user.id, req.query.status));
  }),
);
r.post(
  '/library',
  requireAuth,
  validate(S.addLibrarySchema),
  h(async (req, res) => {
    res.status(201).json(await library.addToLibrary(req.user.id, req.body.gameId, req.body.status));
  }),
);
r.patch(
  '/library/:gameId',
  requireAuth,
  validate(S.uuidParam('gameId'), 'params'),
  validate(S.updateLibrarySchema),
  h(async (req, res) => res.json(await library.changeStatus(req.user.id, req.params.gameId, req.body.status))),
);
r.delete(
  '/library/:gameId',
  requireAuth,
  validate(S.uuidParam('gameId'), 'params'),
  h(async (req, res) => {
    await library.removeFromLibrary(req.user.id, req.params.gameId);
    res.status(204).end();
  }),
);

// ---- Wishlist ----
r.get(
  '/wishlist',
  requireAuth,
  h(async (req, res) => res.json(await library.listWishlist(req.user.id))),
);
r.post(
  '/wishlist',
  requireAuth,
  validate(S.gameIdBody),
  h(async (req, res) => {
    res.status(201).json(await library.addToWishlist(req.user.id, req.body.gameId));
  }),
);
r.delete(
  '/wishlist/:gameId',
  requireAuth,
  validate(S.uuidParam('gameId'), 'params'),
  h(async (req, res) => {
    await library.removeFromWishlist(req.user.id, req.params.gameId);
    res.status(204).end();
  }),
);
r.post(
  '/wishlist/:gameId/move-to-library',
  requireAuth,
  validate(S.uuidParam('gameId'), 'params'),
  h(async (req, res) => {
    res.status(201).json(await library.moveWishlistToLibrary(req.user.id, req.params.gameId));
  }),
);

// ---- Reviews ----
r.get(
  '/games/:gameId/reviews',
  validate(S.uuidParam('gameId'), 'params'),
  validate(S.pageQuery, 'query'),
  h(async (req, res) => res.json(await reviewsSvc.listGameReviews(req.params.gameId, req.query))),
);
r.post(
  '/games/:gameId/reviews',
  requireAuth,
  validate(S.uuidParam('gameId'), 'params'),
  validate(S.createReviewSchema),
  h(async (req, res) => res.status(201).json(await reviewsSvc.createReview(req.user, req.params.gameId, req.body))),
);
r.patch(
  '/reviews/:id',
  requireAuth,
  validate(S.uuidParam('id'), 'params'),
  validate(S.updateReviewSchema),
  h(async (req, res) => res.json(await reviewsSvc.updateReview(req.user, req.params.id, req.body))),
);
r.delete(
  '/reviews/:id',
  requireAuth,
  validate(S.uuidParam('id'), 'params'),
  h(async (req, res) => {
    await reviewsSvc.deleteReview(req.user, req.params.id);
    res.status(204).end();
  }),
);

export default r;
