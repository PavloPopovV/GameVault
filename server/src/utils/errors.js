export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new AppError(400, msg, details);
export const unauthorized = (msg = 'Потрібна авторизація') => new AppError(401, msg);
export const forbidden = (msg = 'Недостатньо прав') => new AppError(403, msg);
export const notFound = (msg = 'Не знайдено') => new AppError(404, msg);
export const conflict = (msg) => new AppError(409, msg);
