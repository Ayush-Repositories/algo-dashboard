import { NextResponse } from 'next/server';
import { initDB, query, queryOne } from '@/lib/db';
import { Problem } from '@/lib/types';
import { fetchLeetCodeProblemInfo } from '@/lib/leetcode';
import { fetchCodeforcesProblemInfo } from '@/lib/codeforces';

export async function GET() {
  await initDB();
  const problems = await query<Problem>('SELECT * FROM problems ORDER BY platform, id');
  return NextResponse.json(problems);
}

export async function POST(req: Request) {
  await initDB();
  const body = await req.json();
  const { platform, url } = body;
  let input: string = body.problem_id?.trim() || '';

  if (!platform || (!input && !url)) {
    return NextResponse.json({ error: 'platform and problem_id or url required' }, { status: 400 });
  }

  let problemId = '';
  let title = body.title || '';
  let difficulty = body.difficulty || null;
  let problemUrl = url || '';

  if (platform === 'leetcode') {
    // Extract slug from URL if it looks like a leetcode URL
    const slugFromUrl = extractLCSlug(input) || extractLCSlug(url);
    const slug = slugFromUrl || toSlug(input);

    // Fetch from LC API to validate and get title/difficulty
    const info = await fetchLeetCodeProblemInfo(slug);
    if (info) {
      problemId = info.titleSlug; // canonical slug
      title = title || info.title;
      difficulty = difficulty || info.difficulty;
      problemUrl = problemUrl || `https://leetcode.com/problems/${info.titleSlug}/`;
    } else {
      // Fallback: use the slug as-is
      problemId = slug;
      title = title || input;
      problemUrl = problemUrl || `https://leetcode.com/problems/${slug}/`;
    }
  } else if (platform === 'codeforces') {
    // Extract contestId + index from URL or input
    const cfParsed = parseCFProblem(input) || parseCFProblem(url);
    if (!cfParsed) {
      return NextResponse.json(
        { error: 'Could not parse CF problem. Use format like "1742C" or a CF problem URL.' },
        { status: 400 }
      );
    }

    problemId = `${cfParsed.contestId}${cfParsed.index}`;

    // Fetch title from CF API
    const info = await fetchCodeforcesProblemInfo(cfParsed.contestId, cfParsed.index);
    if (info) {
      title = title || info.name;
      difficulty = difficulty || (info.rating ? String(info.rating) : null);
    } else {
      title = title || problemId;
    }
    problemUrl = problemUrl || `https://codeforces.com/problemset/problem/${cfParsed.contestId}/${cfParsed.index}`;
  }

  const assignedDate = body.assigned_date || new Date().toISOString().split('T')[0];

  const problem = await queryOne<Problem>(
    `INSERT INTO problems (platform, problem_id, title, url, difficulty, assigned_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (platform, problem_id) DO UPDATE SET
       title = EXCLUDED.title,
       difficulty = EXCLUDED.difficulty,
       url = EXCLUDED.url,
       assigned_date = EXCLUDED.assigned_date
     RETURNING *`,
    [platform, problemId, title, problemUrl, difficulty, assignedDate]
  );

  return NextResponse.json(problem, { status: 201 });
}

/** Extract titleSlug from a LeetCode URL */
function extractLCSlug(input: string | undefined): string | null {
  if (!input) return null;
  // Match: leetcode.com/problems/two-sum/...
  const match = input.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Convert a human title like "Two Sum" or "count-primes" to a slug */
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Parse CF problem from "1742C", "1742/C", or a CF URL */
function parseCFProblem(input: string | undefined): { contestId: number; index: string } | null {
  if (!input) return null;

  // URL: codeforces.com/contest/1742/problem/C or codeforces.com/problemset/problem/1742/C
  const urlMatch = input.match(/codeforces\.com\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Z]\d?)/i);
  if (urlMatch) {
    return { contestId: parseInt(urlMatch[1]), index: urlMatch[2].toUpperCase() };
  }

  // Direct: "1742C" or "1742/C"
  const directMatch = input.replace(/\s/g, '').match(/^(\d+)\/?([A-Z]\d?)$/i);
  if (directMatch) {
    return { contestId: parseInt(directMatch[1]), index: directMatch[2].toUpperCase() };
  }

  return null;
}
