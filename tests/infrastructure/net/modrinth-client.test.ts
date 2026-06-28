import { describe, it, expect, vi } from 'vitest';
import { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import type { HttpClient } from '@/infrastructure/net/http-client';

function mockHttp(): HttpClient {
  return {
    getJson: vi.fn(),
    getText: vi.fn(),
    getBuffer: vi.fn(),
    downloadFile: vi.fn(),
  } as unknown as HttpClient;
}

describe('ModrinthClient', () => {
  it('searchModpacks queries with project_type:modpack facet', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({ hits: [], total_hits: 0 });
    const client = new ModrinthClient(http);

    await client.searchModpacks('skyblock', 10);

    expect(http.getJson).toHaveBeenCalled();
    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('project_type:modpack');
    expect(url).toContain('limit=10');
    expect(url).toContain('query=skyblock');
  });

  it('searchMods adds loader facet when provided', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({ hits: [], total_hits: 0 });
    const client = new ModrinthClient(http);

    await client.searchMods('sodium', 'fabric', 5);

    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('categories:fabric');
    expect(decoded).toContain('project_type:mod');
  });

  it('getProject calls /project/:id', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue({ project_id: 'x' });
    const client = new ModrinthClient(http);

    await client.getProject('abc');

    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(url).toContain('/project/abc');
  });

  it('getVersions passes game version + loader when provided', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue([]);
    const client = new ModrinthClient(http);

    await client.getVersions('abc', '1.20.1', 'fabric');

    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(url).toContain('1.20.1');
    expect(url).toContain('fabric');
  });

  it('getVersions works without optional params', async () => {
    const http = mockHttp();
    vi.mocked(http.getJson).mockResolvedValue([]);
    const client = new ModrinthClient(http);

    await client.getVersions('abc');

    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(url).toContain('/project/abc/version');
  });
});
