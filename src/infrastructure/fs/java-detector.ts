import { access, readdir, stat } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Parse the major version from `java -version` output. Handles BOTH versioning
 * schemes: modern (`25.0.3`, `21.0.2` → 25, 21) and legacy
 * (`1.8.0_432` → 8, `1.7.0_80` → 7). Returns null when nothing matches.
 */
export function parseJavaMajorFromOutput(output: string): number | null {
  const match = output.match(/version\s+"(\d+)(?:\.(\d+))?/);
  if (!match?.[1]) return null;
  const major = parseInt(match[1], 10);
  if (isNaN(major)) return null;
  if (major === 1 && match[2]) {
    // Legacy scheme: "1.8.0_432" is Java 8, "1.7" is Java 7, ...
    return parseInt(match[2], 10) || 1;
  }
  return major;
}

/**
 * Cross-platform Java runtime detector. Replaces v1's Windows-only
 * `java.exe` + `tasklist` assumptions.
 *
 * Detects candidate Java installations and verifies their actual version
 * by running `java -version`.
 */
export interface JavaInstallation {
  path: string;
  version: string | null;
  /** Numeric major version (e.g. 17, 21, 25) parsed from `java -version` */
  majorVersion: number | null;
  source: 'adoptium' | 'temurin' | 'oracle' | 'system' | 'custom';
}

export class JavaDetector {
  constructor(
    private readonly customPath?: string,
    private readonly runtimesDir?: string,
  ) {}

  async detect(): Promise<JavaInstallation[]> {
    if (this.customPath && (await this.pathExists(this.customPath))) {
      const major = await this.getJavaMajorVersion(this.customPath);
      return [{ path: this.customPath, version: major ? String(major) : null, majorVersion: major, source: 'custom' }];
    }
    const candidates = [...(await this.systemCandidates()), ...(await this.runtimesCandidates())];
    const existing: JavaInstallation[] = [];
    for (const c of candidates) {
      // Dedupe — JAVA_HOME often points into a dir we also scan directly.
      if (existing.some((e) => e.path === c.path)) continue;
      if (await this.pathExists(c.path)) {
        const major = await this.getJavaMajorVersion(c.path);
        existing.push({ ...c, majorVersion: major, version: major ? String(major) : c.version });
      }
    }
    return existing;
  }

  /**
   * v1 stored downloaded runtimes as `<root>/runtimes/jre-8`, `jre-21`,
   * `jre-25`, ... — a working Java installation the system scans never find.
   * These are Temurin builds; they are verified via `java -version` like any
   * other candidate.
   */
  private async runtimesCandidates(): Promise<JavaInstallation[]> {
    if (!this.runtimesDir) return [];
    const dir = this.runtimesDir;
    try {
      const entries = await readdir(dir);
      return entries.map((entry) => ({
        path: this.javaBin(join(dir, entry)),
        version: entry,
        majorVersion: null,
        source: 'temurin' as const,
      }));
    } catch {
      // directory absent — skip
      return [];
    }
  }

  private async systemCandidates(): Promise<JavaInstallation[]> {
    const home = process.env['JAVA_HOME'];
    const results: JavaInstallation[] = [];
    if (home) results.push({ path: this.javaBin(home), version: null, majorVersion: null, source: 'system' });

    if (platform() === 'win32') {
      const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
      for (const dir of ['Java', 'Eclipse Adoptium', 'Zulu', 'Microsoft', 'BellSoft']) {
        const root = join(programFiles, dir);
        try {
          const entries = await readdir(root);
          for (const entry of entries) {
            results.push({ path: this.javaBin(join(root, entry)), version: entry, majorVersion: null, source: 'adoptium' });
          }
        } catch {
          // directory absent — skip
        }
      }
      // Also check Program Files (x86)
      const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
      for (const dir of ['Java', 'Eclipse Adoptium', 'Zulu']) {
        const root = join(programFilesX86, dir);
        try {
          const entries = await readdir(root);
          for (const entry of entries) {
            results.push({ path: this.javaBin(join(root, entry)), version: entry, majorVersion: null, source: 'adoptium' });
          }
        } catch {
          // directory absent — skip
        }
      }
    } else {
      const unixPaths = ['/usr/bin/java', '/usr/lib/jvm/default-java/bin/java', '/opt/homebrew/opt/openjdk/bin/java'];
      for (const p of unixPaths) results.push({ path: p, version: null, majorVersion: null, source: 'system' });
    }
    return results;
  }

  /**
   * Run `java -version` and parse the major version number from the output.
   * Returns e.g. 17, 21, 25 or null if detection fails.
   */
  private async getJavaMajorVersion(javaPath: string): Promise<number | null> {
    try {
      const { stderr } = await execAsync(`"${javaPath}" -version`, { timeout: 5000 });
      // Output format: `openjdk version "21.0.2" ...` or `java version "1.8.0_432" ...`
      return parseJavaMajorFromOutput(stderr ?? '');
    } catch {
      // java not found or timed out
    }
    return null;
  }

  private javaBin(javaHome: string): string {
    return join(javaHome, 'bin', platform() === 'win32' ? 'java.exe' : 'java');
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await access(p);
      const s = await stat(p);
      return s.isFile();
    } catch {
      return false;
    }
  }
}
