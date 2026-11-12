import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../database/schema.sql');

let dbInstance = null;

/**
 * Ensures the SQLite database directory exists, opens a persistent connection,
 * and configures foreign keys and WAL journal mode.
 */
export function getDb(customPath) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || env.dbPath;
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(targetPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

/**
 * Runs schema.sql to create tables and indexes if they do not exist.
 */
export function initializeSchema(db = getDb()) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);
  return db;
}

/**
 * Ensures the default demo admin account exists when starting with a fresh database
 * (including ephemeral cold starts on Vercel) without adding any preset products.
 */
export function ensureDemoAdmin(db = getDb()) {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('Admin', 'admin@stockflow.com', hash, 'admin');
  }
}

/**
 * Closes the cached database instance (useful for clean shutdown and tests).
 */
export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export default getDb;
