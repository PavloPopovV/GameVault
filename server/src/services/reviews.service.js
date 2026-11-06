import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { libraryEntries, profiles, reviewVotes, reviews, users } from '../db/schema.js';
import { avatarPath } from '../domain/avatar.js';
import { canModifyReview, canReviewGame, canVoteReview, validateVote } from '../domain/review.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { ensureGameExists } from './games.service.js';

/** Додає до рецензій кількість 👍 / 👎 і голос поточного користувача (myVote: 1, -1 або 0). */
export async function attachVotes(rows, user = null) {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const [totals, mine] = await Promise.all([
    db
      .select({
        reviewId: reviewVotes.reviewId,
        likes: sql`count(*) filter (where ${reviewVotes.value} = 1)`.mapWith(Number),
        dislikes: sql`count(*) filter (where ${reviewVotes.value} = -1)`.mapWith(Number),
      })
      .from(reviewVotes)
      .where(inArray(reviewVotes.reviewId, ids))
      .groupBy(reviewVotes.reviewId),
    user
      ? db
          .select({ reviewId: reviewVotes.reviewId, value: reviewVotes.value })
          .from(reviewVotes)
          .where(and(eq(reviewVotes.userId, user.id), inArray(reviewVotes.reviewId, ids)))
      : [],
  ]);
  const byId = new Map(totals.map((t) => [t.reviewId, t]));
  const myById = new Map(mine.map((m) => [m.reviewId, m.value]));
  return rows.map((r) => ({
    ...r,
    likes: byId.get(r.id)?.likes ?? 0,
    dislikes: byId.get(r.id)?.dislikes ?? 0,
    myVote: myById.get(r.id) ?? 0,
  }));
}

/** 👍 / 👎 за чужу рецензію; value = 0 знімає голос. Повертає оновлені лічильники. */
export async function voteReview(user, reviewId, value) {
  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
  if (!review) throw notFound('Рецензію не знайдено');
  const error = validateVote(review, user, value);
  if (error) throw review.userId === user.id ? forbidden(error) : badRequest(error);
  const entry = await db.query.libraryEntries.findFirst({
    where: and(eq(libraryEntries.userId, user.id), eq(libraryEntries.gameId, review.gameId)),
  });
  if (!canVoteReview(entry, value)) throw forbidden('Щоб оцінювати рецензії, спочатку додайте гру в бібліотеку');
  if (value === 0) {
    await db.delete(reviewVotes).where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, user.id)));
  } else {
    await db
      .insert(reviewVotes)
      .values({ reviewId, userId: user.id, value })
      .onConflictDoUpdate({ target: [reviewVotes.reviewId, reviewVotes.userId], set: { value } });
  }
  const [withVotes] = await attachVotes([{ id: reviewId }], user);
  return withVotes;
}

export async function listGameReviews(gameId, { page = 1, limit = 20 } = {}, user = null) {
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
  return attachVotes(
    rows.map(({ avatarUpdatedAt, author, ...r }) => ({
      ...r,
      author: { ...author, avatarUrl: avatarPath(author.id, avatarUpdatedAt) },
    })),
    user,
  );
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
