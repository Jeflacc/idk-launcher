import { describe, it, expect, vi } from 'vitest';
import { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { HttpClient } from '@/infrastructure/net/http-client';

function mockHttp(): HttpClient {
  return { getJson: vi.fn() } as unknown as HttpClient;
}

describe('ElybyClient', () => {
  it('authenticate posts to /auth/authenticate', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({
      access_token: 'tok',
      uuid: 'uuid-1',
      username: 'Steve',
      expires_in: 86400,
    });
    const client = new ElybyClient(http);

    const r = await client.authenticate('Steve', 'pass');

    expect(r.access_token).toBe('tok');
    expect(r.username).toBe('Steve');
    const [url, opts] = vi.mocked(http.getJson).mock.calls[0]!;
    expect(decodeURIComponent(url)).toContain('/auth/authenticate');
    expect(opts?.method).toBe('POST');
    const body = JSON.parse((opts as { body: string }).body);
    expect(body.username).toBe('Steve');
  });

  it('refresh posts to /auth/refresh', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({
      access_token: 'new',
      uuid: 'u',
      username: 'x',
      expires_in: 3600,
    });
    const client = new ElybyClient(http);

    await client.refresh('old-token', 'client-token');

    const [url, opts] = vi.mocked(http.getJson).mock.calls[0]!;
    expect(decodeURIComponent(url)).toContain('/auth/refresh');
    expect(opts?.method).toBe('POST');
  });

  it('fetchProfile calls /users/:username', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({ id: '1', name: 'Steve', skins: [] });
    const client = new ElybyClient(http);

    await client.fetchProfile('Steve');

    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(decodeURIComponent(url)).toContain('/users/Steve');
  });

  it('fetchSkinTextureUrl returns the skins.ely.by URL', () => {
    const http = mockHttp();
    const client = new ElybyClient(http);
    const url = client.fetchSkinTextureUrl('Steve');
    expect(url).toBe('https://skins.ely.by/skins/Steve.png');
  });

  it('exchangeOAuthCode posts to /api/oauth2/v1/token', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({
      access_token: 'oauth-tok',
      refresh_token: 'refresh-tok',
      token_type: 'Bearer',
      expires_in: 86400,
    });
    const client = new ElybyClient(http);

    const r = await client.exchangeOAuthCode('auth-code', 'client-id', 'client-secret', 'http://localhost:29487/callback');

    expect(r.access_token).toBe('oauth-tok');
    expect(r.refresh_token).toBe('refresh-tok');
    const [url, opts] = vi.mocked(http.getJson).mock.calls[0]!;
    expect(url).toContain('/api/oauth2/v1/token');
    expect(opts?.method).toBe('POST');
  });

  it('fetchOAuthUserInfo calls /api/account/v1/info with Bearer token', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({
      id: 1,
      uuid: 'ffc8fdc9-5824-509e-8a57-c99b940fb996',
      username: 'Steve',
      registeredAt: 1470566470,
      profileLink: 'http://ely.by/u1',
      preferredLanguage: 'en',
    });
    const client = new ElybyClient(http);

    const r = await client.fetchOAuthUserInfo('my-token');

    expect(r.username).toBe('Steve');
    expect(r.uuid).toBe('ffc8fdc9-5824-509e-8a57-c99b940fb996');
    const [url, opts] = vi.mocked(http.getJson).mock.calls[0]!;
    expect(url).toContain('/api/account/v1/info');
    expect(opts?.headers?.Authorization).toBe('Bearer my-token');
  });
});
