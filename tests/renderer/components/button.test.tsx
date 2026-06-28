import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/renderer/components/ui/button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the primary variant class', () => {
    render(<Button variant="primary">P</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-[var(--color-accent)]');
  });

  it('applies the danger variant class', () => {
    render(<Button variant="danger">D</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-[var(--color-danger)]');
  });

  it('applies the ghost variant class', () => {
    render(<Button variant="ghost">G</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-[var(--color-text-muted)]');
  });

  it('applies size classes', () => {
    render(<Button size="sm">S</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');
    render(<Button size="lg">L</Button>);
    expect(screen.getByRole('button', { name: /l/i }).className).toContain('h-12');
  });

  it('passes through additional className', () => {
    render(<Button className="my-custom">X</Button>);
    expect(screen.getByRole('button').className).toContain('my-custom');
  });
});
