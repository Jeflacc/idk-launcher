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
});
