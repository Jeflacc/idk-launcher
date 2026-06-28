import type { MinecraftVersion, ModLoader } from '@shared/types';

export class VersionEntity implements MinecraftVersion {
  constructor(
    public readonly id: string,
    public readonly type: MinecraftVersion['type'],
    public readonly url: string,
    public readonly time: string,
    public readonly releaseTime: string,
  ) {}

  get isRelease(): boolean {
    return this.type === 'release';
  }

  get isSnapshot(): boolean {
    return this.type === 'snapshot';
  }

  get isLegacy(): boolean {
    return this.type === 'old_beta' || this.type === 'old_alpha';
  }
}

export class ResolvedVersionEntity {
  constructor(
    public readonly minecraft: VersionEntity,
    public readonly loader: { loader: ModLoader; version: string; stable: boolean } | null,
  ) {}

  get isVanilla(): boolean {
    return this.loader === null;
  }
}
