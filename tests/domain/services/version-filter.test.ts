import { describe, it, expect } from 'vitest';
import { VersionFilterService } from '@/domain/services/version-filter';
import type { MinecraftVersion } from '@shared/types';

const svc = new VersionFilterService();

const versions: MinecraftVersion[] = [
  { id: '1.20.1', type: 'release', url: 'u', time: 't', releaseTime: 't' },
  { id: '1.20', type: 'release', url: 'u', time: 't', releaseTime: 't' },
  { id: '23w13a', type: 'snapshot', url: 'u', time: 't', releaseTime: 't' },
  { id: 'b1.7.3', type: 'old_beta', url: 'u', time: 't', releaseTime: 't' },
  { id: 'a1.0.4', type: 'old_alpha', url: 'u', time: 't', releaseTime: 't' },
];

describe('VersionFilterService.filter', () => {
  it('returns all when no filter is provided', () => {
    expect(svc.filter(versions, {})).toHaveLength(5);
  });

  it('filters by type', () => {
    expect(svc.filter(versions, { types: ['release'] })).toHaveLength(2);
    expect(svc.filter(versions, { types: ['snapshot'] })).toHaveLength(1);
    expect(svc.filter(versions, { types: ['old_beta', 'old_alpha'] })).toHaveLength(2);
  });

  it('filters by query (case-insensitive substring)', () => {
    const r = svc.filter(versions, { query: '1.20' });
    expect(r.map((v) => v.id).sort()).toEqual(['1.20', '1.20.1']);
  });

  it('applies limit', () => {
    expect(svc.filter(versions, { limit: 2 })).toHaveLength(2);
  });

  it('combines type + query + limit', () => {
    const r = svc.filter(versions, { types: ['release'], query: '1.20', limit: 1 });
    expect(r).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(svc.filter(versions, { query: 'nonexistent' })).toHaveLength(0);
  });

  it('treats whitespace query as empty', () => {
    expect(svc.filter(versions, { query: '   ' })).toHaveLength(5);
  });
});

describe('VersionFilterService.latestRelease', () => {
  it('returns the first release version', () => {
    expect(svc.latestRelease(versions)?.id).toBe('1.20.1');
  });

  it('returns null when no releases exist', () => {
    expect(svc.latestRelease([versions[2]!])).toBeNull();
  });
});

describe('VersionFilterService.latestSnapshot', () => {
  it('returns the first snapshot version', () => {
    expect(svc.latestSnapshot(versions)?.id).toBe('23w13a');
  });

  it('returns null when no snapshots exist', () => {
    expect(svc.latestSnapshot([versions[0]!])).toBeNull();
  });
});
