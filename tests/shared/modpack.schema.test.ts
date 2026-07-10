import { describe, it, expect } from 'vitest';
import { ModpackSchema } from '@shared/schemas/modpack.schema';

describe('ModpackSchema.profile', () => {
  it('accepts a minimal valid profile', () => {
    const r = ModpackSchema.profile.safeParse({
      id: 'mp-1',
      name: 'Test',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBe('');
      expect(r.data.playtimeSeconds).toBe(0);
      expect(r.data.mods).toEqual([]);
    }
  });

  it('rejects an invalid loader', () => {
    const r = ModpackSchema.profile.safeParse({
      id: 'mp-1',
      name: 'Test',
      minecraftVersion: '1.20.1',
      loader: 'liteloader',
      createdAt: 1,
      updatedAt: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe('ModpackSchema.deleteFolderRequest', () => {
  it('accepts a modpack id', () => {
    const r = ModpackSchema.deleteFolderRequest.safeParse({ modpackId: 'mp-1' });
    expect(r.success).toBe(true);
  });
});

describe('ModpackSchema.updateProfileRequest', () => {
  it('accepts arbitrary changes keyed by string', () => {
    const r = ModpackSchema.updateProfileRequest.safeParse({
      modpackId: 'mp-1',
      changes: { name: 'New', playtimeSeconds: 100 },
    });
    expect(r.success).toBe(true);
  });
});

describe('ModpackSchema.launchRequest', () => {
  it('accepts a modpack id with optional quickConnect', () => {
    expect(ModpackSchema.launchRequest.safeParse({ modpackId: 'mp-1' }).success).toBe(true);
    expect(
      ModpackSchema.launchRequest.safeParse({ modpackId: 'mp-1', quickConnect: 'localhost:25565' }).success,
    ).toBe(true);
  });
});
