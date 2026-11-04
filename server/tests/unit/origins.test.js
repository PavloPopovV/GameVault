import { describe, it, expect } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from '../../src/utils/origins.js';

describe('CORS origins', () => {
  const allowed = parseAllowedOrigins(
    'https://gamevault-sandy-eta.vercel.app/, https://gamevault-*-pavlo-popov.vercel.app,http://localhost:5173',
  );

  it('пропускає точну адресу продакшн-сайту (слеш у кінці ігнорується)', () => {
    expect(isOriginAllowed('https://gamevault-sandy-eta.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
  });

  it('пропускає прев’ю-деплої Vercel за шаблоном', () => {
    expect(isOriginAllowed('https://gamevault-be7z6sc7z-pavlo-popov.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('https://gamevault-git-develop-pavlo-popov.vercel.app', allowed)).toBe(true);
  });

  it('блокує чужі домени й спроби обійти шаблон (негативний)', () => {
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false);
    expect(isOriginAllowed('https://gamevault-x.evil.com-pavlo-popov.vercel.app', allowed)).toBe(false);
    expect(isOriginAllowed('https://gamevault-abc-pavlo-popov.vercel.app.evil.com', allowed)).toBe(false);
  });

  it('запити без Origin (Postman, curl) дозволені', () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('порожній CLIENT_URL — жодного дозволеного Origin (edge case)', () => {
    expect(parseAllowedOrigins('')).toEqual([]);
    expect(parseAllowedOrigins()).toEqual([]);
    expect(isOriginAllowed('https://gamevault-sandy-eta.vercel.app', [])).toBe(false);
  });
});
