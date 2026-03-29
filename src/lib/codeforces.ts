import { delay } from './leetcode';

const CF_API = 'https://codeforces.com/api';
const FETCH_TIMEOUT = 8000;

function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(timeout) });
}

interface CFSubmission {
  problem: {
    contestId: number;
    index: string;
    name: string;
  };
  verdict: string;
}

export async function fetchCodeforcesSubmissions(handle: string): Promise<{
  solved: Set<string>;
  attempted: Set<string>;
}> {
  try {
    const res = await fetchWithTimeout(
      `${CF_API}/user.status?handle=${encodeURIComponent(handle.trim())}`
    );
    if (!res.ok) return { solved: new Set(), attempted: new Set() };

    const data = await res.json();
    if (data.status !== 'OK') return { solved: new Set(), attempted: new Set() };

    const submissions = data.result as CFSubmission[];
    const solved = new Set<string>();
    const attempted = new Set<string>();

    for (const sub of submissions) {
      const key = `${sub.problem.contestId}${sub.problem.index}`;
      if (sub.verdict === 'OK') {
        solved.add(key);
      } else {
        attempted.add(key);
      }
    }

    for (const s of solved) {
      attempted.delete(s);
    }

    return { solved, attempted };
  } catch {
    console.error(`CF fetch failed for ${handle}`);
    return { solved: new Set(), attempted: new Set() };
  }
}

/**
 * Fetch submissions for multiple CF users in parallel with concurrency control.
 * Returns a Map of handle -> { solved, attempted } Sets.
 */
export async function fetchCodeforcesBatch(
  handles: string[],
  concurrency = 5
): Promise<Map<string, { solved: Set<string>; attempted: Set<string> }>> {
  const results = new Map<string, { solved: Set<string>; attempted: Set<string> }>();
  const unique = [...new Set(handles.map(h => h.trim().toLowerCase()))];
  const handleMap = new Map(handles.map(h => [h.trim().toLowerCase(), h.trim()]));

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (key) => {
        const handle = handleMap.get(key)!;
        const data = await fetchCodeforcesSubmissions(handle);
        return { key, data };
      })
    );
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.key, result.value.data);
      }
    }
    if (i + concurrency < unique.length) await delay(1000);
  }

  return results;
}

export async function fetchCodeforcesProblemInfo(contestId: number, index: string): Promise<{
  name: string;
  rating?: number;
} | null> {
  try {
    const res = await fetchWithTimeout(
      `${CF_API}/contest.standings?contestId=${contestId}&from=1&count=1`
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK') return null;

    const problem = data.result.problems.find(
      (p: { contestId: number; index: string; name: string; rating?: number }) =>
        p.index === index
    );

    return problem ? { name: problem.name, rating: problem.rating } : null;
  } catch {
    return null;
  }
}
