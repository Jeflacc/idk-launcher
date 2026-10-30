import { readFile, writeFile, mkdir, readdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { ModpackSchema } from '@shared/schemas/modpack.schema';
import type { ModpackProfile, Modpack } from '@shared/types';
import { PathService } from './path-service';

/**
 * Disk repository for instances (formerly "modpacks"). Each instance lives in
 * its own sandboxed directory under `<minecraft-data>/profiles/<folder>/` with
 * a `profile.json`.
 *
 * Instance model rules:
 * - The FOLDER NAME is the identity. There are no ids, no UUIDs — all
 *   operations key on the folder name (path-validated by PathService).
 * - The folder name is cosmetic: users can rename freely (folder + JSON).
 * - Qualification: a folder is an instance if (a) it has a parseable
 *   `profile.json`, or (b) it looks like a game directory (options.txt +
 *   servers.dat, or non-empty mods/logs/saves dirs). Everything else is skipped.
 * - Legacy `modpack-<uuid>` / `version-<id>` folders are migrated on first
 *   scan: renamed to their profile name and their JSON id rewritten to match.
 */
export class ModpackRepository {
  /** Legacy folder prefixes that get migrated to friendly names on first scan. */
  private static readonly LEGACY_PREFIX = /^(modpack|version)-/;

  constructor(private readonly paths: PathService) {}

  async list(): Promise<Modpack[]> {
    await mkdir(this.paths.modpacks, { recursive: true });
    const entries = await readdir(this.paths.modpacks, { withFileTypes: true });
    const result: Modpack[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      const folder = await this.migrateLegacyFolder(entry.name);
      const profile = (await this.tryReadProfile(folder)) ?? (await this.materializeHeuristicProfile(folder));
      if (!profile) continue;
      const dir = join(this.paths.modpacks, folder);
      const modCount = await this.countMods(dir);
      const diskMods = await this.listDiskFiles(dir, 'mods', '.jar');
      const diskResourcepacks = await this.listDiskFiles(dir, 'resourcepacks', ['.zip', '.jar']);
      const diskShaders = await this.listDiskFiles(dir, 'shaderpacks', ['.zip', '.jar']);
      result.push({
        id: folder,
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
        diskMods,
        diskResourcepacks,
        diskShaders,
      });
    }
    return result.sort((a, b) => (b.updatedAt - a.updatedAt));
  }

  async readProfile(folder: string): Promise<ModpackProfile | null> {
    return this.tryReadProfile(folder);
  }

  async writeProfile(folder: string, profile: ModpackProfile): Promise<void> {
    const dir = this.paths.modpackDirectory(folder);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'mods'), { recursive: true });
    await writeFile(join(dir, 'profile.json'), JSON.stringify(profile, null, 2), 'utf8');
  }

  async updateProfile(folder: string, changes: Record<string, unknown>): Promise<ModpackProfile> {
    const current = (await this.readProfile(folder)) ?? this.emptyProfile(folder);
    const merged = { ...current, ...changes, id: folder, updatedAt: Date.now() } as ModpackProfile;
    // v1 (and the legacy renderer) send `lastPlayedAt` as an ISO string or
    // null — normalize to epoch ms before validating against the strict schema.
    if (merged.lastPlayedAt !== undefined) {
      merged.lastPlayedAt = this.toEpochMs(merged.lastPlayedAt) as number | undefined;
    }
    // Normalize loader to lowercase (renderer sends "Vanilla" etc.)
    if (typeof merged.loader === 'string') {
      merged.loader = merged.loader.toLowerCase() as ModpackProfile['loader'];
    }
    const parsed = ModpackSchema.profile.parse(merged);
    await this.writeProfile(folder, parsed);
    return parsed;
  }

  async delete(folder: string): Promise<void> {
    const dir = this.paths.modpackDirectory(folder);
    await rm(dir, { recursive: true, force: true });
  }

  async recordPlaytime(folder: string, durationSeconds: number): Promise<void> {
    const profile = await this.readProfile(folder);
    if (!profile) return;
    await this.updateProfile(folder, {
      playtimeSeconds: profile.playtimeSeconds + durationSeconds,
      lastPlayedAt: Date.now(),
    } as Partial<ModpackProfile>);
  }

  /**
   * Rename an instance: folder on disk + profile.json id/name. Refuses (via
   * PathService validation + existence checks) on invalid or colliding names.
   * Callers must ensure no game is running from this instance first.
   */
  async rename(folder: string, newName: string): Promise<string> {
    const profile = await this.tryReadProfile(folder);
    const newFolder = await this.paths.renameInstanceFolder(folder, newName);
    if (profile) {
      await this.writeProfile(newFolder, { ...profile, id: newFolder, name: newName, updatedAt: Date.now() });
    } else {
      await this.writeProfile(newFolder, {
        ...this.emptyProfile(newFolder),
        name: newName,
      });
    }
    return newFolder;
  }

  /**
   * Sanitize a user-supplied name into a legal folder name, and pick a unique
   * one if the raw name is taken.
   */
  async uniqueFolderForName(name: string): Promise<string> {
    const base = name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/[.\s]+$/g, '').slice(0, 120) || 'instance';
    let candidate = base;
    let i = 2;
    while (existsSync(join(this.paths.modpacks, candidate))) {
      candidate = `${base}-${i}`;
      i++;
    }
    return candidate;
  }

  // ── Migration / qualification ──

  /**
   * First-scan migration: legacy `modpack-<uuid>` / `version-<id>` folders are
   * renamed to their profile.json name (or the bare version id) so folder names
   * become friendly. JSON `id` is rewritten to the new folder name.
   */
  private async migrateLegacyFolder(folder: string): Promise<string> {
    if (!ModpackRepository.LEGACY_PREFIX.test(folder)) return folder;
    const profile = await this.tryReadProfile(folder);
    if (!profile) return folder;
    const bare = folder.replace(ModpackRepository.LEGACY_PREFIX, '');
    const friendly = profile.name || bare;
    const target = await this.uniqueFolderForName(friendly);
    if (target === folder) {
      if (profile.id !== folder) {
        await this.writeProfile(folder, { ...profile, id: folder });
      }
      return folder;
    }
    try {
      const renamed = await this.paths.renameInstanceFolder(folder, target);
      await this.writeProfile(renamed, { ...profile, id: renamed });
      console.log(`[Instances] Migrated legacy folder "${folder}" → "${renamed}"`);
      return renamed;
    } catch (err) {
      console.warn(`[Instances] Could not migrate "${folder}":`, err);
      return folder;
    }
  }

  /**
   * Qualification without a profile.json: if the folder looks like a Minecraft
   * game directory, materialize a default profile so it becomes a first-class
   * instance. The Minecraft version is inferred from the folder name when it
   * looks like a version string.
   */
  private async materializeHeuristicProfile(folder: string): Promise<ModpackProfile | null> {
    const dir = join(this.paths.modpacks, folder);
    if (!(await this.looksLikeGameDirectory(dir))) return null;
    const versionMatch = /^(\d+\.\d+(?:\.\d+)?)/.exec(folder);
    const profile: ModpackProfile = {
      ...this.emptyProfile(folder),
      minecraftVersion: versionMatch?.[1] ?? '',
    };
    try {
      await this.writeProfile(folder, profile);
      console.log(`[Instances] Qualified "${folder}" as an instance (heuristics)`);
    } catch {
      // profile write failed — still treat as an instance for this scan
    }
    return profile;
  }

  private async looksLikeGameDirectory(dir: string): Promise<boolean> {
    const exists = async (rel: string): Promise<boolean> => {
      try {
        await access(join(dir, rel));
        return true;
      } catch {
        return false;
      }
    };
    if ((await exists('options.txt')) && (await exists('servers.dat'))) return true;
    for (const sub of ['mods', 'logs', 'saves']) {
      try {
        const entries = await readdir(join(dir, sub));
        if (entries.length > 0) return true;
      } catch {
        // subdir missing — not evidence of a game dir
      }
    }
    return false;
  }

  // ── Helpers ──

  private async tryReadProfile(folder: string): Promise<ModpackProfile | null> {
    try {
      const dir = this.paths.modpackDirectory(folder);
      const raw = await readFile(join(dir, 'profile.json'), 'utf8');
      const json = JSON.parse(raw);
      // Migrate v1 profile format to v2. The folder name is ALWAYS the id —
      // any legacy id in the JSON is ignored.
      const migrated = {
        id: folder,
        name: json.name ?? folder,
        description: json.description ?? '',
        minecraftVersion: json.minecraftVersion ?? json.mcVersion ?? '',
        loader: (json.loader ?? 'vanilla').toLowerCase(),
        loaderVersion: json.loaderVersion ?? undefined,
        iconPath: json.iconPath ?? undefined,
        createdAt: json.createdAt ?? Date.now(),
        updatedAt: json.updatedAt ?? Date.now(),
        lastPlayedAt: this.toEpochMs(json.lastPlayedAt),
        playtimeSeconds: json.playtimeSeconds ?? 0,
        mods: json.mods ?? [],
      };
      return ModpackSchema.profile.parse(migrated);
    } catch {
      return null;
    }
  }

  private async listDiskFiles(instanceDir: string, subdir: string, extensions: string | string[]): Promise<Array<{ filename: string; path: string }>> {
    const extArray = Array.isArray(extensions) ? extensions : [extensions];
    try {
      const dir = join(instanceDir, subdir);
      const files = await readdir(dir);
      return files
        .filter((f) => extArray.some((ext) => f.endsWith(ext)))
        .map((filename) => ({ filename, path: join(dir, filename) }));
    } catch {
      return [];
    }
  }

  private async countMods(instanceDir: string): Promise<number> {
    try {
      const modsDir = join(instanceDir, 'mods');
      const files = await readdir(modsDir);
      return files.filter((f) => f.endsWith('.jar')).length;
    } catch {
      return 0;
    }
  }

  private emptyProfile(folder: string): ModpackProfile {
    return {
      id: folder,
      name: folder,
      description: '',
      minecraftVersion: '',
      loader: 'vanilla',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playtimeSeconds: 0,
      mods: [],
    };
  }

  /**
   * Normalize a timestamp to epoch ms. Accepts numbers (as-is) and ISO/parseable
   * strings (v1 profile format); returns undefined for null, empty, or garbage —
   * matching the `lastPlayedAt?: number` contract.
   */
  private toEpochMs(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value) {
      const t = Date.parse(value);
      return Number.isNaN(t) ? undefined : t;
    }
    return undefined;
  }
}
