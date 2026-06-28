import { describe, it, expect } from 'vitest';
import {
  CrashAnalyzerService,
  DEFAULT_CRASH_PATTERNS,
  type CrashPattern,
} from '@/domain/services/crash-analyzer';

describe('CrashAnalyzerService', () => {
  const analyzer = new CrashAnalyzerService(DEFAULT_CRASH_PATTERNS);

  describe('analyze', () => {
    it('returns unknown category when no patterns match', () => {
      const r = analyzer.analyze('everything is fine');
      expect(r.category).toBe('unknown');
      expect(r.severity).toBe('info');
      expect(r.patterns).toHaveLength(0);
      expect(r.topMatch).toBeNull();
    });

    it('detects a missing mod', () => {
      const r = analyzer.analyze('java.lang.Exception: Missing mod fabric-api');
      expect(r.category).toBe('missing-mod');
      expect(r.missingMods).toContain('fabric-api');
    });

    it('detects out of memory as fatal', () => {
      const r = analyzer.analyze('Exception in thread "main" java.lang.OutOfMemoryError: Java heap space');
      expect(r.category).toBe('memory');
      expect(r.severity).toBe('fatal');
    });

    it('detects outdated java', () => {
      const r = analyzer.analyze('UnsupportedClassVersionError: bad class file');
      expect(r.category).toBe('java-version');
      expect(r.severity).toBe('fatal');
    });

    it('detects duplicate mods', () => {
      const r = analyzer.analyze('Duplicate mod sodium found');
      expect(r.category).toBe('mod-conflict');
    });

    it('detects corrupt jar', () => {
      const r = analyzer.analyze('java.util.zip.ZipException: corrupt jar');
      expect(r.category).toBe('corrupt-install');
    });

    it('detects shader failure', () => {
      const r = analyzer.analyze('Shader compile failed for pass 0');
      expect(r.category).toBe('shader');
      expect(r.severity).toBe('warning');
    });

    it('detects network error', () => {
      const r = analyzer.analyze('Connection timed out while fetching skins');
      expect(r.category).toBe('network');
    });

    it('sorts matched patterns by severity (fatal first)', () => {
      const log = 'java.lang.OutOfMemoryError\nMissing mod foo\nShader compile failed';
      const r = analyzer.analyze(log);
      expect(r.patterns.length).toBeGreaterThanOrEqual(3);
      expect(r.patterns[0]!.severity).toBe('fatal');
    });

    it('returns empty missingMods when no missing-mod pattern matches', () => {
      const r = analyzer.analyze('OutOfMemoryError');
      expect(r.missingMods).toEqual([]);
    });
  });

  describe('with custom patterns', () => {
    const custom: CrashPattern[] = [
      {
        id: 'custom-1',
        pattern: /CUSTOM_SIGNAL_(\w+)/,
        category: 'unknown',
        severity: 'warning',
        title: 'Custom signal',
        description: 'A custom signal was found.',
        remediation: { summary: 'do something' },
      },
    ];
    const customAnalyzer = new CrashAnalyzerService(custom);

    it('uses only the custom pattern set', () => {
      const r = customAnalyzer.analyze('OutOfMemoryError');
      expect(r.patterns).toHaveLength(0); // default patterns not present
    });

    it('matches the custom pattern', () => {
      const r = customAnalyzer.analyze('CUSTOM_SIGNAL_ABC');
      expect(r.patterns).toHaveLength(1);
      expect(r.topMatch?.id).toBe('custom-1');
    });
  });
});
