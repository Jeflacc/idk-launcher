import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { ModLoader } from '@shared/types';

export interface InstallModpackInput {
  modrinthProjectId: string;
  minecraftVersion: string;
  loader: ModLoader;
  name: string;
}

/**
 * Install a modpack from Modrinth: download the mrpack, create the sandboxed
 * profile directory, and register it. Replaces the 1,202-line `mpAddItem`
 * inside v1's modpacks-feature.js.
 */
export class InstallModpack {
  constructor(
    private readonly modrinth: ModrinthClient,
    private readonly repo: ModpackRepository,
    private readonly queue: DownloadQueue,
  ) {}

  async execute(input: InstallModpackInput): Promise<string> {
    const versions = await this.modrinth.getVersions(input.modrinthProjectId, input.minecraftVersion);
    const version = versions.find((v) => v.loaders.includes(input.loader)) ?? versions[0];
    if (!version) throw new Error('No compatible modpack version found');

    const file = version.files.find((f) => f.primary) ?? version.files[0];
    if (!file) throw new Error('No downloadable file found');

    const modpackId = randomUUID();
    await this.repo.writeProfile(modpackId, {
      id: modpackId,
      name: input.name,
      description: '',
      minecraftVersion: input.minecraftVersion,
      loader: input.loader,
      loaderVersion: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playtimeSeconds: 0,
      mods: [],
    });

    const downloadId = `modpack:${modpackId}`;
    await this.queue.start(
      downloadId,
      [
        {
          url: file.url,
          targetPath: join(this.repo['paths'].modpackDirectory(modpackId), `${modpackId}.mrpack`),
          filename: file.filename,
          size: file.size,
          sha1: file.hashes.sha1,
          skipIfPresent: true,
        },
      ],
      1,
    );

    return modpackId;
  }
}
