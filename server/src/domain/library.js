export const LIBRARY_STATUSES = ['WANT_TO_PLAY', 'PLAYING', 'COMPLETED', 'DROPPED'];

export const STATUS_LABELS = {
  WANT_TO_PLAY: 'Хочу пройти',
  PLAYING: 'Граю',
  COMPLETED: 'Пройдено',
  DROPPED: 'Закинув',
};

export function isValidStatus(status) {
  return LIBRARY_STATUSES.includes(status);
}

/**
 * Обчислює нові поля запису бібліотеки при зміні статусу.
 * - перехід у COMPLETED фіксує дату завершення (якщо її ще немає);
 * - перехід з COMPLETED в інший статус скидає дату завершення.
 */
export function applyStatusChange(entry, nextStatus, now = new Date()) {
  if (!isValidStatus(nextStatus)) {
    throw new Error(`Невідомий статус: ${nextStatus}`);
  }
  const current = entry ?? { status: null, completedAt: null };
  if (nextStatus === 'COMPLETED') {
    return {
      status: nextStatus,
      completedAt: current.status === 'COMPLETED' && current.completedAt ? current.completedAt : now,
    };
  }
  return { status: nextStatus, completedAt: null };
}
