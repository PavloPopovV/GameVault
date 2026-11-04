// Готуємо фото профілю на клієнті: квадрат по центру, 256×256, JPEG ~85%.
// Так на сервер іде ~20–40 КБ замість кількох МБ з телефона.
export const AVATAR_SIZE = 256;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не вдалося прочитати зображення')); };
    img.src = url;
  });
}

export async function prepareAvatar(file) {
  if (!file.type.startsWith('image/')) throw new Error('Оберіть файл зображення (JPG, PNG, WebP)');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Файл завеликий — максимум 10 МБ');
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#19191b'; // фон під прозорі PNG
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL('image/jpeg', 0.85);
}
