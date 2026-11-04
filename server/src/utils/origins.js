// Перевірка Origin для CORS.
// CLIENT_URL може містити кілька адрес через кому та шаблони з «*»,
// наприклад: https://gamevault-sandy-eta.vercel.app,https://gamevault-*-pavlo-popov.vercel.app
// «*» відповідає одному сегменту з літер, цифр і дефісів (без крапок і слешів).

const escape = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

export function parseAllowedOrigins(value = '') {
  return value
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map((origin) =>
      origin.includes('*') ? new RegExp(`^${escape(origin).replace(/\*/g, '[a-z0-9-]+')}$`, 'i') : origin,
    );
}

export function isOriginAllowed(origin, allowed) {
  if (!origin) return true; // запити без Origin (curl, Postman, health-check)
  return allowed.some((rule) => (rule instanceof RegExp ? rule.test(origin) : rule === origin));
}
