'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Problem } from '@/lib/types';

function formatAdminDate(dateStr: string): string {
  const cleaned = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const input = 'w-full px-3 py-2 bg-transparent border-2 border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-neon)] transition-colors';
const card = 'bg-[var(--color-surface)] backdrop-blur-[12px] border-2 border-[var(--color-border)] p-4 space-y-3';
const btn = 'px-4 py-2 border-2 border-[var(--color-neon)] text-[var(--color-neon)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-neon)] hover:text-black transition-all disabled:opacity-40';
const btnDanger = 'text-red-400 hover:text-black hover:bg-red-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-red-400/30 hover:border-red-400 transition-all';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [importing, setImporting] = useState(false);
  const [addingProblem, setAddingProblem] = useState(false);
  const [problemError, setProblemError] = useState('');

  const [newUser, setNewUser] = useState({
    name: '', roll_no: '', leetcode_handle: '', codeforces_handle: '', codechef_handle: '',
  });

  const [newProblem, setNewProblem] = useState({
    platform: 'leetcode' as 'leetcode' | 'codeforces',
    problem_id: '',
    assigned_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    const [usersRes, problemsRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/problems'),
    ]);
    setUsers(await usersRes.json());
    setProblems(await problemsRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/users/import', { method: 'POST', body: formData });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name) return;
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setNewUser({ name: '', roll_no: '', leetcode_handle: '', codeforces_handle: '', codechef_handle: '' });
      fetchData();
    }
  };

  const handleDeleteUser = async (id: number) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProblem.problem_id) return;
    setAddingProblem(true);
    setProblemError('');
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProblem),
      });
      if (res.ok) {
        setNewProblem({ platform: newProblem.platform, problem_id: '', assigned_date: new Date().toISOString().split('T')[0] });
        fetchData();
      } else {
        const data = await res.json();
        setProblemError(data.error || 'Failed to add problem');
      }
    } finally {
      setAddingProblem(false);
    }
  };

  const handleDeleteProblem = async (id: number) => {
    await fetch(`/api/problems/${id}`, { method: 'DELETE' });
    setProblems(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Users */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[var(--color-neon)] uppercase tracking-widest">
          Members ({users.length})
        </h2>

        <div className={card}>
          <label className="block text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">Import CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            disabled={importing}
            className="block w-full text-xs text-[var(--color-text-dim)] file:mr-3 file:py-1.5 file:px-3 file:border-2 file:border-[var(--color-neon)] file:bg-transparent file:text-[var(--color-neon)] file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:cursor-pointer hover:file:bg-[var(--color-neon)] hover:file:text-black file:transition-all disabled:opacity-40"
          />
          {importing && <p className="text-[10px] text-[var(--color-neon)] animate-pulse">{'>'} Importing...</p>}
        </div>

        <form onSubmit={handleAddUser} className={card}>
          <label className="block text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">Add Member</label>
          <input placeholder="> name *" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="> roll no" value={newUser.roll_no} onChange={e => setNewUser({ ...newUser, roll_no: e.target.value })} className={input} />
            <input placeholder="> leetcode" value={newUser.leetcode_handle} onChange={e => setNewUser({ ...newUser, leetcode_handle: e.target.value })} className={input} />
            <input placeholder="> codeforces" value={newUser.codeforces_handle} onChange={e => setNewUser({ ...newUser, codeforces_handle: e.target.value })} className={input} />
            <input placeholder="> codechef" value={newUser.codechef_handle} onChange={e => setNewUser({ ...newUser, codechef_handle: e.target.value })} className={input} />
          </div>
          <button type="submit" className={btn}>{'>'} Add Member</button>
        </form>

        <div className="border-2 border-[var(--color-border)] divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
          {users.map(user => (
            <div key={user.id} className="px-3 py-2 flex items-center justify-between hover:bg-[var(--color-neon-dim)] transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--color-text)]">{user.name}</span>
                  <span className="text-[10px] text-[var(--color-text-dim)]">{user.roll_no}</span>
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)]">
                  {user.leetcode_handle && <span className="text-orange-400">lc:{user.leetcode_handle}</span>}
                  {user.leetcode_handle && user.codeforces_handle && <span className="mx-1">|</span>}
                  {user.codeforces_handle && <span className="text-cyan-400">cf:{user.codeforces_handle}</span>}
                </div>
              </div>
              <button onClick={() => handleDeleteUser(user.id)} className={btnDanger}>[x]</button>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-3 py-6 text-center text-[var(--color-text-dim)] text-xs uppercase tracking-wider">{'>'} No members loaded</div>
          )}
        </div>
      </div>

      {/* Problems */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[var(--color-neon)] uppercase tracking-widest">
          Problems ({problems.length})
        </h2>

        <form onSubmit={handleAddProblem} className={card}>
          <label className="block text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">Add Problem</label>
          <p className="text-[10px] text-[var(--color-text-dim)]">// Paste URL or slug. Title auto-fetched.</p>
          <div className="flex gap-2">
            <div className="flex shrink-0">
              <button
                type="button"
                onClick={() => setNewProblem({ ...newProblem, platform: 'leetcode' })}
                className={`px-3 py-2 border-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  newProblem.platform === 'leetcode'
                    ? 'border-orange-400 text-orange-400 bg-orange-400/10'
                    : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-orange-400/50'
                }`}
              >
                LC
              </button>
              <button
                type="button"
                onClick={() => setNewProblem({ ...newProblem, platform: 'codeforces' })}
                className={`px-3 py-2 border-2 border-l-0 text-xs font-bold uppercase tracking-wider transition-all ${
                  newProblem.platform === 'codeforces'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                    : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-cyan-400/50'
                }`}
              >
                CF
              </button>
            </div>
            <input
              placeholder={newProblem.platform === 'leetcode'
                ? '> url or slug (two-sum)'
                : '> url or id (1742C)'}
              value={newProblem.problem_id}
              onChange={e => setNewProblem({ ...newProblem, problem_id: e.target.value })}
              className={`flex-1 ${input}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">Date:</label>
            <input
              type="date"
              value={newProblem.assigned_date}
              onChange={e => setNewProblem({ ...newProblem, assigned_date: e.target.value })}
              className="px-3 py-2 bg-transparent border-2 border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]"
            />
          </div>
          {problemError && <p className="text-xs text-red-400 font-bold">{'>'} {problemError}</p>}
          <button type="submit" disabled={addingProblem} className={btn}>
            {addingProblem ? '> Fetching...' : '> Add Problem'}
          </button>
        </form>

        <div className="border-2 border-[var(--color-border)] divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
          {problems.map(problem => (
            <div key={problem.id} className="px-3 py-2 flex items-center justify-between hover:bg-[var(--color-neon-dim)] transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${
                    problem.platform === 'leetcode'
                      ? 'border-orange-500/40 text-orange-400'
                      : 'border-cyan-500/40 text-cyan-400'
                  }`}>
                    {problem.platform === 'leetcode' ? 'LC' : 'CF'}
                  </span>
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--color-text)] hover:text-[var(--color-neon)] transition-colors"
                  >
                    {problem.title}
                  </a>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--color-text-dim)]">
                  {problem.difficulty && (
                    <span className="px-1 py-0.5 border border-[var(--color-border)] uppercase">{problem.difficulty}</span>
                  )}
                  {problem.assigned_date && (
                    <span className="text-[var(--color-neon)] opacity-60">
                      {formatAdminDate(problem.assigned_date)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => handleDeleteProblem(problem.id)} className={btnDanger}>[x]</button>
            </div>
          ))}
          {problems.length === 0 && (
            <div className="px-3 py-6 text-center text-[var(--color-text-dim)] text-xs uppercase tracking-wider">{'>'} No problems added</div>
          )}
        </div>
      </div>
    </div>
  );
}
