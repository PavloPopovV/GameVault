import { z } from 'zod';
import { LIBRARY_STATUSES } from '../domain/library.js';
import { MIN_RATING, MAX_RATING } from '../domain/rating.js';
import { REVIEW_TEXT_MIN, REVIEW_TEXT_MAX } from '../domain/review.js';

export const registerSchema = z.object({
  email: z.string().trim().email('Некоректний Email'),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,32}$/, 'Нікнейм: 3–32 символи (латиниця, цифри, _)'),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Некоректний Email'),
  password: z.string().min(1, 'Введіть пароль'),
});

export const listGamesQuery = z.object({
  q: z.string().trim().min(2, 'Пошук — від 2 символів').max(100).optional(),
  genre: z.string().trim().max(50).optional(),
  platform: z.string().trim().max(50).optional(),
  sort: z.enum(['rating', 'newest', 'title']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// null у необов'язкових полях = «очистити» (адмін прибирає опис/обкладинку при редагуванні)
const gameBase = {
  title: z
    .string({ message: "Назва обов'язкова" })
    .trim()
    .min(1, "Назва обов'язкова")
    .max(150, 'Назва до 150 символів'),
  description: z.string().trim().max(5000, 'Опис до 5000 символів').nullable().optional(),
  releaseYear: z.number().int().min(1970, 'Рік від 1970').max(2100, 'Рік до 2100').nullable().optional(),
  coverUrl: z.string().url('Некоректне посилання').max(500).nullable().optional(),
  backdropUrl: z.string().url('Некоректне посилання').max(500).nullable().optional(),
  developer: z.string().trim().max(100, 'Розробник до 100 символів').nullable().optional(),
  genres: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
};
export const createGameSchema = z.object(gameBase);
export const updateGameSchema = z
  .object(gameBase)
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Немає полів для оновлення');

export const statusSchema = z.enum(LIBRARY_STATUSES, { message: 'Невідомий статус' });
export const addLibrarySchema = z.object({
  gameId: z.string().uuid('Некоректний gameId'),
  status: statusSchema.default('WANT_TO_PLAY'),
});
export const updateLibrarySchema = z.object({ status: statusSchema });
export const libraryQuery = z.object({ status: statusSchema.optional() });
export const gameIdBody = z.object({ gameId: z.string().uuid('Некоректний gameId') });
export const uuidParam = (name) => z.object({ [name]: z.string().uuid('Некоректний ідентифікатор') });

const rating = z
  .number({ message: "Оцінка обов'язкова" })
  .int()
  .min(MIN_RATING, `Оцінка від ${MIN_RATING} до ${MAX_RATING}`)
  .max(MAX_RATING, `Оцінка від ${MIN_RATING} до ${MAX_RATING}`);
const reviewText = z
  .string()
  .trim()
  .min(REVIEW_TEXT_MIN, `Текст рецензії — від ${REVIEW_TEXT_MIN} символів`)
  .max(REVIEW_TEXT_MAX, `Текст рецензії — до ${REVIEW_TEXT_MAX} символів`);
export const createReviewSchema = z.object({ rating, text: reviewText });
export const updateReviewSchema = z
  .object({ rating: rating.optional(), text: reviewText.optional() })
  .refine((o) => o.rating !== undefined || o.text !== undefined, 'Немає полів для оновлення');

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)], { message: 'Голос має бути 1, -1 або 0' }),
});

export const avatarSchema = z.object({ image: z.string().max(300_000, 'Фото завелике') });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Введіть пароль').max(72),
});

export const updateProfileSchema = z
  .object({
    username: registerSchema.shape.username.optional(),
    bio: z.string().trim().max(200, 'Bio — до 200 символів').optional(),
    email: registerSchema.shape.email.optional(),
    currentPassword: z.string().max(72).optional(),
  })
  // Зміна Email (= логіну) — лише з підтвердженням поточним паролем
  .refine((d) => !d.email || d.currentPassword, {
    path: ['currentPassword'],
    message: 'Для зміни Email введіть поточний пароль',
  });
