export const MIN_RATING = 1;
export const MAX_RATING = 10;

/** Чи є значення допустимою оцінкою (ціле число 1..10). */
export function isValidRating(value) {
  return Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING;
}

/**
 * Середня оцінка гри, округлена до 1 знака після коми.
 * Повертає null, якщо оцінок немає.
 */
export function calculateAverageRating(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return null;
  const valid = ratings.filter(isValidRating);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}
