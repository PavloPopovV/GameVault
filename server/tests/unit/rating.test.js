import { describe, it, expect } from 'vitest';
import { calculateAverageRating, isValidRating } from '../../src/domain/rating.js';

describe('calculateAverageRating', () => {
  it('рахує середнє й округлює до 1 знака (позитивний)', () => {
    // Arrange
    const ratings = [10, 9, 8];
    // Act
    const avg = calculateAverageRating(ratings);
    // Assert
    expect(avg).toBe(9);
  });

  it('округлює дробове середнє', () => {
    expect(calculateAverageRating([10, 9, 6])).toBe(8.3);
    expect(calculateAverageRating([7, 8])).toBe(7.5);
  });

  it('повертає null для порожнього масиву (edge case)', () => {
    expect(calculateAverageRating([])).toBeNull();
  });

  it('повертає null, якщо передано не масив (негативний)', () => {
    expect(calculateAverageRating(null)).toBeNull();
    expect(calculateAverageRating(undefined)).toBeNull();
  });

  it('ігнорує некоректні оцінки', () => {
    expect(calculateAverageRating([10, 0, 11, 'x', 8])).toBe(9);
    expect(calculateAverageRating([0, 42])).toBeNull();
  });
});

describe('isValidRating', () => {
  it.each([1, 5, 10])('%i — допустима оцінка', (v) => expect(isValidRating(v)).toBe(true));
  it.each([0, 11, -1, 7.5, '8', null, NaN])('%s — недопустима оцінка', (v) => expect(isValidRating(v)).toBe(false));
});
