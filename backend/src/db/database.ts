import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Execute raw SQL query helper
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] Executed in ${duration}ms | Rows: ${res.rowCount}`);
    }
    return res.rows;
  } catch (error) {
    console.warn('[SQL Error]', error);
    throw error;
  }
}

/**
 * Initialize Database Connection and run schema.sql
 */
export async function initDatabase(): Promise<boolean> {
  try {
    const client = await pool.connect();
    console.log('[PostgreSQL] Connected to Supabase Database successfully.');
    client.release();
    return true;
  } catch (error) {
    console.warn('[PostgreSQL Warning] Could not connect to database. Operating in In-Memory Mode.', error);
    return false;
  }
}
