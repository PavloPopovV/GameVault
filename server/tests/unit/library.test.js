import { describe, it, expect } from 'vitest';
import {
  applyStatusChange,
  canAddToWishlist,
  isValidStatus,
  LIBRARY_STATUSES,
  STATUS_LABELS,
} from '../../src/domain/library.js';

const NOW = new Date('2026-11-05T12:00:00Z');
const EARLIER = new Date('2026-10-01T10:00:00Z');

describe('applyStatusChange', () => {
  it('нова гра зі статусом «Хочу пройти» — без дати завершення (позитивний)', () => {
    // Arrange / Act
    const res = applyStatusChange(null, 'WANT_TO_PLAY', NOW);
    // Assert
    expect(res).toEqual({ status: 'WANT_TO_PLAY', completedAt: null });
  });

  it('перехід у «Пройдено» фіксує дату завершення', () => {
    expect(applyStatusChange({ status: 'PLAYING', completedAt: null }, 'COMPLETED', NOW)).toEqual({
      status: 'COMPLETED',
      completedAt: NOW,
    });
  });

  it('повторне «Пройдено» не змінює першу дату завершення (edge case)', () => {
    expect(applyStatusChange({ status: 'COMPLETED', completedAt: EARLIER }, 'COMPLETED', NOW).completedAt).toBe(
      EARLIER,
    );
  });

  it('вихід зі статусу «Пройдено» скидає дату', () => {
    expect(applyStatusChange({ status: 'COMPLETED', completedAt: EARLIER }, 'PLAYING', NOW)).toEqual({
      status: 'PLAYING',
      completedAt: null,
    });
  });

  it('за замовчуванням бере поточний час', () => {
    const res = applyStatusChange(undefined, 'COMPLETED');
    expect(res.completedAt).toBeInstanceOf(Date);
  });

  it('кидає помилку на невідомий статус (негативний)', () => {
    expect(() => applyStatusChange(null, 'FINISHED')).toThrow('Невідомий статус: FINISHED');
  });
});

describe('isValidStatus', () => {
  it('усі 4 статуси допустимі й мають підписи', () => {
    for (const s of LIBRARY_STATUSES) {
      expect(isValidStatus(s)).toBe(true);
      expect(STATUS_LABELS[s]).toBeTypeOf('string');
    }
  });
  it('інші значення — недопустимі', () => {
    expect(isValidStatus('playing')).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
  });
});

describe('canAddToWishlist (GV-27)', () => {
  it('гру, якої немає в бібліотеці, можна додати у Wishlist (позитивний)', () => {
    expect(canAddToWishlist(null)).toBe(true);
    expect(canAddToWishlist(undefined)).toBe(true);
  });

  it('гру з бібліотеки — не можна, незалежно від статусу (негативний)', () => {
    // Arrange
    const entries = ['WANT_TO_PLAY', 'PLAYING', 'COMPLETED', 'DROPPED'].map((status) => ({ id: 'e1', status }));
    // Act + Assert
    for (const entry of entries) expect(canAddToWishlist(entry)).toBe(false);
  });
});
