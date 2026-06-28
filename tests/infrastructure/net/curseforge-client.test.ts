import { describe, it, expect, vi } from 'vitest';
import { CurseforgeClient } from '@/infrastructure/net/api/curseforge-client';
import type { HttpClient } from '@/infrastructure/net/http-client';

function mockHttp(): HttpClient {
  return { getJson: vi.fn() } as unknown as HttpClient;
}

describe('CurseforgeClient', () => {
  it('searchModpacks sends the x-api-key header', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({ data: [] });
    const client = new CurseforgeClient(http, 'my-api-key');

    await client.searchModpacks('RLCraft', 10);

    const [url, opts] = vi.mocked(http.getJson).mock.calls[0]!;
    expect(url).toContain('/mods/search');
    expect(decodeURIComponent(url)).toContain('searchFilter=RLCraft');
    expect((opts as { headers: Record<string, string> }).headers['x-api-key']).toBe('my-api-key');
  });

  it('getModpackFiles calls /mods/:id/files', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({ data: [] });
    const client = new CurseforgeClient(http, 'key');

    await client.getModpackFiles(12345);

    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(url).toContain('/mods/12345/files');
  });
});
