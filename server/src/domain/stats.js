import { LIBRARY_STATUSES } from './library.js';
import { calculateAverageRating } from './rating.js';

/** Статистика профілю гравця на основі його бібліотеки та рецензій. */
export function buildProfileStats(libraryEntries = [], reviews = [], wishlistCount = 0) {
  const byStatus = Object.fromEntries(LIBRARY_STATUSES.map((s) => [s, 0]));
  for (const entry of libraryEntries) {
    if (entry && entry.status in byStatus) byStatus[entry.status] += 1;
  }
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const completionRate = total === 0 ? 0 : Math.round((byStatus.COMPLETED / total) * 100);
  return {
    totalGames: total,
    byStatus,
    completionRate,
    reviewsCount: reviews.length,
    averageGivenRating: calculateAverageRating(reviews.map((r) => r.rating)),
    wishlistCount,
  };
}
