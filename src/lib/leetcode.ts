const LC_GRAPHQL = 'https://leetcode.com/graphql';
const FETCH_TIMEOUT = 8000;

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchWithTimeout(url: string, options: RequestInit, timeout = FETCH_TIMEOUT): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
}

export async function fetchLeetCodeSubmissions(username: string): Promise<string[]> {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        titleSlug
      }
    }
  `;

  try {
    const res = await fetchWithTimeout(LC_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { username: username.trim(), limit: 200 },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const submissions = data?.data?.recentAcSubmissionList;
    if (!submissions) return [];

    return [...new Set(submissions.map((s: { titleSlug: string }) => s.titleSlug))] as string[];
  } catch {
    console.error(`LC fetch failed for ${username}`);
    return [];
  }
}

/**
 * Fetch submissions for multiple LC users in parallel with concurrency control.
 * Returns a Map of handle -> Set of solved titleSlugs.
 */
export async function fetchLeetCodeBatch(
  handles: string[],
  concurrency = 10
): Promise<Map<string, Set<string>>> {
  const results = new Map<string, Set<string>>();
  const unique = [...new Set(handles.map(h => h.trim().toLowerCase()))];
  const handleMap = new Map(handles.map(h => [h.trim().toLowerCase(), h.trim()]));

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (key) => {
        const handle = handleMap.get(key)!;
        const slugs = await fetchLeetCodeSubmissions(handle);
        return { key, slugs };
      })
    );
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.key, new Set(result.value.slugs));
      }
    }
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < unique.length) await delay(500);
  }

  return results;
}

export async function fetchLeetCodeProblemInfo(titleSlug: string): Promise<{
  title: string;
  difficulty: string;
  titleSlug: string;
} | null> {
  const query = `
    query questionInfo($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        difficulty
        titleSlug
      }
    }
  `;

  try {
    const res = await fetchWithTimeout(LC_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { titleSlug } }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.question ?? null;
  } catch {
    return null;
  }
}
