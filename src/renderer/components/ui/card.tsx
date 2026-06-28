import { type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, interactive = false, className = '', ...rest }: CardProps) {
  const base = interactive ? 'glass-card cursor-pointer' : 'glass-card';
  return (
    <div
      className={`${base} rounded-[var(--radius-card)] p-5 ${interactive ? '' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
