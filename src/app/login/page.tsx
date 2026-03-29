'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = from;
      } else {
        setError('> Access denied.');
      }
    } catch {
      setError('> Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-surface)] backdrop-blur-[12px] border-2 border-[var(--color-border)] p-8 w-full max-w-sm space-y-5"
      >
        <div className="text-center space-y-2">
          <h1 className="text-[var(--color-neon)] font-bold text-lg uppercase tracking-widest">
            Admin Access
          </h1>
          <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
            Enter credentials to continue
          </p>
        </div>

        <input
          type="password"
          placeholder="> enter password..."
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          className="w-full px-3 py-2.5 bg-transparent border-2 border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-neon)] transition-colors"
        />

        {error && (
          <p className="text-sm text-red-400 font-bold">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 border-2 border-[var(--color-neon)] text-[var(--color-neon)] text-sm font-bold uppercase tracking-widest hover:bg-[var(--color-neon)] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '> Authenticating...' : '> Login'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
