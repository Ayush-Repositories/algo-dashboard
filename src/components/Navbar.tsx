'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => setAuthed(d.authenticated))
      .catch(() => setAuthed(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthed(false);
    router.push('/');
  };

  const linkClass = (path: string) =>
    `px-3 py-1 border text-sm font-bold uppercase tracking-wider transition-all ${
      pathname === path
        ? 'border-[var(--color-neon)] text-[var(--color-neon)] bg-[var(--color-neon-dim)]'
        : 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-neon)] hover:border-[var(--color-border)]'
    }`;

  return (
    <nav className="border-b-2 border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-[12px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[var(--color-neon)] font-bold text-lg tracking-widest">EHAX</span>
              <span className="text-[var(--color-text-dim)] text-sm">// algo</span>
            </Link>
            <div className="flex gap-1">
              <Link href="/" className={linkClass('/')}>Dashboard</Link>
              {authed && (
                <Link href="/admin" className={linkClass('/admin')}>Admin</Link>
              )}
            </div>
          </div>
          <div>
            {authed ? (
              <button
                onClick={handleLogout}
                className="text-sm text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors uppercase tracking-wider"
              >
                [logout]
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors uppercase tracking-wider"
              >
                [login]
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
