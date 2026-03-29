import { NextResponse } from 'next/server';
import { initDB, execute, query } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  await initDB();

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const text = await file.text();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  let imported = 0;
  for (const row of records) {
    const name = row['Name']?.trim();
    const roll_no = row['Roll no']?.trim() || null;
    const leetcode = parseHandle(row['Leetcode Username']);
    const codeforces = parseHandle(row['Codeforces Username']);
    const codechef = parseHandle(row['Codechef Username']);

    if (!name) continue;

    await execute(
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

  const users = await query<User>('SELECT * FROM users ORDER BY name');
  return NextResponse.json({ imported, users });
}

function parseHandle(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  // Handle comma-separated multiple handles — use the first one
  const first = raw.split(',')[0].trim();
  return first || null;
}
