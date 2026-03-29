import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-lg font-bold text-[var(--color-neon)] mb-6 uppercase tracking-widest">
        // Admin Panel
      </h1>
      <AdminPanel />
    </div>
  );
}
