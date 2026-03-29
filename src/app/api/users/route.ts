import { NextResponse } from 'next/server';
import { initDB, query, queryOne } from '@/lib/db';
import { User } from '@/lib/types';

export async function GET() {
  await initDB();
  const users = await query<User>('SELECT * FROM users ORDER BY name');
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  await initDB();
  const body = await req.json();
  const { name, roll_no, leetcode_handle, codeforces_handle, codechef_handle } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const user = await queryOne<User>(
    `INSERT INTO users (name, roll_no, leetcode_handle, codeforces_handle, codechef_handle)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, roll_no || null, leetcode_handle || null, codeforces_handle || null, codechef_handle || null]
  );

  return NextResponse.json(user, { status: 201 });
}
