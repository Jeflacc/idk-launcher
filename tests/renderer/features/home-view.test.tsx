import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeView } from '@/renderer/features/home/home-view';
import { useRouter } from '@/renderer/stores/router-store';
import { useSession } from '@/renderer/stores/session-store';

// Mock the preload bridge.
vi.mock('@/renderer/lib/preload-bridge', () => ({
  api: {
    window: { minimize: vi.fn(), maximize: vi.fn(), close: vi.fn() },
  },
}));

describe('HomeView', () => {
  beforeEach(() => {
    useRouter.setState({ view: 'home', params: {}, history: ['home'] });
    useSession.setState({ session: null, status: 'anonymous', error: null });
  });

  it('renders the hero heading', () => {
    render(<HomeView />);
    expect(screen.getByText(/next-generation Minecraft experience/i)).toBeInTheDocument();
  });

  it('shows sign-in button when not authenticated', () => {
    render(<HomeView />);
    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument();
  });

  it('navigates to discover when browse is clicked', () => {
    render(<HomeView />);
    fireEvent.click(screen.getByRole('button', { name: /browse modpacks/i }));
    expect(useRouter.getState().view).toBe('discover');
  });

  it('navigates when a feature card is clicked', () => {
    render(<HomeView />);
    fireEvent.click(screen.getByText('Discover'));
    expect(useRouter.getState().view).toBe('discover');
  });

  it('shows personalized greeting when authenticated', () => {
    useSession.setState({ session: { provider: 'microsoft', username: 'Steve', uuid: 'u' }, status: 'authenticated' });
    render(<HomeView />);
    expect(screen.getByText(/Hello, Steve/i)).toBeInTheDocument();
  });

  it('renders the architecture benefit cards', () => {
    render(<HomeView />);
    expect(screen.getByText('Glassmorphic UI')).toBeInTheDocument();
    expect(screen.getByText('Secure by default')).toBeInTheDocument();
    expect(screen.getByText('Typed end-to-end')).toBeInTheDocument();
  });
});
