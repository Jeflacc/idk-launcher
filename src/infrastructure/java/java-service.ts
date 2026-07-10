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

  async ensure(version: '17' | '21' = '17'): Promise<JavaInstallation> {
    const detected = await this.detector.detect();
    if (detected.length > 0) return detected[0]!;

    // No local Java — download from Adoptium for the current platform.
    const installed = await this.downloadFromAdoptium(version);
    return installed;
  }

  private async downloadFromAdoptium(version: string): Promise<JavaInstallation> {
    const imageType = 'jre';
    const os = this.adoptiumOs();
    const archName = this.adoptiumArch();
    const url =
      `https://api.adoptium.net/v3/assets/latest/${version}/${imageType}?` +
      `architecture=${archName}&image_type=${imageType}&os=${os}&vendor=eclipse`;

    const assets = await this.http.getJson<AdoptiumAsset[]>(url);
    const asset = assets[0];
    if (!asset) throw new Error(`No Adoptium JRE found for ${os}/${archName}`);

    const target = join(this.paths.cache, 'java', asset.binary.package.name);
    await this.http.downloadFile(asset.binary.package.link, target, {
      expectedSize: asset.binary.size,
    });
    return { path: target, version: asset.version, source: 'adoptium' };
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
