import bcrypt from 'bcryptjs';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, profiles, libraryEntries, reviews, wishlistItems, games } from '../db/schema.js';
import { buildProfileStats } from '../domain/stats.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { isDemoAccount } from '../config/demo.js';
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

export async function updateProfile(userId, { username, bio, email, currentPassword }) {
  if (email) {
    const normalizedEmail = email.toLowerCase();
    const me = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!me) throw notFound('Користувача не знайдено');
    if (normalizedEmail !== me.email) {
      if (isDemoAccount(me.email)) throw forbidden('Email демо-акаунта змінити не можна');
      const ok = await bcrypt.compare(currentPassword ?? '', me.passwordHash);
      if (!ok) {
        const message = 'Невірний поточний пароль';
        throw badRequest(message, [{ field: 'currentPassword', message }]);
      }
      const taken = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
      if (taken) {
        const message = 'Цей Email вже зайнятий';
        throw conflict(message, [{ field: 'email', message }]);
      }
      await db.update(users).set({ email: normalizedEmail }).where(eq(users.id, userId));
    }
  }
  if (username) {
    const taken = await db.query.users.findFirst({ where: eq(users.username, username) });
    if (taken && taken.id !== userId) {
      const message = 'Цей нікнейм вже зайнятий';
      throw conflict(message, [{ field: 'username', message }]);
    }
    await db.update(users).set({ username }).where(eq(users.id, userId));
  }
  if (bio !== undefined) {
    await db.insert(profiles).values({ userId, bio }).onConflictDoUpdate({ target: profiles.userId, set: { bio } });
  }
  return getMe(userId);
}

/** Рецензії користувача з короткою інформацією про гру — для профілю. */
export function listMyReviews(userId) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      game: { id: games.id, slug: games.slug, title: games.title, coverUrl: games.coverUrl },
    })
    .from(reviews)
    .innerJoin(games, eq(games.id, reviews.gameId))
    .where(eq(reviews.userId, userId))
    .orderBy(desc(reviews.updatedAt));
}

/** Видалення акаунта з підтвердженням паролем. Бібліотека, Wishlist, рецензії й профіль видаляються каскадно. */
export async function deleteAccount(userId, { password }) {
  const me = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!me) throw notFound('Користувача не знайдено');
  if (isDemoAccount(me.email)) throw forbidden('Демо-акаунт видалити не можна');
  const ok = await bcrypt.compare(password, me.passwordHash);
  if (!ok) {
    const message = 'Невірний пароль';
    throw badRequest(message, [{ field: 'password', message }]);
  }
  await db.delete(users).where(eq(users.id, userId));
}
