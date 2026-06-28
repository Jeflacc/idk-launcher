/**
 * Data-driven crash analyzer. Replaces v1's `crash-analyzer-feature.js` which
 * had 18 hardcoded regex patterns inline with no tests and 3 dead functions.
 *
 * Each pattern is a pure data record, making the analyzer trivially
 * extensible and fully unit-testable.
 */
export interface CrashPattern {
  id: string;
  /** Regex matched against the raw log text. */
  pattern: RegExp;
  category: CrashCategory;
  severity: 'info' | 'warning' | 'error' | 'fatal';
  title: string;
  description: string;
  /** Suggested remediation, optionally referencing an automation capability. */
  remediation: {
    summary: string;
    action?: 'install-missing-mod' | 'update-java' | 'increase-memory' | 'remove-conflicting-mod' | 'report';
    payload?: Record<string, unknown>;
  };
}

export type CrashCategory =
  | 'missing-mod'
  | 'java-version'
  | 'memory'
  | 'mod-conflict'
  | 'corrupt-install'
  | 'shader'
  | 'network'
  | 'unknown';

export interface CrashReport {
  patterns: CrashPattern[];
  category: CrashCategory;
  severity: 'info' | 'warning' | 'error' | 'fatal';
  summary: string;
  topMatch: CrashPattern | null;
  missingMods: string[];
}

export const DEFAULT_CRASH_PATTERNS: readonly CrashPattern[] = [
  {
    id: 'missing-mod-1',
    pattern: /Missing\s+mod\s+([\w-]+)/i,
    category: 'missing-mod',
    severity: 'error',
    title: 'Missing mod detected',
    description: 'The game requires a mod that is not installed.',
    remediation: { summary: 'Install the missing mod.', action: 'install-missing-mod' },
  },
  {
    id: 'java-outdated',
    pattern: /UnsupportedClassVersion|requires\s+Java\s+(\d+)|Unsupported\s+major\s+version\s+(\d+)/i,
    category: 'java-version',
    severity: 'fatal',
    title: 'Java version too old',
    description: 'A mod requires a newer Java runtime than what is configured.',
    remediation: { summary: 'Update to a newer Java runtime.', action: 'update-java' },
  },
  {
    id: 'out-of-memory',
    pattern: /OutOfMemoryError|java\.lang\.OutOfMemoryError/i,
    category: 'memory',
    severity: 'fatal',
    title: 'Out of memory',
    description: 'The JVM ran out of allocated memory.',
    remediation: { summary: 'Increase the maximum memory allocation.', action: 'increase-memory' },
  },
  {
    id: 'mod-conflict-duplicate',
    pattern: /Duplicate\s+mod\s+(\w+)|Conflicting\s+mods?\s*:?\s*(\w+)/i,
    category: 'mod-conflict',
    severity: 'error',
    title: 'Duplicate or conflicting mods',
    description: 'Two installed mods cannot coexist.',
    remediation: { summary: 'Remove the conflicting mod.', action: 'remove-conflicting-mod' },
  },
  {
    id: 'corrupt-jar',
    pattern: /invalid\s+signature|corrupt\s+jar|ZipException/i,
    category: 'corrupt-install',
    severity: 'error',
    title: 'Corrupt installation',
    description: 'A downloaded file is corrupt.',
    remediation: { summary: 'Re-download the affected version or mod.', action: 'report' },
  },
  {
    id: 'shader-failure',
    pattern: /Shader\s+(?:compile|link)\s+failed|GLSL/i,
    category: 'shader',
    severity: 'warning',
    title: 'Shader compilation failure',
    description: 'A shader pack failed to compile.',
    remediation: { summary: 'Try a different shader pack or update your GPU drivers.', action: 'report' },
  },
  {
    id: 'network-timeout',
    pattern: /Connection\s+(?:timed\s+out|refused)|UnknownHost/i,
    category: 'network',
    severity: 'warning',
    title: 'Network error',
    description: 'The game could not reach a required server.',
    remediation: { summary: 'Check your internet connection.', action: 'report' },
  },
];

export class CrashAnalyzerService {
  constructor(private readonly patterns: readonly CrashPattern[] = DEFAULT_CRASH_PATTERNS) {}

  analyze(rawLog: string): CrashReport {
    const matched = this.patterns.filter((p) => p.pattern.test(rawLog));
    const severityRank = { info: 0, warning: 1, error: 2, fatal: 3 } as const;
    matched.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

    const topMatch = matched[0] ?? null;
    const missingMods = matched
      .filter((m) => m.category === 'missing-mod')
      .flatMap((m) => {
        const exec = m.pattern.exec(rawLog);
        return exec?.slice(1).filter(Boolean) ?? [];
      });

    return {
      patterns: matched,
      category: topMatch?.category ?? 'unknown',
      severity: topMatch?.severity ?? 'info',
      summary: topMatch?.title ?? 'No recognized crash signature found.',
      topMatch,
      missingMods,
    };
  }
}
