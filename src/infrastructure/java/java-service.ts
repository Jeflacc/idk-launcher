import { stat, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform, arch } from 'node:os';
import { HttpClient } from '../net/http-client';
import { JavaDetector, type JavaInstallation } from '../fs/java-detector';
import { PathService } from '../fs/path-service';

interface AdoptiumBinary {
  architecture?: string;
  image_type?: string;
  os?: string;
  binary: { package: { name: string; link: string }; size: number };
}

interface AdoptiumRelease {
  binaries?: AdoptiumBinary[];
}

export interface JavaDownloadProgress {
  phase: 'downloading' | 'extracting';
  completed: number;
  total: number;
}

/**
 * Cross-platform Java runtime manager. Replaces v1's Windows-only
 * Adoptium x64 download URL.
 *
 * Supports any Java version (17, 21, 25, etc.) by detecting installed
 * versions and downloading from Adoptium if the required version is missing.
 * Downloaded archives are EXTRACTED into `cache/java/<jdk>/` and the real
 * `bin/java[.exe]` is returned — a raw .zip path can't be spawned.
 */
export class JavaService {
  private readonly detector: JavaDetector;

  constructor(
    private readonly paths: PathService,
    private readonly http: HttpClient,
    customPath?: string,
  ) {
    this.detector = new JavaDetector(customPath, paths.runtimes);
  }

  /**
   * Ensure a Java installation of the given major version is available.
   * First checks detected installations for a version that meets the requirement,
   * then downloads from Adoptium if needed.
   */
  async ensure(
    requiredMajorVersion: number = 17,
    onProgress?: (p: JavaDownloadProgress) => void,
  ): Promise<JavaInstallation> {
    const detected = await this.detector.detect();

    // Pick the CLOSEST installed Java that meets the requirement — a Java 21
    // must serve a 1.8.9 launch no better than the bundled jre-8 does.
    const suitable = detected
      .filter((d) => d.majorVersion !== null && d.majorVersion >= requiredMajorVersion)
      .sort((a, b) => (a.majorVersion ?? 0) - (b.majorVersion ?? 0))[0];
    if (suitable) return suitable;

    // Find any installed Java and verify it actually works
    if (detected.length > 0) {
      // Even if version detection failed, try the first candidate
      // (it might work even if we couldn't parse the version)
      const first = detected[0]!;
      if (first.majorVersion === null) return first;
      // Has a version but too old — need to download
    }

    // No suitable local Java — download from Adoptium, falling back to
    // the next lower LTS if the requested version isn't available yet.
    // Java LTS versions in descending order: 25, 21, 17
    const ltsFallbacks = [25, 21, 17];
    const candidates = ltsFallbacks.filter((v) => v <= requiredMajorVersion);
    // Ensure the requested version is first (even if non-LTS)
    if (!candidates.includes(requiredMajorVersion)) candidates.unshift(requiredMajorVersion);

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const installed = await this.downloadFromAdoptium(candidate, onProgress);
        return installed;
      } catch (err) {
        lastError = err;
        // try next fallback
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to download Java ${requiredMajorVersion} from Adoptium`);
  }

  private async downloadFromAdoptium(
    version: number,
    onProgress?: (p: JavaDownloadProgress) => void,
  ): Promise<JavaInstallation> {
    // Temurin stopped publishing JRE builds for 17+ and the `/v3/assets/latest/`
    // route 404s — `feature_releases/{v}/ga` is the current, working endpoint.
    const imageType = 'jdk';
    const os = this.adoptiumOs();
    const archName = this.adoptiumArch();
    const extractRoot = join(this.paths.cache, 'java', `jdk-${version}-${os}-${archName}`);

    // Already extracted from a previous run — no need to re-download.
    const javaBin = join(extractRoot, 'bin', platform() === 'win32' ? 'java.exe' : 'java');
    if (existsSync(javaBin)) {
      console.log(`[Java] Using previously downloaded Java ${version} at ${javaBin}`);
      return { path: javaBin, version: String(version), majorVersion: version, source: 'adoptium' };
    }

    const url =
      `https://api.adoptium.net/v3/assets/feature_releases/${version}/ga?` +
      `architecture=${archName}&image_type=${imageType}&os=${os}&vendor=eclipse`;

    console.log(`[Java] No local Java ${version} found — downloading from Adoptium...`);
    const releases = await this.http.getJson<AdoptiumRelease[]>(url);
    const match = releases
      .flatMap((r) => r.binaries ?? [])
      .find((b) => b.architecture === archName && b.image_type === imageType && b.os === os);
    const asset = match?.binary;
    if (!asset) throw new Error(`No Adoptium JDK found for Java ${version} on ${os}/${archName}`);

    await mkdir(extractRoot, { recursive: true });
    const zipPath = join(extractRoot, asset.package.name);

    if (!existsSync(zipPath) || (await this.statSize(zipPath)) !== asset.size) {
      console.log(`[Java] Downloading ${asset.package.name} (${Math.round(asset.size / 1024 / 1024)} MB)...`);
      await this.http.downloadFile(asset.package.link, zipPath, {
        expectedSize: asset.size,
        onProgress: (downloaded, total) => {
          onProgress?.({ phase: 'downloading', completed: downloaded, total: total || asset.size });
        },
        stallTimeoutMs: 90_000,
      });
    }

    onProgress?.({ phase: 'extracting', completed: 0, total: 1 });
    console.log('[Java] Extracting JRE...');
    await this.extractZip(zipPath, extractRoot);
    try {
      await rm(zipPath, { force: true }); // free disk space
    } catch {
      // non-fatal
    }

    if (!existsSync(javaBin)) {
      throw new Error(`Java ${version} extracted, but java binary not found at ${javaBin}`);
    }
    onProgress?.({ phase: 'extracting', completed: 1, total: 1 });
    console.log(`[Java] Java ${version} ready at ${javaBin}`);
    return { path: javaBin, version: String(version), majorVersion: version, source: 'adoptium' };
  }

  private async statSize(p: string): Promise<number | null> {
    try {
      const s = await stat(p);
      return s.size;
    } catch {
      return null;
    }
  }

  private async extractZip(zipPath: string, targetDir: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AdmZip = require('adm-zip') as typeof import('adm-zip');
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    // Adoptium archives contain a single top-level directory (e.g. jdk-25+...).
    // Strip it so `bin/java.exe` lands directly under targetDir.
    const topLevels = new Set(
      entries
        .map((e) => e.entryName.split('/')[0])
        .filter((p) => p && !p.endsWith('/')),
    );
    if (topLevels.size === 1) {
      zip.extractAllTo(targetDir, true);
      const top = [...topLevels][0]!;
      const nested = join(targetDir, top);
      if (existsSync(nested) && nested !== targetDir) {
        // Move everything up one level.
        const { readdir, rename } = await import('node:fs/promises');
        for (const entry of await readdir(nested)) {
          await rename(join(nested, entry), join(targetDir, entry));
        }
        await rm(nested, { recursive: true, force: true });
      }
    } else {
      zip.extractAllTo(targetDir, true);
    }
  }

  private adoptiumOs(): string {
    const p = platform();
    if (p === 'win32') return 'windows';
    if (p === 'darwin') return 'mac';
    return 'linux';
  }

  private adoptiumArch(): string {
    const a = arch();
    if (a === 'arm64') return 'aarch64';
    if (a === 'x64') return 'x64';
    return a;
  }

  async isValidJava(path: string): Promise<boolean> {
    try {
      const s = await stat(path);
      return s.isFile();
    } catch {
      return false;
    }
  }
}
