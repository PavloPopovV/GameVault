import { and, asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  games,
  genres,
  platforms,
  gameGenres,
  gamePlatforms,
  reviews,
  libraryEntries,
  wishlistItems,
} from '../db/schema.js';
import { notFound } from '../utils/errors.js';
import { slugify } from '../utils/slug.js';

const avgRating = sql`round(avg(${reviews.rating})::numeric, 1)`.mapWith(Number).as('average_rating');
const reviewsCount = sql`count(${reviews.id})`.mapWith(Number).as('reviews_count');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function attachTaxonomy(rows) {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const [g, p] = await Promise.all([
    db
      .select({ gameId: gameGenres.gameId, name: genres.name })
      .from(gameGenres)
      .innerJoin(genres, eq(genres.id, gameGenres.genreId))
      .where(inArray(gameGenres.gameId, ids)),
    db
      .select({ gameId: gamePlatforms.gameId, name: platforms.name })
      .from(gamePlatforms)
      .innerJoin(platforms, eq(platforms.id, gamePlatforms.platformId))
      .where(inArray(gamePlatforms.gameId, ids)),
  ]);
  return rows.map((r) => ({
    ...r,
    averageRating: r.averageRating ?? null,
    genres: g.filter((x) => x.gameId === r.id).map((x) => x.name),
    platforms: p.filter((x) => x.gameId === r.id).map((x) => x.name),
  }));
}

/** Для авторизованого користувача додає до кожної гри її статус у його бібліотеці (або null). */
async function attachLibraryStatus(rows, user) {
  if (!user || rows.length === 0) return rows;
  const entries = await db
    .select({ gameId: libraryEntries.gameId, status: libraryEntries.status })
    .from(libraryEntries)
    .where(and(eq(libraryEntries.userId, user.id), inArray(libraryEntries.gameId, rows.map((r) => r.id))));
  const byGame = new Map(entries.map((e) => [e.gameId, e.status]));
  return rows.map((r) => ({ ...r, libraryStatus: byGame.get(r.id) ?? null }));
}

export async function listGames({ q, genre, platform, sort = 'rating', page = 1, limit = 20 }, user = null) {
  const filters = [];
  if (q) filters.push(ilike(games.title, `%${q}%`));
  if (genre) {
    filters.push(sql`exists (select 1 from ${gameGenres} gg join ${genres} g on g.id = gg.genre_id
      where gg.game_id = ${games.id} and g.name = ${genre})`);
  }
  if (platform) {
    filters.push(sql`exists (select 1 from ${gamePlatforms} gp join ${platforms} p on p.id = gp.platform_id
      where gp.game_id = ${games.id} and p.name = ${platform})`);
  }
  const where = filters.length ? and(...filters) : undefined;

  const orderBy = {
    rating: [sql`average_rating desc nulls last`, asc(games.title)],
    newest: [sql`${games.releaseYear} desc nulls last`, asc(games.title)],
    title: [asc(games.title)],
  }[sort] ?? [asc(games.title)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: games.id,
        title: games.title,
        slug: games.slug,
        releaseYear: games.releaseYear,
        coverUrl: games.coverUrl,
        developer: games.developer,
        averageRating: avgRating,
        reviewsCount,
      })
      .from(games)
      .leftJoin(reviews, eq(reviews.gameId, games.id))
      .where(where)
      .groupBy(games.id)
      .orderBy(...orderBy)
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(games)
      .where(where),
  ]);

  return {
    items: await attachLibraryStatus(await attachTaxonomy(rows), user),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function findGameRow(idOrSlug) {
  const cond = UUID_RE.test(idOrSlug) ? eq(games.id, idOrSlug) : eq(games.slug, idOrSlug);
  const [row] = await db
    .select({
      id: games.id,
      title: games.title,
      slug: games.slug,
      description: games.description,
      releaseYear: games.releaseYear,
      coverUrl: games.coverUrl,
      developer: games.developer,
      createdAt: games.createdAt,
      averageRating: avgRating,
      reviewsCount,
    })
    .from(games)
    .leftJoin(reviews, eq(reviews.gameId, games.id))
    .where(cond)
    .groupBy(games.id);
  if (!row) throw notFound('Гру не знайдено');
  return row;
}

export async function getGame(idOrSlug, user) {
  const [game] = await attachTaxonomy([await findGameRow(idOrSlug)]);
  let me = null;
  if (user) {
    const [entry, wish, review] = await Promise.all([
      db.query.libraryEntries.findFirst({
        where: and(eq(libraryEntries.userId, user.id), eq(libraryEntries.gameId, game.id)),
      }),
      db.query.wishlistItems.findFirst({
        where: and(eq(wishlistItems.userId, user.id), eq(wishlistItems.gameId, game.id)),
      }),
      db.query.reviews.findFirst({ where: and(eq(reviews.userId, user.id), eq(reviews.gameId, game.id)) }),
    ]);
    me = { libraryStatus: entry?.status ?? null, inWishlist: Boolean(wish), reviewId: review?.id ?? null };
  }
  return { ...game, me };
}

export async function ensureGameExists(gameId) {
  const game = await db.query.games.findFirst({ where: eq(games.id, gameId), columns: { id: true } });
  if (!game) throw notFound('Гру не знайдено');
  return game;
}

async function setTaxonomy(tx, gameId, genreNames, platformNames) {
  if (genreNames) {
    await tx.delete(gameGenres).where(eq(gameGenres.gameId, gameId));
    if (genreNames.length) {
      const rows = await tx.select().from(genres).where(inArray(genres.name, genreNames));
      if (rows.length) await tx.insert(gameGenres).values(rows.map((g) => ({ gameId, genreId: g.id })));
    }
  }
  if (platformNames) {
    await tx.delete(gamePlatforms).where(eq(gamePlatforms.gameId, gameId));
    if (platformNames.length) {
      const rows = await tx.select().from(platforms).where(inArray(platforms.name, platformNames));
      if (rows.length) await tx.insert(gamePlatforms).values(rows.map((p) => ({ gameId, platformId: p.id })));
    }
  }
}

export async function createGame({ genres: g = [], platforms: p = [], ...data }) {
  const id = await db.transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({ ...data, slug: slugify(data.title) })
      .returning({ id: games.id });
    await setTaxonomy(tx, game.id, g, p);
    return game.id;
  });
  return getGame(id);
}

export async function updateGame(id, { genres: g, platforms: p, ...data }) {
  await ensureGameExists(id);
  await db.transaction(async (tx) => {
    if (Object.keys(data).length) {
      if (data.title) data.slug = slugify(data.title);
      await tx.update(games).set(data).where(eq(games.id, id));
    }
    await setTaxonomy(tx, id, g, p);
  });
  return getGame(id);
}

export async function deleteGame(id) {
  const res = await db.delete(games).where(eq(games.id, id)).returning({ id: games.id });
  if (!res.length) throw notFound('Гру не знайдено');
}

export const listGenres = () => db.select().from(genres).orderBy(asc(genres.name));
export const listPlatforms = () => db.select().from(platforms).orderBy(asc(platforms.name));
