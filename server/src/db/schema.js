// GameVault — схема бази даних (PostgreSQL + Drizzle ORM)
// Відповідає ER-діаграмі: docs/diagrams/er-diagram.dbml
import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  serial,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
  customType,
} from 'drizzle-orm/pg-core';

const bytea = customType({ dataType: () => 'bytea' });

export const roleEnum = pgEnum('role', ['USER', 'ADMIN']);
export const libraryStatusEnum = pgEnum('library_status', ['WANT_TO_PLAY', 'PLAYING', 'COMPLETED', 'DROPPED']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 32 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('USER'),
  createdAt: createdAt(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: varchar('bio', { length: 200 }),
  // Фото профілю (≤ 200 КБ, вже стиснуте клієнтом) — у БД, бо диск Render тимчасовий
  avatar: bytea('avatar'),
  avatarMime: varchar('avatar_mime', { length: 20 }),
  avatarUpdatedAt: timestamp('avatar_updated_at', { withTimezone: true }),
  updatedAt: updatedAt(),
});

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 150 }).notNull().unique(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  description: text('description'),
  releaseYear: integer('release_year'),
  coverUrl: varchar('cover_url', { length: 500 }),
  developer: varchar('developer', { length: 100 }),
  createdAt: createdAt(),
});

export const genres = pgTable('genres', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

export const platforms = pgTable('platforms', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

// Join table: games <-> genres (Many-to-Many)
export const gameGenres = pgTable(
  'game_genres',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.genreId] })],
);

// Join table: games <-> platforms (Many-to-Many)
export const gamePlatforms = pgTable(
  'game_platforms',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    platformId: integer('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.platformId] })],
);

export const libraryEntries = pgTable(
  'library_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    status: libraryStatusEnum('status').notNull().default('WANT_TO_PLAY'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('library_entries_user_game_uq').on(t.userId, t.gameId),
    index('library_entries_user_status_idx').on(t.userId, t.status),
  ],
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('wishlist_items_user_game_uq').on(t.userId, t.gameId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    rating: smallint('rating').notNull(),
    text: text('text').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('reviews_user_game_uq').on(t.userId, t.gameId),
    index('reviews_game_idx').on(t.gameId),
    check('reviews_rating_check', sql`${t.rating} BETWEEN 1 AND 10`),
  ],
);

// ---- relations (для зручних запитів із join) ----
// Оцінки рецензій іншими користувачами: 1 = 👍, -1 = 👎 (один голос від людини на рецензію)
export const reviewVotes = pgTable(
  'review_votes',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: smallint('value').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.reviewId, t.userId] }),
    check('review_votes_value_check', sql`${t.value} IN (-1, 1)`),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  library: many(libraryEntries),
  wishlist: many(wishlistItems),
  reviews: many(reviews),
}));
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));
export const gamesRelations = relations(games, ({ many }) => ({
  genres: many(gameGenres),
  platforms: many(gamePlatforms),
  reviews: many(reviews),
}));
export const gameGenresRelations = relations(gameGenres, ({ one }) => ({
  game: one(games, { fields: [gameGenres.gameId], references: [games.id] }),
  genre: one(genres, { fields: [gameGenres.genreId], references: [genres.id] }),
}));
export const gamePlatformsRelations = relations(gamePlatforms, ({ one }) => ({
  game: one(games, { fields: [gamePlatforms.gameId], references: [games.id] }),
  platform: one(platforms, { fields: [gamePlatforms.platformId], references: [platforms.id] }),
}));
export const libraryEntriesRelations = relations(libraryEntries, ({ one }) => ({
  user: one(users, { fields: [libraryEntries.userId], references: [users.id] }),
  game: one(games, { fields: [libraryEntries.gameId], references: [games.id] }),
}));
export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  game: one(games, { fields: [wishlistItems.gameId], references: [games.id] }),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  game: one(games, { fields: [reviews.gameId], references: [games.id] }),
}));
