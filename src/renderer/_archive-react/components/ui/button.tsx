import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'accent-gradient text-[var(--color-accent-foreground)] hover:shadow-[var(--shadow-glow)] btn-shine',
  secondary:
    'glass text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]',
  ghost:
    'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 btn-shine',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-md)]',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-[var(--radius-md)]',
};

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`no-drag inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
