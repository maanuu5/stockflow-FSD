import env from './config/env.js';
import { closeDb } from './config/db.js';
import { createApp } from './app.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`StockFlow API server running at http://localhost:${env.port}`);
});

function shutdown() {
  console.log('\nShutting down StockFlow server...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

