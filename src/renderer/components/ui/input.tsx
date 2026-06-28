import { type InputHTMLAttributes } from 'react';

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`no-drag w-full h-10 px-3 rounded-lg glass text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] transition-colors ${className}`}
      {...rest}
    />
  );
}
