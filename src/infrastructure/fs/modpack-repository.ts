import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ModpackSchema } from '@shared/schemas/modpack.schema';
import type { ModpackProfile, Modpack } from '@shared/types';
import { PathService } from './path-service';

/**
 * Disk repository for modpack profiles. Each modpack lives in its own
 * sandboxed directory under `<userData>/modpacks/<id>/` with a `profile.json`.
 *
 * Replaces v1's scattered fs operations inside electron-main.cjs and the dead
 * `game-detector.cjs`. Path traversal is blocked by PathService.modpackDirectory.
 */
export class ModpackRepository {
  constructor(private readonly paths: PathService) {}

  async list(): Promise<Modpack[]> {
    await mkdir(this.paths.modpacks, { recursive: true });
    const entries = await readdir(this.paths.modpacks, { withFileTypes: true });
    const result: Modpack[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const profile = await this.tryReadProfile(entry.name);
      if (!profile) continue;
      const dir = join(this.paths.modpacks, entry.name);
      const modCount = await this.countMods(dir);
      result.push({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        minecraftVersion: profile.minecraftVersion,
        loader: profile.loader,
        loaderVersion: profile.loaderVersion,
        iconPath: profile.iconPath,
        directory: dir,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        lastPlayedAt: profile.lastPlayedAt,
        playtimeSeconds: profile.playtimeSeconds,
        modCount,
      });
    }
    return result.sort((a, b) => (b.updatedAt - a.updatedAt));
  }

  async readProfile(modpackId: string): Promise<ModpackProfile | null> {
    return this.tryReadProfile(modpackId);
  }

  async writeProfile(modpackId: string, profile: ModpackProfile): Promise<void> {
    const dir = this.paths.modpackDirectory(modpackId);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'mods'), { recursive: true });
    await writeFile(join(dir, 'profile.json'), JSON.stringify(profile, null, 2), 'utf8');
  }

  async updateProfile(modpackId: string, changes: Record<string, unknown>): Promise<ModpackProfile> {
    const current = (await this.readProfile(modpackId)) ?? this.emptyProfile(modpackId);
    const merged = { ...current, ...changes, updatedAt: Date.now() } as ModpackProfile;
    const parsed = ModpackSchema.profile.parse(merged);
    await this.writeProfile(modpackId, parsed);
    return parsed;
  }

  async delete(modpackId: string): Promise<void> {
    const dir = this.paths.modpackDirectory(modpackId);
    await rm(dir, { recursive: true, force: true });
  }

  async recordPlaytime(modpackId: string, durationSeconds: number): Promise<void> {
    const profile = await this.readProfile(modpackId);
    if (!profile) return;
    await this.updateProfile(modpackId, {
      playtimeSeconds: profile.playtimeSeconds + durationSeconds,
      lastPlayedAt: Date.now(),
    } as Partial<ModpackProfile>);
  }

  private async tryReadProfile(modpackId: string): Promise<ModpackProfile | null> {
    try {
      const dir = this.paths.modpackDirectory(modpackId);
      const raw = await readFile(join(dir, 'profile.json'), 'utf8');
      const json = JSON.parse(raw);
      // Migrate v1 profile format to v2
      const migrated = {
        id: json.id ?? modpackId,
        name: json.name ?? modpackId,
        description: json.description ?? '',
        minecraftVersion: json.minecraftVersion ?? json.mcVersion ?? '',
        loader: (json.loader ?? 'vanilla').toLowerCase(),
        loaderVersion: json.loaderVersion ?? undefined,
        iconPath: json.iconPath ?? undefined,
        createdAt: json.createdAt ?? Date.now(),
        updatedAt: json.updatedAt ?? Date.now(),
        lastPlayedAt: json.lastPlayedAt ?? undefined,
        playtimeSeconds: json.playtimeSeconds ?? 0,
        mods: json.mods ?? [],
      };
      return ModpackSchema.profile.parse(migrated);
    } catch {
      return null;
    }
  }

  private async countMods(modpackDir: string): Promise<number> {
    try {
      const modsDir = join(modpackDir, 'mods');
      const files = await readdir(modsDir);
      return files.filter((f) => f.endsWith('.jar')).length;
    } catch {
      return 0;
    }
  }

  private emptyProfile(modpackId: string): ModpackProfile {
    return {
      id: modpackId,
      name: modpackId,
      description: '',
      minecraftVersion: '',
      loader: 'vanilla',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playtimeSeconds: 0,
      mods: [],
    };
  }
}
