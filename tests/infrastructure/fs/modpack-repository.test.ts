import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { PathService } from '@/infrastructure/fs/path-service';

// Mock PathService so we control all paths without touching electron.
function mockPaths(root: string): PathService {
  return {
    modpacks: `${root}/modpacks`,
    modpackDirectory: (id: string) => `${root}/modpacks/${id}`,
    minecraftRoot: `${root}/minecraft`,
    versions: `${root}/minecraft/versions`,
    libraries: `${root}/minecraft/libraries`,
    assets: `${root}/minecraft/assets`,
    cache: `${root}/cache`,
    userData: root,
    settingsFile: `${root}/settings.json`,
    secretsFile: `${root}/secrets.enc`,
    logs: `${root}/logs`,
    frpcBinary: `${root}/frp/frpc`,
    ensureAll: vi.fn(),
    resolveSafeTarget: vi.fn((rootName: string, rel: string) => `${root}/${rootName}/${rel}`),
  } as unknown as PathService;
}

describe('ModpackRepository', () => {
  let repo: ModpackRepository;
  let root: string;

  beforeEach(async () => {
    const os = await import('node:os');
    const path = await import('node:path');
    root = path.join(os.tmpdir(), `idk-test-modpacks-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    repo = new ModpackRepository(mockPaths(root));
  });

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(root, { recursive: true, force: true });
  });

  it('list returns empty array when no modpacks exist', async () => {
    const r = await repo.list();
    expect(r).toEqual([]);
  });

  it('writeProfile creates the directory + mods dir + profile.json', async () => {
    const { pathExists } = await import('./_helpers');
    await repo.writeProfile('mp-1', {
      id: 'mp-1',
      name: 'Test',
      description: '',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
      playtimeSeconds: 0,
      mods: [],
    });
    expect(await pathExists(`${root}/modpacks/mp-1/profile.json`)).toBe(true);
    expect(await pathExists(`${root}/modpacks/mp-1/mods`)).toBe(true);
  });

  it('readProfile returns null when profile does not exist', async () => {
    expect(await repo.readProfile('nonexistent')).toBeNull();
  });

  it('readProfile returns the written profile', async () => {
    await repo.writeProfile('mp-1', {
      id: 'mp-1',
      name: 'Test',
      description: 'desc',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
      playtimeSeconds: 0,
      mods: [],
    });
    const p = await repo.readProfile('mp-1');
    expect(p?.name).toBe('Test');
    expect(p?.minecraftVersion).toBe('1.20.1');
  });

  it('updateProfile merges changes and updates updatedAt', async () => {
    await repo.writeProfile('mp-1', {
      id: 'mp-1',
      name: 'Old',
      description: '',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
      playtimeSeconds: 0,
      mods: [],
    });
    const before = Date.now();
    const updated = await repo.updateProfile('mp-1', { name: 'New' });
    expect(updated.name).toBe('New');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('updateProfile creates a profile if it does not exist', async () => {
    const updated = await repo.updateProfile('new-mp', { name: 'Created' });
    expect(updated.name).toBe('Created');
    expect(updated.minecraftVersion).toBe('');
  });

  it('delete removes the modpack directory', async () => {
    await repo.writeProfile('mp-1', {
      id: 'mp-1',
      name: 'Test',
      description: '',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
      playtimeSeconds: 0,
      mods: [],
    });
    await repo.delete('mp-1');
    expect(await repo.readProfile('mp-1')).toBeNull();
  });

  it('recordPlaytime accumulates playtime', async () => {
    await repo.writeProfile('mp-1', {
      id: 'mp-1',
      name: 'Test',
      description: '',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
      playtimeSeconds: 100,
      mods: [],
    });
    await repo.recordPlaytime('mp-1', 60);
    const p = await repo.readProfile('mp-1');
    expect(p?.playtimeSeconds).toBe(160);
    expect(p?.lastPlayedAt).toBeTruthy();
  });

  it('list returns modpacks sorted by updatedAt desc', async () => {
    await repo.writeProfile('old', {
      id: 'old', name: 'Old', description: '', minecraftVersion: '1.20.1', loader: 'fabric',
      createdAt: 1, updatedAt: 100, playtimeSeconds: 0, mods: [],
    });
    await repo.writeProfile('new', {
      id: 'new', name: 'New', description: '', minecraftVersion: '1.20.1', loader: 'fabric',
      createdAt: 1, updatedAt: 200, playtimeSeconds: 0, mods: [],
    });
    const list = await repo.list();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe('new');
    expect(list[1]!.id).toBe('old');
  });
});

import { afterEach } from 'vitest';
