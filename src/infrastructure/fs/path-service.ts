import { app } from 'electron';
import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

/**
 * Centralized, validated path service. Replaces v1's ~8 scattered
 * `app.getPath('userData')` + string concatenation sites, several of which
 * were vulnerable to path traversal when modpack ids were user-controlled.
 */
export class PathService {
  private readonly userDataRoot: string;
  private readonly minecraftRootOverride: string | null;

  constructor(minecraftRootOverride: string | null = null) {
    this.userDataRoot = app.getPath('userData');
    this.minecraftRootOverride = minecraftRootOverride;
  }

  get userData(): string {
    return this.userDataRoot;
  }

  get minecraftRoot(): string {
    return this.minecraftRootOverride ?? join(this.userDataRoot, 'minecraft');
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
    return join(this.userDataRoot, 'modpacks');
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
    if (!resolved.startsWith(base)) {
      throw new Error(`Path traversal blocked: ${relativePath}`);
    }
    return resolved;
  }
}
