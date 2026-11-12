import bcrypt from 'bcrypt';
import { getDb, initializeSchema, closeDb } from '../config/db.js';

const SALT_ROUNDS = 10;

async function resetEmpty() {
  const db = getDb();

  db.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
    PRAGMA foreign_keys = ON;
  `);

  initializeSchema(db);

  const adminPasswordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'Admin',
    'admin@stockflow.com',
    adminPasswordHash,
    'admin'
  );

  console.log('Database reset to 0 products, 0 categories, and 0 transactions (demo admin ready).');
  closeDb();
}

resetEmpty().catch((err) => {
  console.error('Failed to reset empty database:', err);
  closeDb();
  process.exit(1);
});

