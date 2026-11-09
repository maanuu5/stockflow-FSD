import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { getDb } from '../config/db.js';
import { AppError, sendSuccess } from '../utils/apiResponse.js';

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !String(name).trim()) {
      throw new AppError('Full name is required.', 400);
    }
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new AppError('A valid email address is required.', 400);
    }
    if (!password || String(password).length < 6) {
      throw new AppError('Password must be at least 6 characters long.', 400);
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(String(name).trim(), cleanEmail, passwordHash, 'admin');

    const user = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    const token = signToken(user);

    return sendSuccess(
      res,
      { user, token },
      'Account registered successfully.',
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    const db = getDb();
    const userRow = db
      .prepare('SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?')
      .get(cleanEmail);

    if (!userRow) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(String(password), userRow.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      created_at: userRow.created_at,
    };

    const token = signToken(user);

    return sendSuccess(res, { user, token }, 'Logged in successfully.');
  } catch (err) {
    next(err);
  }
}

export function getMe(req, res, next) {
  try {
    return sendSuccess(res, { user: req.user }, 'Profile fetched successfully.');
  } catch (err) {
    next(err);
  }
}

export function updateProfile(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      throw new AppError('Name cannot be empty.', 400);
    }

    const db = getDb();
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).trim(), req.user.id);

    const updatedUser = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(req.user.id);

    return sendSuccess(res, { user: updatedUser }, 'Profile updated successfully.');
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required.', 400);
    }
    if (String(newPassword).length < 6) {
      throw new AppError('New password must be at least 6 characters long.', 400);
    }

    const db = getDb();
    const userRow = db
      .prepare('SELECT id, password_hash FROM users WHERE id = ?')
      .get(req.user.id);

    const isMatch = await bcrypt.compare(String(currentPassword), userRow.password_hash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    return sendSuccess(res, null, 'Password updated successfully.');
  } catch (err) {
    next(err);
  }
}

