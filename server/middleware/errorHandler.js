import { AppError } from '../utils/apiResponse.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle SQLite constraint errors cleanly
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    if (message.includes('products.sku')) {
      message = 'A product with this SKU already exists.';
    } else if (message.includes('categories.name')) {
      message = 'A category with this name already exists.';
    } else if (message.includes('users.email')) {
      message = 'An account with this email already exists.';
    } else {
      message = 'Duplicate value violates a unique constraint.';
    }
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    statusCode = 400;
    message = 'Referenced record does not exist or cannot be removed while in use.';
  } else if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
    statusCode = 400;
    message = 'Submitted values violate database constraints (e.g., negative quantity or price).';
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Server Error]', err);
  }

  const response = {
    success: false,
    message,
  };

  if (err.details) {
    response.details = err.details;
  }

  return res.status(statusCode).json(response);
}

