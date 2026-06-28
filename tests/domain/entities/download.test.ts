import { describe, it, expect } from 'vitest';
import { DownloadItemEntity } from '@/domain/entities/download';

describe('DownloadItemEntity', () => {
  it('stores url/targetPath/filename', () => {
    const item = new DownloadItemEntity('https://x/y.jar', '/tmp/y.jar', 'y.jar');
    expect(item.url).toBe('https://x/y.jar');
    expect(item.targetPath).toBe('/tmp/y.jar');
    expect(item.filename).toBe('y.jar');
  });

  it('hasIntegrity is true when sha1 is provided', () => {
    expect(new DownloadItemEntity('u', 'p', 'f', undefined, 'abc').hasIntegrity).toBe(true);
  });

  it('hasIntegrity is false when sha1 is absent', () => {
    expect(new DownloadItemEntity('u', 'p', 'f').hasIntegrity).toBe(false);
  });

  it('requiresVerification mirrors hasIntegrity', () => {
    expect(new DownloadItemEntity('u', 'p', 'f', undefined, 'abc').requiresVerification).toBe(true);
    expect(new DownloadItemEntity('u', 'p', 'f').requiresVerification).toBe(false);
  });

  it('defaults skipIfPresent to true', () => {
    expect(new DownloadItemEntity('u', 'p', 'f').skipIfPresent).toBe(true);
  });

  it('allows skipIfPresent to be overridden', () => {
    expect(new DownloadItemEntity('u', 'p', 'f', undefined, undefined, false).skipIfPresent).toBe(false);
  });
});
