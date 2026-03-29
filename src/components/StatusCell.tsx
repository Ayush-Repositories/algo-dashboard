import { SolveStatusType } from '@/lib/types';

const statusConfig: Record<SolveStatusType, { bg: string; border: string; text: string; label: string }> = {
  solved: {
    bg: 'bg-[var(--color-neon-dim)]',
    border: 'border-[var(--color-neon)]',
    text: 'text-[var(--color-neon)]',
    label: 'S',
  },
  attempted: {
    bg: 'bg-transparent',
    border: 'border-[var(--color-border)]',
    text: 'text-[var(--color-text-dim)]',
    label: '-',
  },
  unsolved: {
    bg: 'bg-transparent',
    border: 'border-[var(--color-border)]',
    text: 'text-[var(--color-text-dim)]',
    label: '-',
  },
};

export default function StatusCell({ status }: { status: SolveStatusType }) {
  const config = statusConfig[status];
  return (
    <div
      className={`w-8 h-8 mx-auto flex items-center justify-center border text-xs font-bold ${config.bg} ${config.border} ${config.text}`}
      title={status === 'solved' ? 'Solved' : 'Unsolved'}
    >
      {config.label}
    </div>
  );
}
