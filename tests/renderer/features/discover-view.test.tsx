import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiscoverView } from '@/renderer/features/discover/discover-view';

// Mock the Modrinth search hook.
vi.mock('@/renderer/hooks/use-modrinth-search', () => ({
  useModrinthSearch: vi.fn(),
}));

// Mock the preload bridge.
vi.mock('@/renderer/lib/preload-bridge', () => ({
  api: {
    modpack: { install: vi.fn().mockResolvedValue('mp-1') },
    system: { openExternal: vi.fn() },
  },
}));

const { useModrinthSearch } = await import('@/renderer/hooks/use-modrinth-search');

describe('DiscoverView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search input', () => {
    vi.mocked(useModrinthSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useModrinthSearch>);
    render(<DiscoverView />);
    expect(screen.getByPlaceholderText(/Search modpacks/)).toBeInTheDocument();
  });

  it('shows a loading spinner while searching', () => {
    vi.mocked(useModrinthSearch).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useModrinthSearch>);
    render(<DiscoverView />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error message on failure', () => {
    vi.mocked(useModrinthSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network down'),
    } as unknown as ReturnType<typeof useModrinthSearch>);
    render(<DiscoverView />);
    expect(screen.getByText(/Failed to search/)).toBeInTheDocument();
  });

  it('renders modpack cards when results are present', async () => {
    vi.mocked(useModrinthSearch).mockReturnValue({
      data: {
        hits: [
          {
            project_id: 'p1',
            slug: 'pack-a',
            title: 'Pack A',
            description: 'A great pack',
            categories: ['fabric'],
            downloads: 1500,
            follows: 100,
            icon_url: null,
            project_type: 'modpack',
          },
        ],
        total_hits: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useModrinthSearch>);
    render(<DiscoverView />);
    expect(screen.getByText('Pack A')).toBeInTheDocument();
    expect(screen.getByText('A great pack')).toBeInTheDocument();
  });

  it('updates the query when typing in the search box', () => {
    vi.mocked(useModrinthSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useModrinthSearch>);
    render(<DiscoverView />);
    const input = screen.getByPlaceholderText(/Search modpacks/);
    fireEvent.change(input, { target: { value: 'skyblock' } });
    expect((input as HTMLInputElement).value).toBe('skyblock');
  });
});
