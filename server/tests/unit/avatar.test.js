import { describe, it, expect } from 'vitest';
import { parseAvatarDataUrl, avatarPath, AVATAR_MAX_BYTES } from '../../src/domain/avatar.js';

const toDataUrl = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const WEBP = [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), 0x56, 0x50];

describe('parseAvatarDataUrl', () => {
  it.each([
    ['image/png', PNG],
    ['image/jpeg', JPEG],
    ['image/webp', WEBP],
  ])('приймає коректний %s', (mime, bytes) => {
    const res = parseAvatarDataUrl(toDataUrl(mime, bytes));
    expect(res.ok).toBe(true);
    expect(res.mime).toBe(mime);
    expect(res.buffer.length).toBe(bytes.length);
  });

  it('відхиляє не data URL, інший MIME і SVG', () => {
    expect(parseAvatarDataUrl('https://example.com/a.png').ok).toBe(false);
    expect(parseAvatarDataUrl(undefined).ok).toBe(false);
    expect(parseAvatarDataUrl(toDataUrl('image/svg+xml', Buffer.from('<svg/>'))).ok).toBe(false);
  });

  it('відхиляє HTML під виглядом PNG (перевірка магічних байтів)', () => {
    const res = parseAvatarDataUrl(toDataUrl('image/png', Buffer.from('<html><script>alert(1)</script></html>')));
    expect(res).toEqual({ ok: false, message: 'Вміст файлу не відповідає формату зображення' });
  });

  it('відхиляє порожній і завеликий файл', () => {
    expect(parseAvatarDataUrl('data:image/png;base64,').ok).toBe(false);
    const big = Buffer.alloc(AVATAR_MAX_BYTES + 1);
    Buffer.from(JPEG).copy(big);
    expect(parseAvatarDataUrl(toDataUrl('image/jpeg', big)).message).toMatch(/завелике/);
  });
});

describe('avatarPath', () => {
  it('немає фото → null', () => expect(avatarPath('u1', null)).toBeNull());
  it('шлях з версією за часом оновлення', () => {
    expect(avatarPath('u1', '2026-11-04T10:00:00.000Z')).toBe(
      `/api/v1/users/u1/avatar?v=${Date.parse('2026-11-04T10:00:00.000Z')}`,
    );
  });
});
