import { app } from 'electron';
import { join, resolve, normalize } from 'node:path';
import { mkdir, rename } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';

/**
 * Centralized, validated path service. Replaces v1's ~8 scattered
 * `app.getPath('userData')` + string concatenation sites, several of which
 * were vulnerable to path traversal when modpack ids were user-controlled.
 */
export class PathService {
  private readonly userDataRoot: string;
  private readonly minecraftRootOverride: string | null;
  private _modpacks: string | null = null;

  constructor(minecraftRootOverride: string | null = null) {
    this.userDataRoot = app.getPath('userData');
    this.minecraftRootOverride = minecraftRootOverride;
  }

  get userData(): string {
    return this.userDataRoot;
  }

  get minecraftRoot(): string {
    if (this.minecraftRootOverride) return this.minecraftRootOverride;
    // v1 used minecraft-data/ as the root. Use it if it exists.
    const v1Root = join(this.userDataRoot, 'minecraft-data');
    try {
      if (existsSync(v1Root)) {
        const entries = readdirSync(v1Root, { withFileTypes: true });
        if (entries.some((e) => e.isDirectory() && e.name === 'versions')) return v1Root;
      }
    } catch { /* fall through */ }
    return join(this.userDataRoot, 'minecraft');
  }

  get versions(): string {
    return join(this.minecraftRoot, 'versions');
  }

  /** v1 bundled Java runtimes (`<root>/runtimes/jre-8`, `jre-21`, `jre-25`, ...). */
  get runtimes(): string {
    return join(this.minecraftRoot, 'runtimes');
  }

  get libraries(): string {
    return join(this.minecraftRoot, 'libraries');
  }

  get assets(): string {
    return join(this.minecraftRoot, 'assets');
  }

  get modpacks(): string {
    if (this._modpacks) return this._modpacks;
    // v2 default: instances live under <minecraftRoot>/instances.
    // v1 stored modpack profiles in minecraft-data/profiles/. Use it for backward compat.
    const v1Profiles = join(this.userDataRoot, 'minecraft-data', 'profiles');
    try {
      if (existsSync(v1Profiles)) {
        const entries = readdirSync(v1Profiles, { withFileTypes: true });
        if (entries.some((e) => e.isDirectory())) {
          this._modpacks = v1Profiles;
          return this._modpacks;
        }
      }
    } catch { /* v1 dir doesn't exist — use v2 */ }
    this._modpacks = join(this.minecraftRoot, 'instances');
    return this._modpacks;
  }

  /** Alias for `modpacks` — instances live under <minecraftRoot>/instances. */
  get instances(): string {
    return this.modpacks;
  }

  get cache(): string {
    return join(this.userDataRoot, 'cache');
  }

  get logs(): string {
    return join(this.userDataRoot, 'logs');
  }

  get settingsFile(): string {
    return join(this.userDataRoot, 'settings.json');
  }

  get secretsFile(): string {
    return join(this.userDataRoot, 'secrets.enc');
  }

  /** v1 path of the authlib-injector jar (Ely.by auth). Shared across instances. */
  get authlibInjectorJar(): string {
    return join(this.minecraftRoot, 'authlib-injector.jar');
  }

  get frpcBinary(): string {
    return join(this.userDataRoot, 'frp', process.platform === 'win32' ? 'frpc.exe' : 'frpc');
  }

  /**
   * Validate an instance folder name. Folder names are cosmetic — the user can
   * pick anything that's a legal single path segment (spaces, unicode, etc.).
   * Only separators, drive/windows-reserved chars, and dot-paths are rejected,
   * which keeps path traversal blocked.
   */
  validateInstanceFolder(folder: string): string {
    const name = folder.trim();
    if (!name || name === '.' || name === '..') {
      throw new Error(`Invalid instance folder: ${folder}`);
    }
    if (/[\\/:*?"<>|]/.test(name)) {
      throw new Error(`Invalid instance folder (reserved characters): ${folder}`);
    }
    if (name.length > 120) {
      throw new Error(`Instance folder name too long (max 120 chars): ${folder}`);
    }
    return name;
  }

  /**
   * Resolve an instance (modpack/version profile) directory by folder name,
   * enforcing that the resolved path stays inside the instances root
   * (path-traversal protection).
   */
  modpackDirectory(modpackId: string): string {
    const folder = this.validateInstanceFolder(modpackId);
    return join(this.modpacks, folder);
  }

  /**
   * Rename an instance folder on disk. Both names are validated; the target
   * must not already exist. The caller is responsible for making sure no game
   * is currently running from this instance (see GameSession/running guard).
   */
  async renameInstanceFolder(from: string, to: string): Promise<string> {
    const oldName = this.validateInstanceFolder(from);
    const newName = this.validateInstanceFolder(to);
    if (oldName === newName) return oldName;
    const oldDir = join(this.modpacks, oldName);
    const newDir = join(this.modpacks, newName);
    if (!existsSync(oldDir)) {
      throw new Error(`Instance folder not found: ${oldName}`);
    }
    if (existsSync(newDir)) {
      throw new Error(`An instance named "${newName}" already exists`);
    }
    await rename(oldDir, newDir);
    return newName;
  }

  async ensureAll(): Promise<void> {
    for (const dir of [
      this.userDataRoot,
      this.minecraftRoot,
      this.versions,
      this.libraries,
      this.assets,
      this.modpacks,
      this.cache,
      this.logs,
    ]) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Resolve a target download path, clamping it to one of the known roots.
   * Used by the download queue to prevent files escaping their intended dirs.
   */
  resolveSafeTarget(root: 'versions' | 'libraries' | 'assets' | 'modpacks' | 'cache', relativePath: string): string {
    const base =
      root === 'versions'
        ? this.versions
        : root === 'libraries'
          ? this.libraries
          : root === 'assets'
            ? this.assets
            : root === 'modpacks'
              ? this.modpacks
              : this.cache;
    const resolved = resolve(base, relativePath);
    // Normalize both paths to handle Windows drive letters and separator differences
    const normalizedBase = normalize(resolve(base));
    const normalizedResolved = normalize(resolved);
    if (!normalizedResolved.startsWith(normalizedBase)) {
      throw new Error(`Path traversal blocked: ${relativePath}`);
    }
    return resolved;
  }
}
