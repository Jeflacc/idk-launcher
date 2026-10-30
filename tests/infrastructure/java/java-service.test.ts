import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platform, arch } from 'node:os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JavaService } from '@/infrastructure/java/java-service';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { HttpClient } from '@/infrastructure/net/http-client';

let tempRoot: string;

function mockPaths(): PathService {
  return {
    cache: join(tempRoot, 'cache'),
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
    tempRoot = mkdtempSync(join(tmpdir(), 'java-service-test-'));
    http = mockHttp();
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
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
    // Extraction is real disk I/O — mock it out; it is covered by the happy-path
    // behavior of `ensure` returning a JavaInstallation after extraction.
    vi.spyOn(JavaService.prototype as unknown as { extractZip: () => Promise<void> }, 'extractZip')
      .mockResolvedValue(undefined);

    const os = platform() === 'win32' ? 'windows' : platform() === 'darwin' ? 'mac' : 'linux';
    const archName = arch() === 'arm64' ? 'aarch64' : arch();
    vi.mocked(http.getJson).mockResolvedValue([
      {
        binaries: [
          {
            architecture: archName,
            image_type: 'jdk',
            os,
            binary: { package: { name: 'java-17.tar.gz', link: 'https://api.adoptium.net/x' }, size: 1000 },
          },
        ],
      },
    ]);
    vi.mocked(http.downloadFile).mockImplementation(async (url, targetPath) => {
      // Simulate the archive landing at the zip path; the extraction mock below
      // then "installs" a real java binary so the post-extraction check passes.
      const binDir = join(join(targetPath, '..'), 'bin');
      mkdirSync(binDir, { recursive: true });
      writeFileSync(join(binDir, platform() === 'win32' ? 'java.exe' : 'java'), '#!/bin/sh');
    });

    service = new JavaService(mockPaths(), http);
    const result = await service.ensure(17);

    const requestedUrl = vi.mocked(http.getJson).mock.calls[0]![0] as string;
    expect(requestedUrl).toContain('/v3/assets/feature_releases/17/ga');
    expect(requestedUrl).toContain('image_type=jdk');
    expect(http.downloadFile).toHaveBeenCalledWith(
      'https://api.adoptium.net/x',
      expect.any(String),
      expect.objectContaining({ expectedSize: 1000 }),
    );
    expect(result.source).toBe('adoptium');
    expect(result.version).toBe('17');
    expect(result.path).toMatch(/bin[/\\]java(\.exe)?$/);
  });

  it('ensure throws when Adoptium returns no assets', async () => {
    const { JavaDetector } = await import('@/infrastructure/fs/java-detector');
    vi.spyOn(JavaDetector.prototype, 'detect').mockResolvedValue([]);
    vi.mocked(http.getJson).mockResolvedValue([]);

    service = new JavaService(mockPaths(), http);
    await expect(service.ensure(17)).rejects.toThrow(/No Adoptium JDK found/);
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
