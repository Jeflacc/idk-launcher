import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrashAnalyzerView } from '@/renderer/features/crash-analyzer/crash-analyzer-view';

describe('CrashAnalyzerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the textarea for pasting logs', () => {
    render(<CrashAnalyzerView />);
    expect(screen.getByPlaceholderText(/Paste your crash log/)).toBeInTheDocument();
  });

  it('shows the char count', () => {
    render(<CrashAnalyzerView />);
    const textarea = screen.getByPlaceholderText(/Paste your crash log/);
    fireEvent.change(textarea, { target: { value: 'some crash log text' } });
    expect(screen.getByText(/chars/)).toHaveTextContent('19 chars');
  });

  it('disables the Analyze button when the log is empty', () => {
    render(<CrashAnalyzerView />);
    expect(screen.getByRole('button', { name: /Analyze/i })).toBeDisabled();
  });

  it('enables the Analyze button when text is present', () => {
    render(<CrashAnalyzerView />);
    const textarea = screen.getByPlaceholderText(/Paste your crash log/);
    fireEvent.change(textarea, { target: { value: 'some log' } });
    expect(screen.getByRole('button', { name: /Analyze/i })).toBeEnabled();
  });

  it('shows the diagnosis on analyze', () => {
    render(<CrashAnalyzerView />);
    const textarea = screen.getByPlaceholderText(/Paste your crash log/);
    fireEvent.change(textarea, { target: { value: 'java.lang.OutOfMemoryError: Java heap space' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));
    expect(screen.getByText('Diagnosis')).toBeInTheDocument();
    // The summary <p> + the matched-pattern title both contain "Out of memory".
    expect(screen.getAllByText('Out of memory').length).toBeGreaterThanOrEqual(1);
  });

  it('shows unknown when no patterns match', () => {
    render(<CrashAnalyzerView />);
    const textarea = screen.getByPlaceholderText(/Paste your crash log/);
    fireEvent.change(textarea, { target: { value: 'everything is fine here' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));
    expect(screen.getByText(/No recognized crash signature/)).toBeInTheDocument();
  });

  it('detects missing mods and lists them', () => {
    render(<CrashAnalyzerView />);
    const textarea = screen.getByPlaceholderText(/Paste your crash log/);
    fireEvent.change(textarea, { target: { value: 'Missing mod fabric-api' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));
    expect(screen.getByText(/Missing mods/)).toBeInTheDocument();
    expect(screen.getByText('fabric-api')).toBeInTheDocument();
  });
});
