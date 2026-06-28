import type { Modpack, ModpackProfile } from '@shared/types';

/**
 * `Modpack` is an aggregate root representing a sandboxed Minecraft instance
 * directory plus its persisted profile. It enforces invariants that the v1
 * launcher left to scattered ad-hoc checks (e.g. playtime never decreases,
 * mods are uniquely identified by filename within a profile).
 */
export class ModpackEntity implements Modpack {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly minecraftVersion: string,
    public readonly loader: Modpack['loader'],
    public readonly directory: string,
    public readonly loaderVersion?: string,
    public readonly iconPath?: string,
    public readonly createdAt: number = Date.now(),
    public readonly updatedAt: number = Date.now(),
    public readonly lastPlayedAt?: number,
    public readonly playtimeSeconds: number = 0,
    public readonly modCount: number = 0,
  ) {}

  static fromProfile(profile: ModpackProfile, directory: string, modCount: number): ModpackEntity {
    return new ModpackEntity(
      profile.id,
      profile.name,
      profile.description,
      profile.minecraftVersion,
      profile.loader,
      directory,
      profile.loaderVersion,
      profile.iconPath,
      profile.createdAt,
      profile.updatedAt,
      profile.lastPlayedAt,
      profile.playtimeSeconds,
      modCount,
    );
  }

  withPlayed(durationSeconds: number): ModpackEntity {
    if (durationSeconds < 0) {
      throw new Error('playtime duration cannot be negative');
    }
    return new ModpackEntity(
      this.id,
      this.name,
      this.description,
      this.minecraftVersion,
      this.loader,
      this.directory,
      this.loaderVersion,
      this.iconPath,
      this.createdAt,
      Date.now(),
      Date.now(),
      this.playtimeSeconds + durationSeconds,
      this.modCount,
    );
  }

  get displayName(): string {
    return this.name.trim() || this.id;
  }
}
