/**
 * Error type whose message is safe to show to the frontend.
 * Anything that is NOT an AppError is treated as an internal error and
 * is replaced with a generic message by the error handler in server.js.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message, code = 'BAD_REQUEST') =>
  new AppError(message, 400, code);

export const notFound = (message, code = 'NOT_FOUND') =>
  new AppError(message, 404, code);

export const unprocessable = (message, code = 'UNPROCESSABLE') =>
  new AppError(message, 422, code);

export const serviceUnavailable = (message, code = 'SERVICE_UNAVAILABLE') =>
  new AppError(message, 503, code);
