import { join } from 'node:path';
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
 *
 * The instance folder is the modpack's name (sanitized + deduped) — not a UUID.
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

    const folder = await this.repo.uniqueFolderForName(input.name);
    await this.repo.writeProfile(folder, {
      id: folder,
      name: input.name,
      description: '',
      minecraftVersion: input.minecraftVersion,
      loader: input.loader,
      loaderVersion: undefined,
      iconPath: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPlayedAt: undefined,
      playtimeSeconds: 0,
      favorite: false,
      javaArgs: '',
      windowWidth: 1024,
      windowHeight: 768,
      mods: [],
    });

    const downloadId = `modpack:${folder}`;
    await this.queue.start(
      downloadId,
      [
        {
          url: file.url,
          targetPath: join(this.repo['paths'].modpackDirectory(folder), `${folder}.mrpack`),
          filename: file.filename,
          size: file.size,
          sha1: file.hashes.sha1,
          skipIfPresent: true,
        },
      ],
      1,
    );

    return folder;
  }
}
