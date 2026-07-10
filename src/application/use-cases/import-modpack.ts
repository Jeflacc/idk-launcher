import { join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';

/**
 * Import a modpack from a .zip/.mrpack file. Replaces v1's unzip-curseforge IPC.
 */
export class ImportModpack {
  constructor(private readonly repo: ModpackRepository) {}

  async execute(zipPath: string, name: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JSZip = require('jszip') as typeof import('jszip');
    const buf = await readFile(zipPath);
    const zip = await JSZip.loadAsync(buf);
    const modpackId = randomUUID();
    const dir = this.repo['paths'].modpackDirectory(modpackId);
    await mkdir(join(dir, 'mods'), { recursive: true });

    const profileJson = zip.file('profile.json');
    let minecraftVersion = '';
    let loader: 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge' = 'vanilla';
    if (profileJson) {
      const text = await profileJson.async('string');
      const parsed = JSON.parse(text);
      minecraftVersion = parsed.minecraftVersion ?? '';
      loader = parsed.loader ?? 'vanilla';
    }
    await this.repo.writeProfile(modpackId, {
      id: modpackId,
      name,
      description: 'Imported modpack',
      minecraftVersion,
      loader,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playtimeSeconds: 0,
      mods: [],
    });

    const mods = zip.folder('mods');
    if (mods) {
      const entries = Object.values(mods.files) as Array<{ dir: boolean; name: string; async: (t: string) => Promise<Buffer> }>;
      for (const entry of entries) {
        if (entry.dir) continue;
        const data = await entry.async('nodebuffer');
        await writeFile(join(dir, 'mods', entry.name.split('/').pop()!), data);
      }
    }
    return modpackId;
  }
}
