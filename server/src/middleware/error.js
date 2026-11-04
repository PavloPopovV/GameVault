import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Маршрут ${req.method} ${req.originalUrl} не знайдено` });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Некоректний JSON у тілі запиту' });
  }
  // Порушення UNIQUE у PostgreSQL
  if (err?.code === '23505' || err?.cause?.code === '23505') {
    return res.status(409).json({ message: 'Такий запис уже існує' });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ message: 'Внутрішня помилка сервера' });
}
