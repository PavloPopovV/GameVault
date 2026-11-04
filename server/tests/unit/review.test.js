import { describe, it, expect } from 'vitest';
import { validateReview, canModifyReview, canReviewGame, validateVote, toggleVote } from '../../src/domain/review.js';

const okText = 'Чудова гра, рекомендую всім!';

describe('validateReview', () => {
  it('приймає коректну рецензію (позитивний)', () => {
    // Arrange
    const input = { rating: 9, text: okText };
    // Act
    const errors = validateReview(input);
    // Assert
    expect(errors).toEqual([]);
  });

  it('повертає помилки для оцінки поза межами 1–10 і короткого тексту (негативний)', () => {
    const errors = validateReview({ rating: 11, text: 'коротко' });
    expect(errors.map((e) => e.field)).toEqual(['rating', 'text']);
  });

  it('текст рівно 10 символів після trim — допустимий (edge case)', () => {
    expect(validateReview({ rating: 1, text: '  1234567890  ' })).toEqual([]);
    expect(validateReview({ rating: 1, text: '123456789' })).toHaveLength(1);
  });

  it('відхиляє текст довший за 2000 символів', () => {
    expect(validateReview({ rating: 5, text: 'a'.repeat(2001) })[0].field).toBe('text');
  });

  it('відхиляє відсутні поля при створенні', () => {
    expect(validateReview(undefined)).toHaveLength(2);
    expect(validateReview({ rating: 5, text: 123 })[0].field).toBe('text');
  });

  it('у режимі partial перевіряє лише передані поля', () => {
    expect(validateReview({ rating: 7 }, { partial: true })).toEqual([]);
    expect(validateReview({ text: okText }, { partial: true })).toEqual([]);
    expect(validateReview({ rating: 0 }, { partial: true })[0].field).toBe('rating');
  });

  it('у режимі partial без полів повертає помилку body', () => {
    expect(validateReview({}, { partial: true })).toEqual([{ field: 'body', message: 'Немає полів для оновлення' }]);
  });
});

describe('canModifyReview', () => {
  const review = { id: 'r1', userId: 'u1' };

  it('автор може змінювати свою рецензію', () => {
    expect(canModifyReview(review, { id: 'u1', role: 'USER' })).toBe(true);
  });
  it('інший користувач — не може', () => {
    expect(canModifyReview(review, { id: 'u2', role: 'USER' })).toBe(false);
  });
  it('адміністратор може модерувати будь-яку рецензію', () => {
    expect(canModifyReview(review, { id: 'u3', role: 'ADMIN' })).toBe(true);
  });
  it('без рецензії або користувача — false', () => {
    expect(canModifyReview(null, { id: 'u1' })).toBe(false);
    expect(canModifyReview(review, null)).toBe(false);
  });
});

describe('canReviewGame (GV-21)', () => {
  it('гра в бібліотеці з будь-яким статусом — можна писати рецензію', () => {
    for (const status of ['WANT_TO_PLAY', 'PLAYING', 'COMPLETED', 'DROPPED']) {
      expect(canReviewGame({ gameId: 'g1', status })).toBe(true);
    }
  });
  it('гри немає в бібліотеці — не можна', () => {
    expect(canReviewGame(null)).toBe(false);
    expect(canReviewGame(undefined)).toBe(false);
  });
});

describe('голоси за рецензії', () => {
  const review = { id: 'r1', userId: 'author' };
  it('validateVote: 1 / -1 / 0 від іншого користувача — ок', () => {
    for (const v of [1, -1, 0]) expect(validateVote(review, { id: 'u2' }, v)).toBeNull();
  });
  it('validateVote: інше значення — помилка', () => {
    expect(validateVote(review, { id: 'u2' }, 2)).toMatch(/1, -1 або 0/);
  });
  it('validateVote: за власну рецензію — помилка', () => {
    expect(validateVote(review, { id: 'author' }, 1)).toMatch(/власну/);
  });
  it('toggleVote: повторний клік знімає голос, інший — перемикає', () => {
    expect(toggleVote(0, 1)).toBe(1);
    expect(toggleVote(1, 1)).toBe(0);
    expect(toggleVote(1, -1)).toBe(-1);
    expect(toggleVote(-1, -1)).toBe(0);
  });
});
