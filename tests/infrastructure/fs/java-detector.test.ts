import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JavaDetector } from '@/infrastructure/fs/java-detector';

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
});

import type { JavaInstallation } from '@/infrastructure/fs/java-detector';
