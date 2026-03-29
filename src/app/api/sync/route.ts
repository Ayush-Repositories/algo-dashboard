import { NextResponse } from 'next/server';
import { initDB, query, execute, queryOne, pool } from '@/lib/db';
import { User, Problem } from '@/lib/types';
import { fetchLeetCodeBatch } from '@/lib/leetcode';
import { fetchCodeforcesBatch } from '@/lib/codeforces';

export const maxDuration = 120;

export async function POST() {
  await initDB();

  const [users, problems] = await Promise.all([
    query<User>('SELECT * FROM users'),
    query<Problem>('SELECT * FROM problems'),
  ]);

  const lcProblems = problems.filter(p => p.platform === 'leetcode');
  const cfProblems = problems.filter(p => p.platform === 'codeforces');

  // Collect handles to fetch (skip nulls)
  const lcHandles = users
    .filter(u => u.leetcode_handle && lcProblems.length > 0)
    .map(u => u.leetcode_handle!);
  const cfHandles = users
    .filter(u => u.codeforces_handle && cfProblems.length > 0)
    .map(u => u.codeforces_handle!);

  // Fetch LC and CF submissions in parallel
  const [lcResults, cfResults] = await Promise.all([
    lcHandles.length > 0 ? fetchLeetCodeBatch(lcHandles) : new Map(),
    cfHandles.length > 0 ? fetchCodeforcesBatch(cfHandles) : new Map(),
  ]);

  // Build all upsert rows: [userId, problemId, status]
  const rows: [number, number, string][] = [];

  for (const user of users) {
    // LeetCode statuses
    if (user.leetcode_handle && lcProblems.length > 0) {
      const key = user.leetcode_handle.trim().toLowerCase();
      const solvedSet = lcResults.get(key);
      for (const problem of lcProblems) {
        const status = solvedSet?.has(problem.problem_id) ? 'solved' : 'unsolved';
        rows.push([user.id, problem.id, status]);
      }
    }

    // CodeForces statuses
    if (user.codeforces_handle && cfProblems.length > 0) {
      const key = user.codeforces_handle.trim().toLowerCase();
      const cfData = cfResults.get(key);
      for (const problem of cfProblems) {
        let status = 'unsolved';
        if (cfData?.solved.has(problem.problem_id)) {
          status = 'solved';
        } else if (cfData?.attempted.has(problem.problem_id)) {
          status = 'attempted';
        }
        rows.push([user.id, problem.id, status]);
      }
    }
  }

  // Bulk upsert in chunks of 500 using unnest
  if (rows.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const userIds = chunk.map(r => r[0]);
      const problemIds = chunk.map(r => r[1]);
      const statuses = chunk.map(r => r[2]);

      await execute(
        `INSERT INTO solve_status (user_id, problem_id, status, solved_at, updated_at)
         SELECT u, p, s,
           CASE WHEN s = 'solved' THEN NOW() ELSE NULL END,
           NOW()
         FROM unnest($1::int[], $2::int[], $3::text[]) AS t(u, p, s)
         ON CONFLICT (user_id, problem_id) DO UPDATE SET
           status = CASE
             WHEN solve_status.status = 'solved' THEN 'solved'
             WHEN EXCLUDED.status = 'solved' THEN 'solved'
             WHEN solve_status.status = 'attempted' THEN 'attempted'
             ELSE EXCLUDED.status
           END,
           solved_at = CASE
             WHEN solve_status.status = 'solved' THEN solve_status.solved_at
             WHEN EXCLUDED.status = 'solved' THEN NOW()
             ELSE solve_status.solved_at
           END,
           updated_at = NOW()`,
        [userIds, problemIds, statuses]
      );
    }
  }

  await execute('INSERT INTO sync_log DEFAULT VALUES');
  const lastSync = await queryOne<{ synced_at: string }>(
    'SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1'
  );

  return NextResponse.json({
    success: true,
    synced: users.length,
    lastSynced: lastSync?.synced_at,
  });
}
