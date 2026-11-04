import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, profiles } from '../db/schema.js';
import { signToken } from '../middleware/auth.js';
import { conflict, unauthorized } from '../utils/errors.js';

const SALT_ROUNDS = 10;

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  role: u.role,
  createdAt: u.createdAt,
});

export async function register({ email, username, password }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, normalizedEmail), eq(users.username, username)),
  });
  if (existing) {
    throw conflict(existing.email === normalizedEmail ? 'Цей Email вже зайнятий' : 'Цей нікнейм вже зайнятий');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({ email: normalizedEmail, username, passwordHash }).returning();
    await tx.insert(profiles).values({ userId: created.id });
    return created;
  });
  return { user: publicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw unauthorized('Невірний Email або пароль');
  return { user: publicUser(user), token: signToken(user) };
}
