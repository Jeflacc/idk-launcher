import type { LaunchService, LaunchContext } from '@/infrastructure/minecraft/launch-service';
import type { JavaService } from '@/infrastructure/java/java-service';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { LaunchOptions, LaunchProgress } from '@shared/types';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface LaunchGameDeps {
  launchService: LaunchService;
  javaService: JavaService;
  secrets: SecretStore;
  modpackRepo: ModpackRepository;
  http: HttpClient;
  paths: PathService;
  elyby?: ElybyClient;
  elybyClientId?: string;
  elybyClientSecret?: string;
}

/**
 * Orchestrate a game launch. This is the ONE entry point for both vanilla and
 * modpack launches — replacing v1's duplicated `launch-minecraft` and
 * `launch-modpack` handlers.
 */
export class LaunchGame {
  constructor(private readonly deps: LaunchGameDeps) {}

  onProgress(handler: (p: LaunchProgress) => void): () => void {
    const fn = (p: LaunchProgress) => handler(p);
    this.deps.launchService.on('progress', fn);
    return () => this.deps.launchService.off('progress', fn);
  }

  async execute(options: LaunchOptions): Promise<{ success: boolean; error?: string; pid?: number }> {
    const javaVersion = await this.detectRequiredJavaVersion(options.versionId);
    const java = await this.deps.javaService.ensure(javaVersion);
    let secrets = await this.deps.secrets.load();
    let auth = options.authProvider === 'elyby' ? secrets.elyby : secrets.microsoft;
    if (!auth) {
      return { success: false, error: `No ${options.authProvider} session found. Please sign in.` };
    }

    // Refresh Ely.by OAuth token if expired
    if (options.authProvider === 'elyby' && secrets.elyby?.refreshToken && secrets.elyby.expiresAt < Date.now()) {
      try {
        if (this.deps.elyby && this.deps.elybyClientId && this.deps.elybyClientSecret) {
          const tokenRes = await this.deps.elyby.refreshOAuthToken(
            secrets.elyby.refreshToken,
            this.deps.elybyClientId,
            this.deps.elybyClientSecret,
          );
          const userInfo = await this.deps.elyby.fetchOAuthUserInfo(tokenRes.access_token);
          secrets = await this.deps.secrets.load();
          await this.deps.secrets.save({
            ...secrets,
            elyby: {
              accessToken: tokenRes.access_token,
              refreshToken: tokenRes.refresh_token ?? secrets.elyby?.refreshToken,
              username: userInfo.username,
              uuid: userInfo.uuid,
              expiresAt: Date.now() + tokenRes.expires_in * 1000,
            },
          });
          secrets = await this.deps.secrets.load();
          auth = secrets.elyby;
        }
      } catch {
        // Token refresh failed — proceed with the old token and let Minecraft handle the auth error
      }
    }

    if (!auth) {
      return { success: false, error: `No ${options.authProvider} session found. Please sign in.` };
    }

    const ctx: LaunchContext = {
      options,
      java,
      auth: {
        username: auth.username,
        uuid: auth.uuid,
        accessToken: auth.accessToken,
      },
      modpackDirectory: options.modpackId
        ? this.deps.modpackRepo['paths'].modpackDirectory(options.modpackId)
        : undefined,
    };

    // Register playtime recording BEFORE launch so we catch the closed event
    if (options.modpackId) {
      this.deps.launchService.once('closed', ({ duration }: { duration: number; crashed: boolean }) => {
        void this.deps.modpackRepo.recordPlaytime(options.modpackId!, duration);
      });
    }

    const result = await this.deps.launchService.launch(ctx);
    return result;
  }

  cancel(): void {
    this.deps.launchService.cancel();
  }

  /**
   * Determine the required Java major version for a given Minecraft version.
   * Reads the version JSON from disk (if cached) to check `javaVersion.majorVersion`.
   * Falls back to version-number heuristics if the JSON is not available.
   */
  private async detectRequiredJavaVersion(versionId: string): Promise<number> {
    // Try to read the version JSON from disk
    const jsonPath = join(this.deps.paths.versions, versionId, `${versionId}.json`);
    if (existsSync(jsonPath)) {
      try {
        const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
        if (json.javaVersion?.majorVersion) {
          return json.javaVersion.majorVersion;
        }
      } catch {
        // fall through to heuristic
      }
    }

    // Heuristic: parse the version number to determine Java version
    // MC 1.18-1.20.x → Java 17
    // MC 1.20.5+ → Java 21
    // MC 26+ → Java 25+
    const parts = versionId.split('.');
    if (parts.length >= 2) {
      const minor = parseInt(parts[1] ?? '', 10);
      if (!isNaN(minor)) {
        if (minor >= 25) return 25;
        if (minor >= 20) return 21;
        if (minor >= 18) return 17;
      }
    }

    // Default to Java 17 (safest for most versions)
    return 17;
  }
}
