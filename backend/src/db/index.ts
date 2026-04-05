import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

export async function query(text: string, params?: unknown[]) {
  const res = await pool.query(text, params);
  return res;
}