import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, profiles, libraryEntries, reviews, wishlistItems } from '../db/schema.js';
import { buildProfileStats } from '../domain/stats.js';
import { conflict, notFound } from '../utils/errors.js';
import { publicUser } from './auth.service.js';

export async function getMe(userId) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), with: { profile: true } });
  if (!user) throw notFound('Користувача не знайдено');
  const [entries, userReviews, [{ count }]] = await Promise.all([
    db.select({ status: libraryEntries.status }).from(libraryEntries).where(eq(libraryEntries.userId, userId)),
    db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.userId, userId)),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId)),
  ]);
  return {
    ...publicUser(user),
    profile: { bio: user.profile?.bio ?? null },
    stats: buildProfileStats(entries, userReviews, count),
  };
}

export async function updateProfile(userId, { username, bio }) {
  if (username) {
    const taken = await db.query.users.findFirst({ where: eq(users.username, username) });
    if (taken && taken.id !== userId) throw conflict('Цей нікнейм вже зайнятий');
    await db.update(users).set({ username }).where(eq(users.id, userId));
  }
  if (bio !== undefined) {
    await db.insert(profiles).values({ userId, bio }).onConflictDoUpdate({ target: profiles.userId, set: { bio } });
  }
  return getMe(userId);
}
