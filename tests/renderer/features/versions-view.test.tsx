import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionsView } from '@/renderer/features/versions/versions-view';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Mock fetch for the Mojang manifest.
global.fetch = vi.fn() as unknown as typeof fetch;

function mockManifest() {
  return {
    latest: { release: '1.20.1', snapshot: '23w13a' },
    versions: [
      { id: '1.20.1', type: 'release', url: 'https://x', time: 't', releaseTime: 't' },
      { id: '1.19.4', type: 'release', url: 'https://x', time: 't', releaseTime: 't' },
      { id: '23w13a', type: 'snapshot', url: 'https://x', time: 't', releaseTime: 't' },
    ],
  };
}

// Mock the preload bridge.
vi.mock('@/renderer/lib/preload-bridge', () => ({
  api: {
    version: { download: vi.fn().mockResolvedValue('version:1.20.1') },
  },
}));

describe('VersionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest()),
    });
  });

  it('renders the heading', () => {
    renderWithQuery(<VersionsView />);
    expect(screen.getByText('Minecraft versions')).toBeInTheDocument();
  });

  it('loads and displays versions', async () => {
    renderWithQuery(<VersionsView />);
    await waitFor(() => expect(screen.getByText('1.20.1')).toBeInTheDocument());
    expect(screen.getByText('1.19.4')).toBeInTheDocument();
  });

  it('shows Download buttons for each version', async () => {
    renderWithQuery(<VersionsView />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Download/i }).length).toBeGreaterThan(0));
  });

  it('filters versions by the search input', async () => {
    renderWithQuery(<VersionsView />);
    await waitFor(() => expect(screen.getByText('1.20.1')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Filter versions/);
    fireEvent.change(input, { target: { value: '1.19' } });
    expect(screen.getByText('1.19.4')).toBeInTheDocument();
    expect(screen.queryByText('1.20.1')).not.toBeInTheDocument();
  });

  it('switches between release and snapshot types', async () => {
    renderWithQuery(<VersionsView />);
    await waitFor(() => expect(screen.getByText('1.20.1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('snapshot'));
    await waitFor(() => expect(screen.getByText('23w13a')).toBeInTheDocument());
    expect(screen.queryByText('1.20.1')).not.toBeInTheDocument();
  });

  it('shows badges with the version type', async () => {
    renderWithQuery(<VersionsView />);
    await waitFor(() => expect(screen.getByText('1.20.1')).toBeInTheDocument());
    // Multiple release versions → multiple "release" badges.
    const releases = screen.getAllByText('release');
    expect(releases.length).toBeGreaterThanOrEqual(1);
  });
});
