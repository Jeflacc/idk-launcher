import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { ModpackSchema } from '@shared/schemas/modpack.schema';
import type { ModpackProfile, Modpack } from '@shared/types';
import { PathService } from './path-service';
import type { SecretStore } from '../crypto/secret-store';

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
  /** Fixed config filename stored inside each instance folder. */
  private static readonly CONFIG_FILE = 'idk-config.txt';

  constructor(private readonly paths: PathService, private readonly secrets: SecretStore) {}

  async list(): Promise<Modpack[]> {
    await mkdir(this.paths.modpacks, { recursive: true });
    const entries = await readdir(this.paths.modpacks, { withFileTypes: true });
    const result: Modpack[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      const folder = entry.name;
      const dir = join(this.paths.modpacks, folder);

      // Read the folder-named txt config; create a default one if absent so
      // every folder under instances/ is a first-class modpack.
      let config = await this.readConfig(folder);
      if (!config) {
        config = {
          description: '',
          minecraftVersion: this.inferVersion(folder),
          loader: 'vanilla',
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
        };
        await this.writeConfigTxt(folder, config);
      }

      const modCount = await this.countMods(dir);
      const diskMods = await this.listDiskFiles(dir, 'mods', '.jar');
      const diskResourcepacks = await this.listDiskFiles(dir, 'resourcepacks', ['.zip', '.jar']);
      const diskShaders = await this.listDiskFiles(dir, 'shaderpacks', ['.zip', '.jar']);

      // Detect version/loader from official config files when not set
      const detected = await this.detectVersionAndLoader(dir, folder, config);

      // Persist detected values back to idk-config.txt so they survive refreshes
      if (
        detected.minecraftVersion !== config.minecraftVersion ||
        detected.loader !== config.loader ||
        detected.loaderVersion !== config.loaderVersion
      ) {
        await this.writeConfigTxt(folder, {
          ...config,
          minecraftVersion: detected.minecraftVersion,
          loader: detected.loader as 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge',
          loaderVersion: detected.loaderVersion,
        });
      }

      result.push({
        id: folder,
        // Name comes ONLY from the folder name — never from config content.
        name: folder,
        description: config.description ?? '',
        minecraftVersion: detected.minecraftVersion,
        loader: detected.loader as 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge',
        loaderVersion: detected.loaderVersion ?? config.loaderVersion,
        iconPath: config.iconPath,
        directory: dir,
        createdAt: config.createdAt ?? Date.now(),
        updatedAt: config.updatedAt ?? Date.now(),
        lastPlayedAt: config.lastPlayedAt,
        playtimeSeconds: config.playtimeSeconds ?? 0,
        favorite: config.favorite ?? false,
        javaArgs: config.javaArgs ?? '',
        windowWidth: config.windowWidth ?? 1024,
        windowHeight: config.windowHeight ?? 768,
        modCount,
        diskMods,
        diskResourcepacks,
        diskShaders,
      });
    }
    return result.sort((a, b) => (b.updatedAt - a.updatedAt));
  }

  /** Infer a Minecraft version from a folder name like "Fabulously Optimized 1.20.1" or "1.20.1". */
  private inferVersion(folder: string): string {
    const m = /(\d+\.\d+(?:\.\d+)?)/.exec(folder);
    return m?.[1] ?? '';
  }

  /**
   * Detect Minecraft version and loader from official modpack config files,
   * checking in priority order:
   *  1. idk-config.txt / profile.json (our config — only if loader was explicitly set, not just 'vanilla' default)
   *  2. modrinth.index.json (Modrinth modpacks)
   *  3. manifest.json (CurseForge modpacks)
   *  4. Folder name fallback (inferVersion)
   */
  private async detectVersionAndLoader(
    dir: string,
    folder: string,
    config: Partial<ModpackProfile>,
  ): Promise<{ minecraftVersion: string; loader: string; loaderVersion?: string }> {
    // 1. Use config values only if loader was explicitly set (not just 'vanilla' default)
    if (config.minecraftVersion && config.loader && config.loader !== 'vanilla') {
      return {
        minecraftVersion: config.minecraftVersion,
        loader: config.loader,
        loaderVersion: config.loaderVersion,
      };
    }

    // 2. Try modrinth.index.json (official Modrinth modpack format)
    try {
      const mrPath = join(dir, 'modrinth.index.json');
      const mrRaw = await readFile(mrPath, 'utf8');
      const mr = JSON.parse(mrRaw);
      const versions: string[] | undefined = mr?.minecraft?.versions;
      if (versions && versions.length > 0) {
        const detectedLoader = this.detectLoaderFromModrinthDeps(mr.dependencies);
        return {
          minecraftVersion: versions[0]!,
          loader: detectedLoader,
          loaderVersion: undefined,
        };
      }
    } catch {
      // modrinth.index.json not present or invalid — continue
    }

    // 3. Try manifest.json (official CurseForge modpack format)
    try {
      const mfPath = join(dir, 'manifest.json');
      const mfRaw = await readFile(mfPath, 'utf8');
      const mf = JSON.parse(mfRaw);
      const mcVersion = mf?.minecraft?.version;
      const modLoaders: Array<{ id?: string }> | undefined = mf?.minecraft?.modLoaders;
      if (mcVersion) {
        const detectedLoader = this.detectLoaderFromCurseforge(modLoaders);
        return {
          minecraftVersion: mcVersion,
          loader: detectedLoader,
          loaderVersion: modLoaders?.[0]?.id ? modLoaders[0].id.replace(/^[a-z]+-/, '') : undefined,
        };
      }
    } catch {
      // manifest.json not present or invalid — continue
    }

    // 4. Fall back to folder name inference
    const inferredVersion = this.inferVersion(folder);
    return {
      minecraftVersion: inferredVersion,
      loader: config.loader ?? 'vanilla',
      loaderVersion: undefined,
    };
  }

  /** Detect loader from Modrinth index.json dependencies array. */
  private detectLoaderFromModrinthDeps(deps: unknown): string {
    if (!Array.isArray(deps)) return 'vanilla';
    for (const dep of deps) {
      if (typeof dep !== 'object' || dep === null) continue;
      const id = (dep as { id?: string; type?: string }).id;
      const type = (dep as { type?: string }).type;
      if (type === 'loader' || id?.includes('-loader')) {
        const lid = String(id || '').toLowerCase();
        if (lid.includes('fabric')) return 'fabric';
        if (lid.includes('forge')) return 'forge';
        if (lid.includes('quilt')) return 'quilt';
        if (lid.includes('neoforge')) return 'neoforge';
      }
    }
    return 'vanilla';
  }

  /** Detect loader from CurseForge manifest.json modLoaders array. */
  private detectLoaderFromCurseforge(modLoaders: unknown): string {
    if (!Array.isArray(modLoaders)) return 'vanilla';
    for (const ml of modLoaders) {
      if (typeof ml !== 'object' || ml === null) continue;
      const id = String((ml as { id?: string }).id || '').toLowerCase();
      if (id.includes('fabric')) return 'fabric';
      if (id.includes('forge')) return 'forge';
      if (id.includes('quilt')) return 'quilt';
      if (id.includes('neoforge')) return 'neoforge';
    }
    return 'vanilla';
  }

  async readProfile(folder: string): Promise<ModpackProfile | null> {
    return this.tryReadProfile(folder);
  }

  async writeProfile(folder: string, profile: ModpackProfile): Promise<void> {
    const dir = this.paths.modpackDirectory(folder);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'mods'), { recursive: true });
    await writeFile(join(dir, 'profile.json'), JSON.stringify(profile, null, 2), 'utf8');
    // Persist a folder-named txt config (<folder>.txt). The config never stores
    // the modpack name — that comes from the folder name. Strip `name` before
    // writing so the file is safe to reuse if the folder is renamed.
    await this.writeConfigTxt(folder, profile);
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

  /** Delete a downloaded version folder from the shared versions dir. */
  async deleteVersion(versionId: string): Promise<void> {
    const dir = join(this.paths.versions, versionId);
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
      // Also update the account name in SecretStore so loadProfilesFromDisk()
      // picks up the renamed account instead of resurrecting the old name
    const s = await this.secrets.load();
    const accounts = s.accounts ?? [];
    const existing = accounts.find((a) => a.id === folder);
    if (existing) {
      existing.username = newName;
      await this.secrets.save(s);
    }
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

  // ── Helpers ──

  /**
   * Read config for a folder from <folder>.txt, falling back to legacy
   * profile.json. Returns config fields WITHOUT `name` — the name always
   * comes from the folder name.
   */
  private async readConfig(folder: string): Promise<Partial<ModpackProfile> | null> {
    const txt = await this.readConfigTxt(folder);
    if (txt) return txt;
    try {
      const dir = this.paths.modpackDirectory(folder);
      const raw = await readFile(join(dir, 'profile.json'), 'utf8');
      const json = JSON.parse(raw);
      // Folder name is ALWAYS the id/name — any legacy id/name in JSON ignored.
      return {
        description: json.description ?? '',
        minecraftVersion: json.minecraftVersion ?? json.mcVersion ?? '',
        loader: (json.loader ?? 'vanilla').toLowerCase(),
        loaderVersion: json.loaderVersion,
        iconPath: json.iconPath ?? undefined,
        createdAt: json.createdAt ?? Date.now(),
        updatedAt: json.updatedAt ?? Date.now(),
        lastPlayedAt: this.toEpochMs(json.lastPlayedAt),
        playtimeSeconds: json.playtimeSeconds ?? 0,
        favorite: json.favorite ?? false,
        javaArgs: json.javaArgs ?? '',
        windowWidth: json.windowWidth ?? 1024,
        windowHeight: json.windowHeight ?? 768,
        mods: json.mods ?? [],
      };
    } catch {
      return null;
    }
  }

  /** Read the fixed idk-config.txt config without `name`. */
  private async readConfigTxt(folder: string): Promise<Partial<ModpackProfile> | null> {
    try {
      const dir = this.paths.modpackDirectory(folder);
      const raw = await readFile(join(dir, ModpackRepository.CONFIG_FILE), 'utf8');
      const json = JSON.parse(raw);
      return {
        description: json.description ?? '',
        minecraftVersion: json.minecraftVersion ?? '',
        loader: (json.loader ?? 'vanilla').toLowerCase(),
        loaderVersion: json.loaderVersion,
        iconPath: json.iconPath,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
        lastPlayedAt: this.toEpochMs(json.lastPlayedAt),
        playtimeSeconds: json.playtimeSeconds ?? 0,
        favorite: json.favorite ?? false,
        javaArgs: json.javaArgs ?? '',
        windowWidth: json.windowWidth ?? 1024,
        windowHeight: json.windowHeight ?? 768,
        mods: json.mods ?? [],
      };
    } catch {
      return null;
    }
  }

  /** Write the fixed idk-config.txt config, stripping `name` (folder owns the name). */
  private async writeConfigTxt(folder: string, config: Partial<ModpackProfile>): Promise<void> {
    const dir = this.paths.modpackDirectory(folder);
    const { name, ...rest } = config as { name?: string; [key: string]: unknown };
    await writeFile(join(dir, ModpackRepository.CONFIG_FILE), JSON.stringify(rest, null, 2), 'utf8');
  }

  private async tryReadProfile(folder: string): Promise<ModpackProfile | null> {
    const config = await this.readConfig(folder);
    if (!config) return null;
    // Name comes from the folder, never from config content.
    return { id: folder, name: folder, ...config } as ModpackProfile;
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
