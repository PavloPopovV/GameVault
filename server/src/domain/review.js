import { isValidRating, MIN_RATING, MAX_RATING } from './rating.js';

export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 2000;

/**
 * Перевіряє дані рецензії. Повертає масив помилок (порожній — якщо все добре).
 * partial = true — для редагування, коли можна передати лише частину полів.
 */
export function validateReview(input, { partial = false } = {}) {
  const errors = [];
  const { rating, text } = input ?? {};

  if (rating !== undefined || !partial) {
    if (!isValidRating(rating)) {
      errors.push({ field: 'rating', message: `Оцінка має бути цілим числом від ${MIN_RATING} до ${MAX_RATING}` });
    }
  }
  if (text !== undefined || !partial) {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (trimmed.length < REVIEW_TEXT_MIN || trimmed.length > REVIEW_TEXT_MAX) {
      errors.push({ field: 'text', message: `Текст рецензії — від ${REVIEW_TEXT_MIN} до ${REVIEW_TEXT_MAX} символів` });
    }
  }
  if (partial && rating === undefined && text === undefined) {
    errors.push({ field: 'body', message: 'Немає полів для оновлення' });
  }
  return errors;
}

/**
 * Чи може користувач написати рецензію на гру: лише якщо гра є в його бібліотеці
 * (з будь-яким статусом). libraryEntry — запис бібліотеки або null.
 */
export function canReviewGame(libraryEntry) {
  return Boolean(libraryEntry);
}

/** Чи може користувач змінювати / видаляти рецензію. */
export function canModifyReview(review, user) {
  if (!review || !user) return false;
  return review.userId === user.id || user.role === 'ADMIN';
}
