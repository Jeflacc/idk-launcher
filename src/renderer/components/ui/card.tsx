import { type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, interactive = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`glass rounded-[var(--radius-card)] p-5 ${interactive ? 'cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
