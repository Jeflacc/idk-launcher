import { describe, it, expect } from 'vitest';
import { VersionSchema } from '@shared/schemas/version.schema';

describe('VersionSchema.version', () => {
  it('accepts a valid version', () => {
    const r = VersionSchema.version.safeParse({
      id: '1.20.1',
      type: 'release',
      url: 'https://x',
      time: 't',
      releaseTime: 't',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an invalid type', () => {
    const r = VersionSchema.version.safeParse({
      id: '1.20.1',
      type: 'custom',
      url: 'https://x',
      time: 't',
      releaseTime: 't',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-url url', () => {
    const r = VersionSchema.version.safeParse({
      id: '1.20.1',
      type: 'release',
      url: 'not-a-url',
      time: 't',
      releaseTime: 't',
    });
    expect(r.success).toBe(false);
  });
});

describe('VersionSchema.manifest', () => {
  it('parses a manifest with latest + versions array', () => {
    const r = VersionSchema.manifest.safeParse({
      latest: { release: '1.20.1', snapshot: '23w13a' },
      versions: [
        { id: '1.20.1', type: 'release', url: 'https://x', time: 't', releaseTime: 't' },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe('VersionSchema.downloadRequest', () => {
  it('defaults loader to vanilla when omitted', () => {
    const r = VersionSchema.downloadRequest.parse({ versionId: '1.20.1' });
    expect(r.loader).toBe('vanilla');
  });

  it('accepts a loader + loaderVersion', () => {
    const r = VersionSchema.downloadRequest.parse({
      versionId: '1.20.1',
      loader: 'fabric',
      loaderVersion: '0.15',
    });
    expect(r.loader).toBe('fabric');
    expect(r.loaderVersion).toBe('0.15');
  });
});
