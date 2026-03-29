import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        roll_no TEXT UNIQUE,
        leetcode_handle TEXT,
        codeforces_handle TEXT,
        codechef_handle TEXT
      );

      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL CHECK(platform IN ('leetcode','codeforces')),
        problem_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        difficulty TEXT,
        UNIQUE(platform, problem_id)
      );

      ALTER TABLE problems ADD COLUMN IF NOT EXISTS assigned_date DATE;

      CREATE TABLE IF NOT EXISTS solve_status (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('solved','attempted','unsolved')),
        solved_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, problem_id)
      );

      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

// Query helpers
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const res = await pool.query(text, params);
  return (res.rows[0] as T) ?? null;
}

export async function execute(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export { pool };
