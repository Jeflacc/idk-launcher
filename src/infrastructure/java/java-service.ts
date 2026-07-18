import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { platform, arch } from 'node:os';
import { HttpClient } from '../net/http-client';
import { JavaDetector, type JavaInstallation } from '../fs/java-detector';
import { PathService } from '../fs/path-service';

interface AdoptiumAsset {
  binary: { package: { name: string; link: string }; size: number };
  version: string;
}

/**
 * Cross-platform Java runtime manager. Replaces v1's Windows-only
 * Adoptium x64 download URL.
 *
 * Supports any Java version (17, 21, 25, etc.) by detecting installed
 * versions and downloading from Adoptium if the required version is missing.
 */
export class JavaService {
  private readonly detector: JavaDetector;

  constructor(
    private readonly paths: PathService,
    private readonly http: HttpClient,
    customPath?: string,
  ) {
    this.detector = new JavaDetector(customPath);
  }

  /**
   * Ensure a Java installation of the given major version is available.
   * First checks detected installations for a version that meets the requirement,
   * then downloads from Adoptium if needed.
   */
  async ensure(requiredMajorVersion: number = 17): Promise<JavaInstallation> {
    const detected = await this.detector.detect();

    // Find an installed Java that meets the version requirement
    const suitable = detected.find((d) => d.majorVersion !== null && d.majorVersion >= requiredMajorVersion);
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
        const installed = await this.downloadFromAdoptium(candidate);
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

  private async downloadFromAdoptium(version: number): Promise<JavaInstallation> {
    const imageType = 'jre';
    const os = this.adoptiumOs();
    const archName = this.adoptiumArch();
    const url =
      `https://api.adoptium.net/v3/assets/latest/${version}/${imageType}?` +
      `architecture=${archName}&image_type=${imageType}&os=${os}&vendor=eclipse`;

    const assets = await this.http.getJson<AdoptiumAsset[]>(url);
    const asset = assets[0];
    if (!asset) throw new Error(`No Adoptium JRE found for Java ${version} on ${os}/${archName}`);

    const target = join(this.paths.cache, 'java', asset.binary.package.name);
    await this.http.downloadFile(asset.binary.package.link, target, {
      expectedSize: asset.binary.size,
    });
    return { path: target, version: asset.version, majorVersion: version, source: 'adoptium' };
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
