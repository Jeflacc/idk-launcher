import { join } from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';

/**
 * Export a modpack profile to a .zip. Replaces v1's jszip-based export inside
 * modpacks-feature.js.
 */
export class ExportModpack {
  constructor(private readonly repo: ModpackRepository) {}

  async execute(modpackId: string, targetZipPath: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JSZip = require('jszip') as typeof import('jszip');
    const zip = new JSZip();
    const dir = this.repo['paths'].modpackDirectory(modpackId);
    const profile = await this.repo.readProfile(modpackId);
    if (profile) {
      zip.file('profile.json', JSON.stringify(profile, null, 2));
    }
    const modsDir = join(dir, 'mods');
    try {
      const mods = await readdir(modsDir);
      for (const mod of mods) {
        const buf = await readFile(join(modsDir, mod));
        zip.folder('mods')!.file(mod, buf);
      }
    } catch {
      // no mods dir
    }
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    await writeFile(targetZipPath, content);
  }
}
