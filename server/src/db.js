import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'crm_user',
      password: String(process.env.DB_PASSWORD || 'crm_password'),
      database: process.env.DB_NAME || 'crm_db',
    };

export const pool = new Pool(dbConfig);

export async function query(text, params) {
  return pool.query(text, params);
}