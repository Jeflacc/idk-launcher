import { describe, it, expect } from 'vitest';
import { ModpackEntity } from '@/domain/entities/modpack';
import type { ModpackProfile } from '@shared/types';

function baseProfile(id = 'mp-1'): ModpackProfile {
  return {
    id,
    name: 'Test Pack',
    description: 'A test modpack',
    minecraftVersion: '1.20.1',
    loader: 'fabric',
    createdAt: 1_000,
    updatedAt: 1_000,
    playtimeSeconds: 0,
    mods: [],
  };
}

describe('ModpackEntity', () => {
  describe('fromProfile', () => {
    it('builds an entity from a profile + directory + mod count', () => {
      const e = ModpackEntity.fromProfile(baseProfile(), '/data/modpacks/mp-1', 5);
      expect(e.id).toBe('mp-1');
      expect(e.directory).toBe('/data/modpacks/mp-1');
      expect(e.modCount).toBe(5);
      expect(e.minecraftVersion).toBe('1.20.1');
      expect(e.loader).toBe('fabric');
    });
  });

  describe('withPlayed', () => {
    it('adds playtime and updates lastPlayedAt + updatedAt', () => {
      const e = ModpackEntity.fromProfile(baseProfile(), '/d', 0);
      const before = Date.now();
      const updated = e.withPlayed(120);
      const after = Date.now();

      expect(updated.playtimeSeconds).toBe(120);
      expect(updated.lastPlayedAt).toBeGreaterThanOrEqual(before);
      expect(updated.lastPlayedAt).toBeLessThanOrEqual(after);
      expect(updated.updatedAt).toBe(updated.lastPlayedAt);
    });

    it('accumulates playtime across multiple plays', () => {
      const e = ModpackEntity.fromProfile(baseProfile(), '/d', 0);
      const a = e.withPlayed(60);
      const b = a.withPlayed(90);
      expect(b.playtimeSeconds).toBe(150);
    });

    it('throws when duration is negative', () => {
      const e = ModpackEntity.fromProfile(baseProfile(), '/d', 0);
      expect(() => e.withPlayed(-1)).toThrow(/cannot be negative/i);
    });

    it('does not mutate the original entity (immutability)', () => {
      const e = ModpackEntity.fromProfile(baseProfile(), '/d', 0);
      e.withPlayed(60);
      expect(e.playtimeSeconds).toBe(0);
    });
  });

  describe('displayName', () => {
    it('returns the trimmed name', () => {
      const e = ModpackEntity.fromProfile({ ...baseProfile(), name: '  Skyblock  ' }, '/d', 0);
      expect(e.displayName).toBe('Skyblock');
    });

    it('falls back to id when name is blank', () => {
      const e = ModpackEntity.fromProfile({ ...baseProfile(), name: '   ' }, '/d', 0);
      expect(e.displayName).toBe('mp-1');
    });
  });
});
