import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModpacksView } from '@/renderer/features/modpacks/modpacks-view';

// Mock the useInstalledModpacks hook.
vi.mock('@/renderer/hooks/use-launcher-data', () => ({
  useInstalledModpacks: vi.fn(),
}));

// Mock the preload bridge.
vi.mock('@/renderer/lib/preload-bridge', () => ({
  api: {
    modpack: {
      launch: vi.fn().mockResolvedValue({ success: true }),
      deleteFolder: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const { useInstalledModpacks } = await import('@/renderer/hooks/use-launcher-data');

describe('ModpacksView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    vi.mocked(useInstalledModpacks).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInstalledModpacks>);
    render(<ModpacksView />);
    expect(screen.getByText('Your modpacks')).toBeInTheDocument();
  });

  it('shows a loading spinner while loading', () => {
    vi.mocked(useInstalledModpacks).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInstalledModpacks>);
    render(<ModpacksView />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no modpacks exist', () => {
    vi.mocked(useInstalledModpacks).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInstalledModpacks>);
    render(<ModpacksView />);
    expect(screen.getByText('No modpacks yet')).toBeInTheDocument();
  });

  it('renders modpack cards when modpacks exist', () => {
    vi.mocked(useInstalledModpacks).mockReturnValue({
      data: [
        {
          id: 'mp-1',
          name: 'Skyblock',
          description: '',
          minecraftVersion: '1.20.1',
          loader: 'fabric',
          directory: '/tmp/mp-1',
          createdAt: 1,
          updatedAt: 1,
          modCount: 5,
          playtimeSeconds: 0,
        },
      ],
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInstalledModpacks>);
    render(<ModpacksView />);
    expect(screen.getByText('Skyblock')).toBeInTheDocument();
    expect(screen.getByText('MC 1.20.1')).toBeInTheDocument();
    expect(screen.getByText('5 mods')).toBeInTheDocument();
  });

  it('shows Play and Delete buttons for each modpack', () => {
    vi.mocked(useInstalledModpacks).mockReturnValue({
      data: [
        {
          id: 'mp-1',
          name: 'Test',
          description: '',
          minecraftVersion: '1.20.1',
          loader: 'fabric',
          directory: '/tmp/mp-1',
          createdAt: 1,
          updatedAt: 1,
          modCount: 0,
          playtimeSeconds: 0,
        },
      ],
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInstalledModpacks>);
    render(<ModpacksView />);
    expect(screen.getByRole('button', { name: /Play/i })).toBeInTheDocument();
  });
});
