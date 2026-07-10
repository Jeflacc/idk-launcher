import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '@/renderer/components/ui/card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies glass class', () => {
    render(<Card>X</Card>);
    expect(screen.getByText('X').className).toContain('glass');
  });

  it('applies interactive class when interactive=true', () => {
    render(<Card interactive>Y</Card>);
    expect(screen.getByText('Y').className).toContain('cursor-pointer');
  });

  it('fires onClick when interactive and clicked', () => {
    const onClick = vi.fn();
    render(<Card interactive onClick={onClick}>Z</Card>);
    fireEvent.click(screen.getByText('Z'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('passes through additional className', () => {
    render(<Card className="custom-card">W</Card>);
    expect(screen.getByText('W').className).toContain('custom-card');
  });
});
