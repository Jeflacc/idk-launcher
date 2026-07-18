import { access, readdir, stat } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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
  constructor(private readonly customPath?: string) {}

  async detect(): Promise<JavaInstallation[]> {
    if (this.customPath && (await this.pathExists(this.customPath))) {
      const major = await this.getJavaMajorVersion(this.customPath);
      return [{ path: this.customPath, version: major ? String(major) : null, majorVersion: major, source: 'custom' }];
    }
    const candidates = await this.systemCandidates();
    const existing: JavaInstallation[] = [];
    for (const c of candidates) {
      if (await this.pathExists(c.path)) {
        const major = await this.getJavaMajorVersion(c.path);
        existing.push({ ...c, majorVersion: major, version: major ? String(major) : c.version });
      }
    }
    return existing;
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
      // Output format: `openjdk version "21.0.2" ...` or `java version "17.0.1" ...`
      const match = stderr.match(/version\s+"(\d+)(?:\.(\d+))?/);
      if (match?.[1]) {
        const major = parseInt(match[1], 10);
        return isNaN(major) ? null : major;
      }
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
