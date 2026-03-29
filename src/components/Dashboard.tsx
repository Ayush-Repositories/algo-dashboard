'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Problem, SolveStatusType } from '@/lib/types';
import StatusCell from './StatusCell';

type PlatformFilter = 'all' | 'leetcode' | 'codeforces';

function getDifficultyScore(difficulty: string | null): number {
  if (!difficulty) return 2;
  const d = difficulty.toLowerCase();
  if (d === 'easy') return 1;
  if (d === 'medium') return 3;
  if (d === 'hard') return 5;
  const rating = parseInt(difficulty);
  if (!isNaN(rating)) return Math.max(1, Math.round(rating / 400));
  return 2;
}

function formatDate(dateStr: string): string {
  const cleaned = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [grid, setGrid] = useState<Record<string, SolveStatusType>>({});
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<PlatformFilter>('all');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, problemsRes, gridRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/problems'),
        fetch('/api/dashboard'),
      ]);
      setUsers(await usersRes.json());
      setProblems(await problemsRes.json());
      if (gridRes.ok) {
        const dashData = await gridRes.json();
        setGrid(dashData.grid);
        setLastSynced(dashData.lastSynced);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetch('/api/auth').then(r => r.json()).then(d => setIsAdmin(d.authenticated)).catch(() => {});
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      setLastSynced(data.lastSynced);
      await fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const filteredProblems = problems.filter(
    p => filter === 'all' || p.platform === filter
  );

  const userScores = users.map(user => {
    let score = 0;
    let solved = 0;
    for (const problem of filteredProblems) {
      const status = grid[`${user.id}-${problem.id}`] || 'unsolved';
      if (status === 'solved') {
        solved++;
        score += getDifficultyScore(problem.difficulty);
      }
    }
    return { user, score, solved };
  });

  userScores.sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name));

  const sortedUsers = userScores.map(s => s.user);
  const scoreMap = new Map(userScores.map(s => [s.user.id, s]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-neon)] animate-pulse tracking-widest uppercase text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider">Filter:</span>
          {(['all', 'leetcode', 'codeforces'] as PlatformFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 border text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? 'border-[var(--color-neon)] text-[var(--color-neon)] bg-[var(--color-neon-dim)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-neon)] hover:border-[var(--color-border-bright)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
              Synced: {new Date(lastSynced).toLocaleString()}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-1.5 border-2 border-[var(--color-neon)] text-[var(--color-neon)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-neon)] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {syncing && (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border border-[var(--color-neon)] bg-[var(--color-neon-dim)]" />
          <span>Solved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border border-[var(--color-border)]" />
          <span>Unsolved</span>
        </div>
        <span className="text-[var(--color-text-dim)]">// Easy=1 Med=3 Hard=5</span>
      </div>

      {/* Grid */}
      {filteredProblems.length === 0 || users.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-dim)] border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-[12px]">
          <p className="uppercase tracking-wider text-sm">
            {users.length === 0
              ? '> No users loaded. Import via admin panel.'
              : '> No problems added. Configure via admin panel.'}
          </p>
        </div>
      ) : (
        <div className="overflow-auto border-2 border-[var(--color-border)]">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface)] backdrop-blur-[12px] h-14">
                <th className="sticky left-0 bg-[var(--color-base)] z-10 px-3 text-left text-[10px] font-bold text-[var(--color-neon)] uppercase tracking-wider w-[230px] min-w-[230px] border-b-2 border-r border-[var(--color-border)]">
                  <div className="flex items-center">
                    <span className="w-6 shrink-0">#</span>
                    <span className="flex-1">Member</span>
                    <span className="w-10 text-right shrink-0">Pts</span>
                  </div>
                </th>
                {filteredProblems.map(problem => (
                  <th
                    key={problem.id}
                    className="px-1 text-center text-[10px] font-bold text-[var(--color-text-dim)] w-[72px] min-w-[72px] border-b-2 border-[var(--color-border)]"
                  >
                    <a
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--color-neon)] transition-colors"
                      title={`${problem.title} (${problem.difficulty || problem.platform})`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`text-[9px] px-1 py-0.5 border font-bold ${
                            problem.platform === 'leetcode'
                              ? 'border-orange-500/40 text-orange-400'
                              : 'border-cyan-500/40 text-cyan-400'
                          }`}
                        >
                          {problem.platform === 'leetcode' ? 'LC' : 'CF'}
                        </span>
                        <span className="w-16 truncate text-[10px]">{problem.title}</span>
                        {problem.assigned_date && (
                          <span className="text-[9px] text-[var(--color-text-dim)] opacity-60">{formatDate(problem.assigned_date)}</span>
                        )}
                      </div>
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, idx) => {
                const info = scoreMap.get(user.id)!;
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                <tr
                  key={user.id}
                  className={`h-10 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-neon-dim)] ${
                    isTop3 ? 'bg-[var(--color-surface)]' : ''
                  }`}
                >
                  <td className="sticky left-0 z-10 px-3 w-[230px] min-w-[230px] border-r border-[var(--color-border)] bg-[var(--color-base)]"
                  >
                    <div className="flex items-center">
                      <span className={`w-6 shrink-0 text-xs font-bold ${
                        rank === 1 ? 'text-[var(--color-neon)]' :
                        rank === 2 ? 'text-[var(--color-neon)] opacity-70' :
                        rank === 3 ? 'text-[var(--color-neon)] opacity-50' :
                        'text-[var(--color-text-dim)]'
                      }`}>
                        {rank}
                      </span>
                      <span
                        className={`flex-1 min-w-0 text-sm truncate ${
                          isTop3 ? 'text-[var(--color-text)] font-bold' : 'text-[var(--color-text)]'
                        }`}
                        title={`${user.name} — ${info.solved} solved`}
                      >
                        {user.name}
                      </span>
                      <span className={`w-10 text-right shrink-0 text-sm font-bold ${
                        info.score > 0 ? 'text-[var(--color-neon)]' : 'text-[var(--color-text-dim)]'
                      }`}>
                        {info.score}
                      </span>
                    </div>
                  </td>
                  {filteredProblems.map(problem => {
                    const key = `${user.id}-${problem.id}`;
                    const status = grid[key] || 'unsolved';
                    return (
                      <td key={problem.id} className="px-1 text-center w-[72px] min-w-[72px]">
                        <StatusCell status={status} />
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <div className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
        {users.length} members // {filteredProblems.length} problems // {userScores.reduce((a, b) => a + b.solved, 0)} total solves
      </div>
    </div>
  );
}
