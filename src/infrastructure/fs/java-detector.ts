import { access, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { platform } from 'node:os';

/**
 * Cross-platform Java runtime detector. Replaces v1's Windows-only
 * `java.exe` + `tasklist` assumptions.
 *
 * NOTE: actual spawning/launch verification occurs in JavaService; this module
 * only locates candidate installations.
 */
export interface JavaInstallation {
  path: string;
  version: string | null;
  source: 'adoptium' | 'temurin' | 'oracle' | 'system' | 'custom';
}

export class JavaDetector {
  constructor(private readonly customPath?: string) {}

  async detect(): Promise<JavaInstallation[]> {
    if (this.customPath && (await this.pathExists(this.customPath))) {
      return [{ path: this.customPath, version: null, source: 'custom' }];
    }
    const candidates = await this.systemCandidates();
    const existing: JavaInstallation[] = [];
    for (const c of candidates) {
      if (await this.pathExists(c.path)) existing.push(c);
    }
    return existing;
  }

  private async systemCandidates(): Promise<JavaInstallation[]> {
    const home = process.env['JAVA_HOME'];
    const results: JavaInstallation[] = [];
    if (home) results.push({ path: this.javaBin(home), version: null, source: 'system' });

    if (platform() === 'win32') {
      const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
      for (const dir of ['Java', 'Eclipse Adoptium', 'Zulu']) {
        const root = join(programFiles, dir);
        try {
          const entries = await readdir(root);
          for (const entry of entries) {
            results.push({ path: this.javaBin(join(root, entry)), version: entry, source: 'adoptium' });
          }
        } catch {
          // directory absent — skip
        }
      }
    } else {
      const unixPaths = ['/usr/bin/java', '/usr/lib/jvm/default-java/bin/java', '/opt/homebrew/opt/openjdk/bin/java'];
      for (const p of unixPaths) results.push({ path: p, version: null, source: 'system' });
    }
    return results;
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
