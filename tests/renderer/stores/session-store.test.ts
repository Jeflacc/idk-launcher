import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSession } from '@/renderer/stores/session-store';
import { api } from '@/renderer/lib/preload-bridge';

// Mock the preload bridge API.
vi.mock('@/renderer/lib/preload-bridge', () => ({
  api: {
    auth: {
      getMicrosoftAuthData: vi.fn(),
      getElybyAuthData: vi.fn(),
      microsoftAuthenticate: vi.fn(),
      elybyAuthenticate: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('useSession store', () => {
  beforeEach(() => {
    useSession.setState({ session: null, status: 'anonymous', error: null });
    vi.clearAllMocks();
  });

  it('starts anonymous', () => {
    const s = useSession.getState();
    expect(s.status).toBe('anonymous');
    expect(s.session).toBeNull();
  });

  it('init loads an existing microsoft session', async () => {
    vi.mocked(api.auth.getMicrosoftAuthData).mockResolvedValue({
      provider: 'microsoft',
      username: 'Steve',
      uuid: 'uuid-1',
    });
    await useSession.getState().init();
    expect(useSession.getState().session?.username).toBe('Steve');
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('init falls back to elyby when microsoft is absent', async () => {
    vi.mocked(api.auth.getMicrosoftAuthData).mockResolvedValue(null);
    vi.mocked(api.auth.getElybyAuthData).mockResolvedValue({
      provider: 'elyby',
      username: 'ElybyUser',
      uuid: 'eu',
    });
    await useSession.getState().init();
    expect(useSession.getState().session?.username).toBe('ElybyUser');
  });

  it('init stays anonymous when no session exists', async () => {
    vi.mocked(api.auth.getMicrosoftAuthData).mockResolvedValue(null);
    vi.mocked(api.auth.getElybyAuthData).mockResolvedValue(null);
    await useSession.getState().init();
    expect(useSession.getState().status).toBe('anonymous');
  });

  it('signInMicrosoft sets authenticated on success', async () => {
    vi.mocked(api.auth.microsoftAuthenticate).mockResolvedValue({
      provider: 'microsoft',
      username: 'Steve',
      uuid: 'uuid-1',
    });
    await useSession.getState().signInMicrosoft();
    expect(useSession.getState().session?.username).toBe('Steve');
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('signInMicrosoft sets error on failure', async () => {
    vi.mocked(api.auth.microsoftAuthenticate).mockRejectedValue(new Error('Auth failed'));
    await useSession.getState().signInMicrosoft();
    expect(useSession.getState().status).toBe('error');
    expect(useSession.getState().error).toBe('Auth failed');
  });

  it('signInElyby sets authenticated on success', async () => {
    vi.mocked(api.auth.elybyAuthenticate).mockResolvedValue({
      provider: 'elyby',
      username: 'ElybyUser',
      uuid: 'eu',
    });
    await useSession.getState().signInElyby('user', 'pass');
    expect(useSession.getState().session?.username).toBe('ElybyUser');
  });

  it('signOut clears the session', async () => {
    useSession.setState({ session: { provider: 'microsoft', username: 'Steve', uuid: 'u' }, status: 'authenticated' });
    await useSession.getState().signOut();
    expect(useSession.getState().session).toBeNull();
    expect(useSession.getState().status).toBe('anonymous');
    expect(api.auth.signOut).toHaveBeenCalled();
  });
});
