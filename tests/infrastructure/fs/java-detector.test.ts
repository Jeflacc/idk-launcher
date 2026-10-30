import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JavaDetector, parseJavaMajorFromOutput } from '@/infrastructure/fs/java-detector';

describe('parseJavaMajorFromOutput', () => {
  it('parses modern version output', () => {
    expect(parseJavaMajorFromOutput('openjdk version "25.0.3" 2026-04-21 LTS')).toBe(25);
    expect(parseJavaMajorFromOutput('openjdk version "21.0.2" 2024-01-16 LTS')).toBe(21);
    expect(parseJavaMajorFromOutput('java version "17.0.1" 2021-10-19 LTS')).toBe(17);
  });

  it('parses legacy 1.x version output (1.8.0 → Java 8)', () => {
    expect(parseJavaMajorFromOutput('java version "1.8.0_432"')).toBe(8);
    expect(parseJavaMajorFromOutput('openjdk version "1.7.0_80"')).toBe(7);
  });

  it('returns null for garbage output', () => {
    expect(parseJavaMajorFromOutput('')).toBeNull();
    expect(parseJavaMajorFromOutput('not a java at all')).toBeNull();
  });
});

describe('JavaDetector', () => {
  describe('with a custom path that exists', () => {
    it('returns only the custom path', async () => {
      const detector = new JavaDetector('/usr/bin/java');
      // Mock the internal pathExists to return true for the custom path.
      vi.spyOn(detector as unknown as { pathExists: (p: string) => Promise<boolean> }, 'pathExists')
        .mockResolvedValue(true);

      const results = await detector.detect();
      expect(results).toHaveLength(1);
      expect(results[0]!.path).toBe('/usr/bin/java');
      expect(results[0]!.source).toBe('custom');
    });
  });

  describe('with a custom path that does not exist', () => {
    it('falls back to system candidates', async () => {
      const detector = new JavaDetector('/nonexistent/java');
      const detectorAny = detector as unknown as {
        pathExists: (p: string) => Promise<boolean>;
        systemCandidates: () => Promise<JavaInstallation[]>;
      };
      vi.spyOn(detectorAny, 'pathExists').mockImplementation(async (p) =>
        p === '/usr/bin/java',
      );
      vi.spyOn(detectorAny, 'systemCandidates').mockResolvedValue([
        { path: '/usr/bin/java', version: null, source: 'system' },
        { path: '/usr/lib/jvm/default-java/bin/java', version: null, source: 'system' },
      ]);

      const results = await detector.detect();
      expect(results).toHaveLength(1);
      expect(results[0]!.path).toBe('/usr/bin/java');
    });
  });

  describe('without a custom path', () => {
    it('returns all candidates that exist', async () => {
      const detector = new JavaDetector(undefined);
      const detectorAny = detector as unknown as {
        pathExists: (p: string) => Promise<boolean>;
        systemCandidates: () => Promise<JavaInstallation[]>;
      };
      vi.spyOn(detectorAny, 'pathExists').mockImplementation(async (p) =>
        p.includes('exists'),
      );
      vi.spyOn(detectorAny, 'systemCandidates').mockResolvedValue([
        { path: '/exists/java', version: '17', source: 'adoptium' },
        { path: '/missing/java', version: '11', source: 'system' },
        { path: '/exists/java2', version: '21', source: 'adoptium' },
      ]);

      const results = await detector.detect();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.path.includes('exists'))).toBe(true);
    });
  });

  describe('JAVA_HOME', () => {
    it('includes the JAVA_HOME path in candidates', async () => {
      process.env['JAVA_HOME'] = '/opt/java';
      const detector = new JavaDetector(undefined);
      const detectorAny = detector as unknown as {
        pathExists: (p: string) => Promise<boolean>;
      };
      vi.spyOn(detectorAny, 'pathExists').mockResolvedValue(true);

      const results = await detector.detect();
      const javaHomeResult = results.find((r) => r.source === 'system');
      expect(javaHomeResult).toBeDefined();
      delete process.env['JAVA_HOME'];
    });
  });

  describe('with a v1 runtimes directory', () => {
    let runtimesDir: string;

    beforeEach(() => {
      runtimesDir = mkdtempSync(join(tmpdir(), 'java-runtimes-'));
      mkdirSync(join(runtimesDir, 'jre-25', 'bin'), { recursive: true });
      writeFileSync(join(runtimesDir, 'jre-25', 'bin', 'java.exe'), '');
      mkdirSync(join(runtimesDir, 'jre-8', 'bin'), { recursive: true });
      writeFileSync(join(runtimesDir, 'jre-8', 'bin', 'java.exe'), '');
    });

    afterEach(() => {
      rmSync(runtimesDir, { recursive: true, force: true });
    });

    it('detects bundled runtimes as temurin candidates and verifies their version', async () => {
      const detector = new JavaDetector(undefined, runtimesDir);
      const detectorAny = detector as unknown as {
        pathExists: (p: string) => Promise<boolean>;
        systemCandidates: () => Promise<JavaInstallation[]>;
        getJavaMajorVersion: (p: string) => Promise<number | null>;
      };
      vi.spyOn(detectorAny, 'systemCandidates').mockResolvedValue([]);
      vi.spyOn(detectorAny, 'pathExists').mockResolvedValue(true);
      vi.spyOn(detectorAny, 'getJavaMajorVersion').mockImplementation(async (p) =>
        p.includes('jre-25') ? 25 : 8,
      );

      const results = await detector.detect();

      expect(results).toHaveLength(2);
      const jre25 = results.find((r) => r.path.includes('jre-25'));
      expect(jre25).toBeDefined();
      expect(jre25!.source).toBe('temurin');
      expect(jre25!.majorVersion).toBe(25);
      expect(jre25!.version).toBe('25');
      expect(jre25!.path).toMatch(/jre-25[/\\]bin[/\\]java\.exe$/);
    });
  });
});

import type { JavaInstallation } from '@/infrastructure/fs/java-detector';
