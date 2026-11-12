import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(serverRoot, '.env') });

const isVercel = Boolean(process.env.VERCEL);

const defaultDbPath = isVercel
  ? path.join(os.tmpdir(), 'stockflow.db')
  : path.join(serverRoot, 'database', 'stockflow.db');

const env = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'stockflow_dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH
    ? path.resolve(serverRoot, process.env.DB_PATH)
    : defaultDbPath,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  isVercel,
};

export default env;
