import { describe, it, expect } from 'vitest';
import { VersionEntity, ResolvedVersionEntity } from '@/domain/entities/version';
import type { MinecraftVersion } from '@shared/types';

function v(type: MinecraftVersion['type']): MinecraftVersion {
  return { id: '1.20.1', type, url: 'https://x', time: 't', releaseTime: 't' };
}

describe('VersionEntity', () => {
  it('exposes id/type/url/time/releaseTime', () => {
    const e = new VersionEntity('1.20.1', 'release', 'https://x', 't', 'rt');
    expect(e.id).toBe('1.20.1');
    expect(e.type).toBe('release');
    expect(e.url).toBe('https://x');
    expect(e.time).toBe('t');
    expect(e.releaseTime).toBe('rt');
  });

  it('isRelease is true only for release type', () => {
    expect(new VersionEntity('1', 'release', 'u', 't', 't').isRelease).toBe(true);
    expect(new VersionEntity('1', 'snapshot', 'u', 't', 't').isRelease).toBe(false);
  });

  it('isSnapshot is true only for snapshot type', () => {
    expect(new VersionEntity('1', 'snapshot', 'u', 't', 't').isSnapshot).toBe(true);
    expect(new VersionEntity('1', 'release', 'u', 't', 't').isSnapshot).toBe(false);
  });

  it('isLegacy is true for old_beta and old_alpha', () => {
    expect(new VersionEntity('b1.7', 'old_beta', 'u', 't', 't').isLegacy).toBe(true);
    expect(new VersionEntity('a1.0', 'old_alpha', 'u', 't', 't').isLegacy).toBe(true);
    expect(new VersionEntity('1.20', 'release', 'u', 't', 't').isLegacy).toBe(false);
  });
});

describe('ResolvedVersionEntity', () => {
  it('isVanilla is true when no loader is present', () => {
    const mc = new VersionEntity('1', 'release', 'u', 't', 't');
    expect(new ResolvedVersionEntity(mc, null).isVanilla).toBe(true);
  });

  it('isVanilla is false when a loader is present', () => {
    const mc = new VersionEntity('1', 'release', 'u', 't', 't');
    const resolved = new ResolvedVersionEntity(mc, { loader: 'fabric', version: '0.15', stable: true });
    expect(resolved.isVanilla).toBe(false);
    expect(resolved.loader?.loader).toBe('fabric');
  });
});
