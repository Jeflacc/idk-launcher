import { describe, it, expect, vi } from 'vitest';
import { InstallModpack } from '@/application/use-cases/install-modpack';
import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { ModLoader } from '@shared/types';

function mockModrinth(): ModrinthClient {
  return {
    getVersions: vi.fn().mockResolvedValue([
      {
        id: 'v1',
        project_id: 'proj-1',
        name: '1.0.0',
        version_number: '1.0.0',
        game_versions: ['1.20.1'],
        loaders: ['fabric'],
        files: [
          {
            hashes: { sha1: 'abc', sha512: 'def' },
            url: 'https://cdn.modrinth.com/x.mrpack',
            filename: 'pack.mrpack',
            primary: true,
            size: 1000,
          },
        ],
        dependencies: [],
      },
    ]),
  } as unknown as ModrinthClient;
}

function mockRepo(): ModpackRepository & { paths: { modpackDirectory: (id: string) => string } } {
  return {
    writeProfile: vi.fn().mockResolvedValue(undefined),
    paths: { modpackDirectory: (id: string) => `/tmp/modpacks/${id}` },
  } as unknown as ModpackRepository & { paths: { modpackDirectory: (id: string) => string } };
}

function mockQueue(): DownloadQueue {
  return { start: vi.fn().mockResolvedValue(undefined) } as unknown as DownloadQueue;
}

describe('InstallModpack', () => {
  it('fetches versions, writes profile, and queues download', async () => {
    const modrinth = mockModrinth();
    const repo = mockRepo();
    const queue = mockQueue();
    const useCase = new InstallModpack(modrinth, repo, queue);

    const id = await useCase.execute({
      modrinthProjectId: 'proj-1',
      minecraftVersion: '1.20.1',
      loader: 'fabric' as ModLoader,
      name: 'My Pack',
    });

    expect(id).toBeTruthy();
    expect(repo.writeProfile).toHaveBeenCalled();
    expect(queue.start).toHaveBeenCalled();
    const [downloadId, items] = vi.mocked(queue.start).mock.calls[0]!;
    expect(downloadId).toContain(id);
    expect(items).toHaveLength(1);
    expect(items[0].sha1).toBe('abc');
    expect(items[0].size).toBe(1000);
  });

  it('throws when no compatible version is found', async () => {
    const modrinth = mockModrinth();
    vi.mocked(modrinth.getVersions).mockResolvedValue([]);
    const useCase = new InstallModpack(modrinth, mockRepo(), mockQueue());

    await expect(
      useCase.execute({
        modrinthProjectId: 'proj-1',
        minecraftVersion: '1.20.1',
        loader: 'fabric',
        name: 'X',
      }),
    ).rejects.toThrow(/No compatible modpack version/);
  });
});
