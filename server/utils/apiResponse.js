export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  const payload = { success: true, message };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

export class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

