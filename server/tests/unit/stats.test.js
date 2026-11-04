import { describe, it, expect } from 'vitest';
import { buildProfileStats } from '../../src/domain/stats.js';

describe('buildProfileStats', () => {
  it('рахує ігри за статусами, % пройдених і середню оцінку (позитивний)', () => {
    // Arrange
    const entries = [{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'PLAYING' }, { status: 'DROPPED' }];
    const reviews = [{ rating: 10 }, { rating: 7 }];
    // Act
    const stats = buildProfileStats(entries, reviews, 3);
    // Assert
    expect(stats).toEqual({
      totalGames: 4,
      byStatus: { WANT_TO_PLAY: 0, PLAYING: 1, COMPLETED: 2, DROPPED: 1 },
      completionRate: 50,
      reviewsCount: 2,
      averageGivenRating: 8.5,
      wishlistCount: 3,
    });
  });

  it('новий користувач без даних — нулі й null (edge case)', () => {
    const stats = buildProfileStats();
    expect(stats.totalGames).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.averageGivenRating).toBeNull();
    expect(stats.wishlistCount).toBe(0);
  });

  it('ігнорує записи з невідомим статусом (негативний)', () => {
    const stats = buildProfileStats([{ status: 'UNKNOWN' }, null, { status: 'PLAYING' }], []);
    expect(stats.totalGames).toBe(1);
  });

  it('округлює відсоток пройдених', () => {
    const entries = [{ status: 'COMPLETED' }, { status: 'PLAYING' }, { status: 'PLAYING' }];
    expect(buildProfileStats(entries, []).completionRate).toBe(33);
  });
});
