import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join, sep } from 'node:path';

// Mock electron before importing PathService.
vi.mock('electron', () => ({
  app: { getPath: vi.fn((name: string) => `/tmp/test-data/${name}`) },
}));

// Import AFTER the mock is registered.
const { PathService } = await import('@/infrastructure/fs/path-service');

describe('PathService', () => {
  let paths: InstanceType<typeof PathService>;

  beforeEach(() => {
    paths = new PathService(null);
  });

  it('userData returns the userData path from electron', () => {
    expect(paths.userData).toContain('userData');
  });

  it('minecraftRoot defaults to userData/minecraft', () => {
    expect(paths.minecraftRoot).toContain(join('userData', 'minecraft'));
  });

  it('versions is under minecraftRoot', () => {
    expect(paths.versions).toContain(join('minecraft', 'versions'));
  });

  it('libraries is under minecraftRoot', () => {
    expect(paths.libraries).toContain(join('minecraft', 'libraries'));
  });

  it('assets is under minecraftRoot', () => {
    expect(paths.assets).toContain(join('minecraft', 'assets'));
  });

  it('modpacks (instances) is under userData', () => {
    expect(paths.modpacks).toContain(join('minecraft', 'instances'));
    expect(paths.instances).toBe(paths.modpacks);
  });

  it('settingsFile ends with settings.json', () => {
    expect(paths.settingsFile.endsWith('settings.json')).toBe(true);
  });

  it('secretsFile ends with secrets.enc', () => {
    expect(paths.secretsFile.endsWith('secrets.enc')).toBe(true);
  });

  describe('modpackDirectory (path-traversal protection)', () => {
    it('accepts a valid alphanumeric id', () => {
      const p = paths.modpackDirectory('my-pack-1');
      expect(p).toContain('my-pack-1');
    });

    it('rejects path traversal via ..', () => {
      expect(() => paths.modpackDirectory('../etc/passwd')).toThrow(/Invalid instance folder/);
    });

    it('rejects windows-style traversal', () => {
      expect(() => paths.modpackDirectory('..\\..\\etc\\passwd')).toThrow(/Invalid instance folder/);
    });

    // Folder names are cosmetic — friendly names with spaces/unicode are legal.
    it('accepts a folder name with spaces', () => {
      expect(() => paths.modpackDirectory('My Pack')).not.toThrow();
    });

    it('accepts a folder name with dots', () => {
      expect(() => paths.modpackDirectory('my.pack')).not.toThrow();
    });

    it('rejects a bare dot folder', () => {
      expect(() => paths.modpackDirectory('.')).toThrow(/Invalid instance folder/);
    });

    it('rejects reserved windows characters', () => {
      expect(() => paths.modpackDirectory('a:b')).toThrow(/Invalid instance folder/);
      expect(() => paths.modpackDirectory('a*b')).toThrow(/Invalid instance folder/);
      expect(() => paths.modpackDirectory('a?b')).toThrow(/Invalid instance folder/);
    });

    it('trims surrounding whitespace', () => {
      const p = paths.modpackDirectory('  My Pack  ');
      expect(p).toContain('My Pack');
    });

    it('accepts underscores and hyphens', () => {
      expect(() => paths.modpackDirectory('valid_id-1')).not.toThrow();
    });
  });

  describe('resolveSafeTarget (path-traversal protection)', () => {
    it('resolves a normal relative path', () => {
      const p = paths.resolveSafeTarget('versions', '1.20.1/1.20.1.json');
      expect(p).toContain('1.20.1');
    });

    it('rejects path traversal via ..', () => {
      expect(() => paths.resolveSafeTarget('versions', '../../etc/passwd')).toThrow(/Path traversal/);
    });

    it('works for each known root', () => {
      for (const root of ['versions', 'libraries', 'assets', 'modpacks', 'cache'] as const) {
        const p = paths.resolveSafeTarget(root, 'sub/file');
        expect(p).toBeTruthy();
      }
    });
  });

  describe('minecraftRootOverride', () => {
    it('uses the override when provided', () => {
      const p = new PathService('/custom/mc-root');
      expect(p.minecraftRoot).toBe('/custom/mc-root');
    });
  });
});
