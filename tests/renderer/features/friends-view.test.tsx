import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FriendsView } from '@/renderer/features/friends/friends-view';

describe('FriendsView', () => {
  it('renders the IDK Connect heading', () => {
    render(<FriendsView />);
    expect(screen.getByText('IDK Connect')).toBeInTheDocument();
  });

  it('shows the HTTPS-required warning', () => {
    render(<FriendsView />);
    expect(screen.getByText(/Connect backend not configured/)).toBeInTheDocument();
  });

  it('shows the disabled badge', () => {
    render(<FriendsView />);
    expect(screen.getByText(/Disabled — HTTPS required/)).toBeInTheDocument();
  });

  it('mentions the plaintext HTTP backend from v1', () => {
    render(<FriendsView />);
    expect(screen.getByText(/api.somniac.me:6040/)).toBeInTheDocument();
  });
});
