import { app } from 'electron';
import { join, resolve, normalize } from 'node:path';
import { mkdir } from 'node:fs/promises';
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

  get libraries(): string {
    return join(this.minecraftRoot, 'libraries');
  }

  get assets(): string {
    return join(this.minecraftRoot, 'assets');
  }

  get modpacks(): string {
    if (this._modpacks) return this._modpacks;
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
    this._modpacks = join(this.userDataRoot, 'modpacks');
    return this._modpacks;
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

  get frpcBinary(): string {
    return join(this.userDataRoot, 'frp', process.platform === 'win32' ? 'frpc.exe' : 'frpc');
  }

  /**
   * Resolve a modpack directory by id, enforcing that the resolved path stays
   * inside the modpacks root (path-traversal protection).
   */
  modpackDirectory(modpackId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(modpackId)) {
      throw new Error(`Invalid modpack id: ${modpackId}`);
    }
    return join(this.modpacks, modpackId);
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
