export const STATUSES = [
  { value: 'WANT_TO_PLAY', label: 'Хочу пройти' },
  { value: 'PLAYING', label: 'Граю' },
  { value: 'COMPLETED', label: 'Пройдено' },
  { value: 'DROPPED', label: 'Закинув' },
];
export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label ?? v;

export function pluralUk(n, [one, few, many]) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}
