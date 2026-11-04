import { describe, it, expect } from 'vitest';
import { slugify } from '../../src/utils/slug.js';

describe('slugify', () => {
  it('перетворює назву гри на URL-slug', () => {
    expect(slugify('The Witcher 3: Wild Hunt')).toBe('the-witcher-3-wild-hunt');
  });
  it('прибирає діакритику та спецсимволи', () => {
    expect(slugify('God of War Ragnarök')).toBe('god-of-war-ragnarok');
    expect(slugify("Baldur's Gate 3")).toBe('baldur-s-gate-3');
  });
  it('зберігає кирилицю та обрізає дефіси по краях (edge case)', () => {
    expect(slugify('  —Козаки 3!  ')).toBe('козаки-3');
  });
  it('обмежує довжину 160 символами', () => {
    expect(slugify('a'.repeat(300))).toHaveLength(160);
  });
});
