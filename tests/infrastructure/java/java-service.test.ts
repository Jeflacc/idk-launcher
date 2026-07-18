import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platform } from 'node:os';
import { JavaService } from '@/infrastructure/java/java-service';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { HttpClient } from '@/infrastructure/net/http-client';

function mockPaths(): PathService {
  return {
    cache: '/tmp/cache',
    minecraftRoot: '/tmp/mc',
  } as unknown as PathService;
}

function mockHttp(): HttpClient {
  return {
    getJson: vi.fn(),
    downloadFile: vi.fn(),
  } as unknown as HttpClient;
}

describe('JavaService', () => {
  let service: JavaService;
  let http: HttpClient;

  beforeEach(() => {
    http = mockHttp();
  });

  it('ensure returns a detected Java when one exists', async () => {
    // Mock the detector to return a found Java.
    const { JavaDetector } = await import('@/infrastructure/fs/java-detector');
    vi.spyOn(JavaDetector.prototype, 'detect').mockResolvedValue([
      { path: '/usr/bin/java', version: '21', majorVersion: 21, source: 'system' },
    ]);

    service = new JavaService(mockPaths(), http);
    const result = await service.ensure(17);
    expect(result.path).toBe('/usr/bin/java');
    expect(result.source).toBe('system');
  });

  it('ensure downloads from Adoptium when no local Java is found', async () => {
    const { JavaDetector } = await import('@/infrastructure/fs/java-detector');
    vi.spyOn(JavaDetector.prototype, 'detect').mockResolvedValue([]);

    vi.mocked(http.getJson).mockResolvedValue([
      {
        binary: { package: { name: 'java-17.tar.gz', link: 'https://api.adoptium.net/x' }, size: 1000 },
        version: '17.0.1',
      },
    ]);
    vi.mocked(http.downloadFile).mockResolvedValue(undefined);

    service = new JavaService(mockPaths(), http);
    const result = await service.ensure(17);

    expect(http.getJson).toHaveBeenCalled();
    expect(http.downloadFile).toHaveBeenCalledWith(
      'https://api.adoptium.net/x',
      expect.any(String),
      expect.objectContaining({ expectedSize: 1000 }),
    );
    expect(result.source).toBe('adoptium');
    expect(result.version).toBe('17.0.1');
  });

  it('ensure throws when Adoptium returns no assets', async () => {
    const { JavaDetector } = await import('@/infrastructure/fs/java-detector');
    vi.spyOn(JavaDetector.prototype, 'detect').mockResolvedValue([]);
    vi.mocked(http.getJson).mockResolvedValue([]);

    service = new JavaService(mockPaths(), http);
    await expect(service.ensure(17)).rejects.toThrow(/No Adoptium JRE found/);
  });

  it('isValidJava returns true for an existing file', async () => {
    service = new JavaService(mockPaths(), http);
    // Use a path that exists on all platforms
    const existingPath = platform() === 'win32' ? process.execPath : '/proc/self/exe';
    const result = await service.isValidJava(existingPath);
    expect(result).toBe(true);
  });

  it('isValidJava returns false for a nonexistent path', async () => {
    service = new JavaService(mockPaths(), http);
    const result = await service.isValidJava('/nonexistent/java/bin/java');
    expect(result).toBe(false);
  });
});
