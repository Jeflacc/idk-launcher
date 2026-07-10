import { describe, it, expect, vi } from 'vitest';
import { MojangClient } from '@/infrastructure/net/api/mojang-client';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { VersionManifest } from '@shared/types';

describe('MojangClient', () => {
  it('getManifest fetches the version_manifest_v2.json', async () => {
    const http = { getJson: vi.fn() } as unknown as HttpClient;
    const manifest: VersionManifest = {
      latest: { release: '1.20.1', snapshot: '23w13a' },
      versions: [
        { id: '1.20.1', type: 'release', url: 'https://x', time: 't', releaseTime: 't' },
      ],
    };
    vi.mocked(http.getJson).mockResolvedValue(manifest);

    const client = new MojangClient(http);
    const r = await client.getManifest();

    expect(r.latest.release).toBe('1.20.1');
    expect(r.versions).toHaveLength(1);
    const url = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(url).toContain('version_manifest_v2.json');
  });
});
