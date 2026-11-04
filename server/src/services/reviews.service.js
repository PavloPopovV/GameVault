import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { libraryEntries, profiles, reviews, users } from '../db/schema.js';
import { avatarPath } from '../domain/avatar.js';
import { canModifyReview, canReviewGame } from '../domain/review.js';
import { conflict, forbidden, notFound } from '../utils/errors.js';
import { ensureGameExists } from './games.service.js';

export async function listGameReviews(gameId, { page = 1, limit = 20 } = {}) {
  await ensureGameExists(gameId);
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      author: { id: users.id, username: users.username },
      avatarUpdatedAt: profiles.avatarUpdatedAt,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .leftJoin(profiles, eq(profiles.userId, reviews.userId))
    .where(eq(reviews.gameId, gameId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  return rows.map(({ avatarUpdatedAt, author, ...r }) => ({
    ...r,
    author: { ...author, avatarUrl: avatarPath(author.id, avatarUpdatedAt) },
  }));
}

export async function createReview(user, gameId, { rating, text }) {
  await ensureGameExists(gameId);
  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.userId, user.id), eq(reviews.gameId, gameId)),
  });
  if (existing) throw conflict('Ви вже залишили рецензію на цю гру');
  const entry = await db.query.libraryEntries.findFirst({
    where: and(eq(libraryEntries.userId, user.id), eq(libraryEntries.gameId, gameId)),
  });
  if (!canReviewGame(entry)) throw forbidden('Щоб написати рецензію, спочатку додайте гру в бібліотеку');
  const [review] = await db.insert(reviews).values({ userId: user.id, gameId, rating, text: text.trim() }).returning();
  return review;
}

async function findOwnedReview(user, reviewId) {
  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
  if (!review) throw notFound('Рецензію не знайдено');
  if (!canModifyReview(review, user)) throw forbidden('Можна змінювати лише власні рецензії');
  return review;
}

export async function updateReview(user, reviewId, data) {
  await findOwnedReview(user, reviewId);
  const patch = { ...data };
  if (patch.text) patch.text = patch.text.trim();
  const [updated] = await db.update(reviews).set(patch).where(eq(reviews.id, reviewId)).returning();
  return updated;
}

export async function deleteReview(user, reviewId) {
  await findOwnedReview(user, reviewId);
  await db.delete(reviews).where(eq(reviews.id, reviewId));
}
