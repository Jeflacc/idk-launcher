import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/renderer/components/ui/badge';
import { Spinner } from '@/renderer/components/ui/spinner';
import { Input } from '@/renderer/components/ui/input';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies success variant class', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK').className).toContain('text-[var(--color-success)]');
  });

  it('applies warning variant class', () => {
    render(<Badge variant="warning">!</Badge>);
    expect(screen.getByText('!').className).toContain('text-[var(--color-warning)]');
  });

  it('applies danger variant class', () => {
    render(<Badge variant="danger">!!</Badge>);
    const el = screen.getByText('!!');
    expect(el.className).toContain('text-[var(--color-danger)]');
  });
});

describe('Spinner', () => {
  it('renders with a status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('accepts a custom size', () => {
    render(<Spinner size={40} />);
    const spinner = screen.getByRole('status');
    expect(spinner.getAttribute('style')).toContain('40');
  });
});

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('passes through value and onChange', () => {
    const onChange = vi.fn();
    render(<Input value="hello" onChange={onChange} />);
    expect((screen.getByDisplayValue('hello') as HTMLInputElement).value).toBe('hello');
  });

  it('applies the glass class', () => {
    render(<Input />);
    expect(screen.getByRole('textbox').className).toContain('glass');
  });
});
