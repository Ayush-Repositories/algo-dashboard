import pg from 'pg';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'data.csv');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://algo:algo123@localhost:5432/algo_tracker',
});

function parseHandle(raw) {
  if (!raw || !raw.trim()) return null;
  return raw.split(',')[0].trim() || null;
}

async function seed() {
  const client = await pool.connect();
  try {
    // Create tables
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
        assigned_date DATE,
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

    // Import CSV
    const csv = readFileSync(CSV_PATH, 'utf-8');
    const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

    let imported = 0;
    for (const row of records) {
      const name = row['Name']?.trim();
      const roll_no = row['Roll no']?.trim() || null;
      const leetcode = parseHandle(row['Leetcode Username']);
      const codeforces = parseHandle(row['Codeforces Username']);
      const codechef = parseHandle(row['Codechef Username']);

      if (!name) continue;

      await client.query(
        `INSERT INTO users (name, roll_no, leetcode_handle, codeforces_handle, codechef_handle)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (roll_no) DO UPDATE SET
           name = EXCLUDED.name,
           leetcode_handle = EXCLUDED.leetcode_handle,
           codeforces_handle = EXCLUDED.codeforces_handle,
           codechef_handle = EXCLUDED.codechef_handle`,
        [name, roll_no, leetcode, codeforces, codechef]
      );
      imported++;
    }

    console.log(`Seeded ${imported} users from data.csv`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
