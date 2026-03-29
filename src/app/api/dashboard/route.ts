import { NextResponse } from 'next/server';
import { initDB, query, queryOne } from '@/lib/db';
import { SolveStatusType } from '@/lib/types';

export async function GET() {
  await initDB();

  const statuses = await query<{
    user_id: number;
    problem_id: number;
    status: SolveStatusType;
  }>('SELECT user_id, problem_id, status FROM solve_status');

  const grid: Record<string, SolveStatusType> = {};
  for (const s of statuses) {
    grid[`${s.user_id}-${s.problem_id}`] = s.status;
  }

  const lastSync = await queryOne<{ synced_at: string }>(
    'SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1'
  );

  return NextResponse.json({
    grid,
    lastSynced: lastSync?.synced_at ?? null,
  });
}
