// Фото профілю: клієнт сам стискає зображення до 256×256 і надсилає data URL.
// Сервер перевіряє не лише заявлений MIME, а й «магічні байти» файлу,
// щоб під виглядом картинки не можна було зберегти й роздавати HTML чи скрипт.

export const AVATAR_MAX_BYTES = 200 * 1024;

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

const SIGNATURES = {
  'image/png': (b) => b.length > 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG',
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

/**
 * Розбирає data URL фото профілю.
 * Повертає { ok: true, mime, buffer } або { ok: false, message }.
 */
export function parseAvatarDataUrl(dataUrl) {
  const match = typeof dataUrl === 'string' ? DATA_URL_RE.exec(dataUrl) : null;
  if (!match) return { ok: false, message: 'Підтримуються лише зображення PNG, JPEG або WebP' };
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) return { ok: false, message: 'Порожній файл' };
  if (buffer.length > AVATAR_MAX_BYTES) return { ok: false, message: 'Фото завелике — максимум 200 КБ' };
  if (!SIGNATURES[mime](buffer)) return { ok: false, message: 'Вміст файлу не відповідає формату зображення' };
  return { ok: true, mime, buffer };
}

/** Публічна адреса фото з версією (щоб браузер не показував старе фото з кешу). */
export function avatarPath(userId, updatedAt) {
  if (!updatedAt) return null;
  return `/api/v1/users/${userId}/avatar?v=${new Date(updatedAt).getTime()}`;
}
