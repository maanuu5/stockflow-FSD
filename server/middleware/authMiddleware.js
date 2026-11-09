import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/apiResponse.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError('Authentication token is missing.', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw new AppError('Invalid or expired authentication token.', 401);
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(decoded.userId);

    if (!user) {
      throw new AppError('User account no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

