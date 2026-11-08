import { getDb, initializeSchema, closeDb } from '../config/db.js';
import env from '../config/env.js';

const shouldReset = process.argv.includes('--reset');

function runInit() {
  const db = getDb();

  if (shouldReset) {
    console.log('Resetting existing database tables...');
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS users;
      PRAGMA foreign_keys = ON;
    `);
  }

  initializeSchema(db);
  console.log(`Database initialized successfully at: ${env.dbPath}`);
  closeDb();
}

runInit();

