// Клієнтська валідація форм (дублює серверні правила для швидкого фідбеку)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthForm(mode, f) {
  const e = {};
  if (mode === 'register' && !/^[a-zA-Z0-9_]{3,32}$/.test(f.username)) e.username = 'Нікнейм: 3–32 символи (латиниця, цифри, _)';
  if (!EMAIL_RE.test(f.email)) e.email = 'Введіть коректний Email';
  if (mode === 'register' && f.password.length < 8) e.password = 'Мінімум 8 символів';
  if (mode === 'login' && !f.password) e.password = 'Введіть пароль';
  if (mode === 'register' && f.password !== f.confirm) e.confirm = 'Паролі не збігаються';
  return e;
}

export function validateReview({ rating, text }) {
  const e = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) e.rating = 'Оберіть оцінку від 1 до 10';
  const len = text.trim().length;
  if (len < 10 || len > 2000) e.text = 'Текст рецензії — від 10 до 2000 символів';
  return e;
}
