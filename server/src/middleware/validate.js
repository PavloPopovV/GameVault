import { badRequest } from '../utils/errors.js';

/** Валідує req[source] за zod-схемою і замінює його розпарсеними даними. */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.') || source, message: i.message }));
      return next(badRequest(details[0]?.message || 'Некоректні дані', details));
    }
    req[source] = result.data;
    next();
  };
