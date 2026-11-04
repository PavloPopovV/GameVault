import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { libraryEntries, reviews, wishlistItems } from '../db/schema.js';
import { applyStatusChange } from '../domain/library.js';
import { conflict, notFound } from '../utils/errors.js';
import { ensureGameExists } from './games.service.js';

const gameColumns = { id: true, title: true, slug: true, coverUrl: true, releaseYear: true };

export async function listLibrary(userId, status) {
  const where = status
    ? and(eq(libraryEntries.userId, userId), eq(libraryEntries.status, status))
    : eq(libraryEntries.userId, userId);
  const [entries, myReviews] = await Promise.all([
    db.query.libraryEntries.findMany({
      where,
      orderBy: desc(libraryEntries.updatedAt),
      with: { game: { columns: gameColumns } },
    }),
    db.select({ gameId: reviews.gameId }).from(reviews).where(eq(reviews.userId, userId)),
  ]);
  // hasReview — щоб попередити, що разом з грою з бібліотеки зникне й рецензія (GV-21)
  const reviewed = new Set(myReviews.map((r) => r.gameId));
  return entries.map((e) => ({ ...e, hasReview: reviewed.has(e.gameId) }));
}

export async function addToLibrary(userId, gameId, status = 'WANT_TO_PLAY') {
  await ensureGameExists(gameId);
  const existing = await db.query.libraryEntries.findFirst({
    where: and(eq(libraryEntries.userId, userId), eq(libraryEntries.gameId, gameId)),
  });
  if (existing) throw conflict('Гра вже в бібліотеці');
  const fields = applyStatusChange(null, status);
  const [entry] = await db
    .insert(libraryEntries)
    .values({ userId, gameId, ...fields })
    .returning();
  return entry;
}

export async function changeStatus(userId, gameId, status) {
  const entry = await db.query.libraryEntries.findFirst({
    where: and(eq(libraryEntries.userId, userId), eq(libraryEntries.gameId, gameId)),
  });
  if (!entry) throw notFound('Гри немає у вашій бібліотеці');
  const fields = applyStatusChange(entry, status);
  const [updated] = await db.update(libraryEntries).set(fields).where(eq(libraryEntries.id, entry.id)).returning();
  return updated;
}

/** Прибирає гру з бібліотеки разом із рецензією на неї: рецензія можлива лише на гру з бібліотеки (GV-21). */
export async function removeFromLibrary(userId, gameId) {
  await db.transaction(async (tx) => {
    const res = await tx
      .delete(libraryEntries)
      .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.gameId, gameId)))
      .returning({ id: libraryEntries.id });
    if (!res.length) throw notFound('Гри немає у вашій бібліотеці');
    await tx.delete(reviews).where(and(eq(reviews.userId, userId), eq(reviews.gameId, gameId)));
  });
}

// ---- Wishlist ----
export async function listWishlist(userId) {
  return db.query.wishlistItems.findMany({
    where: eq(wishlistItems.userId, userId),
    orderBy: desc(wishlistItems.addedAt),
    with: { game: { columns: gameColumns } },
  });
}

export async function addToWishlist(userId, gameId) {
  await ensureGameExists(gameId);
  const existing = await db.query.wishlistItems.findFirst({
    where: and(eq(wishlistItems.userId, userId), eq(wishlistItems.gameId, gameId)),
  });
  if (existing) throw conflict('Гра вже у Wishlist');
  const [item] = await db.insert(wishlistItems).values({ userId, gameId }).returning();
  return item;
}

export async function removeFromWishlist(userId, gameId) {
  const res = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.gameId, gameId)))
    .returning({ id: wishlistItems.id });
  if (!res.length) throw notFound('Гри немає у Wishlist');
}

/** Переносить гру з Wishlist у бібліотеку зі статусом «Хочу пройти». */
export async function moveWishlistToLibrary(userId, gameId) {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.gameId, gameId)))
      .returning({ id: wishlistItems.id });
    if (!removed.length) throw notFound('Гри немає у Wishlist');
    const existing = await tx.query.libraryEntries.findFirst({
      where: and(eq(libraryEntries.userId, userId), eq(libraryEntries.gameId, gameId)),
    });
    if (existing) return existing;
    const [entry] = await tx
      .insert(libraryEntries)
      .values({ userId, gameId, ...applyStatusChange(null, 'WANT_TO_PLAY') })
      .returning();
    return entry;
  });
}
