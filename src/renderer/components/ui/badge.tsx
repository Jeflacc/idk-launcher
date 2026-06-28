import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variants = {
  default: 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]',
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
