import type { LaunchService, LaunchContext } from '@/infrastructure/minecraft/launch-service';
import type { JavaService } from '@/infrastructure/java/java-service';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { LaunchOptions, LaunchProgress, StoredAccount } from '@shared/types';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { offlineUuid } from '@/domain/services/offline-uuid';

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
    let java: Awaited<ReturnType<typeof this.deps.javaService.ensure>>;
    try {
      // The Java phase emits nothing from McLauncher — surface it here so the
      // renderer never sits on "Initializing..." while a JRE downloads.
      java = await this.deps.javaService.ensure(javaVersion, (p) => {
        const message = p.phase === 'extracting'
          ? `Extracting Java ${javaVersion}...`
          : p.total > 0
            ? `Downloading Java ${javaVersion} (${Math.max(0, Math.floor((p.completed / p.total) * 100))}%)`
            : `Downloading Java ${javaVersion}...`;
        console.log(`[Launch] ${message}`);
        this.deps.launchService.reportProgress({
          type: 'java',
          phase: p.phase === 'extracting' ? 'extracting' : 'downloading',
          completed: p.completed,
          total: p.total || 1,
          message,
        });
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to prepare Java ${javaVersion}: ${detail} Please check your internet connection and try again.`,
      };
    }
    // ── Auth resolution ──
    // Priority: explicit accountId > stored activeAccountId > legacy single
    // session keys > offline fallback. Account tokens never leave this process.
    let secrets = await this.deps.secrets.load();
    const storedAccounts = Array.isArray(secrets.accounts) ? secrets.accounts : [];

    let resolvedAccount: StoredAccount | null = null;
    if (options.accountId) {
      resolvedAccount = storedAccounts.find((a) => a.id === options.accountId) ?? null;
    }
    if (!resolvedAccount && secrets.activeAccountId) {
      resolvedAccount = storedAccounts.find((a) => a.id === secrets.activeAccountId) ?? null;
    }

    let authProviderUsed: 'elyby' | 'microsoft' | 'offline';
    let auth: any;
    let authAccountId: string | null = null;

    if (resolvedAccount) {
      authAccountId = resolvedAccount.id;
      authProviderUsed =
        resolvedAccount.provider === 'elyby'
          ? 'elyby'
          : resolvedAccount.provider === 'microsoft'
            ? 'microsoft'
            : 'offline';
      if (resolvedAccount.provider === 'offline') {
        auth = {
          username: resolvedAccount.username,
          uuid: resolvedAccount.uuid || offlineUuid(resolvedAccount.username),
          accessToken: '',
          expiresAt: 0,
        };
      } else {
        auth = resolvedAccount;
      }
    } else if (options.authProvider === 'offline' && options.username) {
      // Explicit offline login with a chosen username (legacy renderer path):
      // honor it directly so offline launching works even when a premium
      // session is still stored in the secret store.
      authProviderUsed = 'offline';
      auth = {
        username: options.username,
        uuid: offlineUuid(options.username),
        accessToken: '',
        expiresAt: 0,
      };
    } else {
      // Legacy single-session fallback (pre-accounts secret store data).
      // The v1 renderer's getMicrosoftAuthData() returns raw AuthSession but
      // the renderer wraps it in `.data` (which doesn't exist), producing null
      // → shim sends authProvider='offline' → offline doesn't exist.  Fall back
      // to whichever session IS available so the user can still launch.
      authProviderUsed = options.authProvider === 'elyby' ? 'elyby' : 'microsoft';
      auth = authProviderUsed === 'elyby' ? secrets.elyby : secrets.microsoft;
      if (!auth) {
        if (secrets.elyby) {
          auth = secrets.elyby;
          authProviderUsed = 'elyby';
        } else if (secrets.microsoft) {
          auth = secrets.microsoft;
          authProviderUsed = 'microsoft';
        }
      }
      if (!auth) {
        // Offline play — allow launching without signing in (like TLauncher)
        authProviderUsed = 'offline';
        auth = {
          username: options.username ?? 'Player',
          uuid: offlineUuid(options.username ?? 'Player'),
          accessToken: '',
          expiresAt: 0,
        };
      }
    }

    // Refresh Ely.by OAuth token if expired (account-based or legacy session)
    if (authProviderUsed === 'elyby' && auth?.refreshToken && auth?.expiresAt && auth.expiresAt < Date.now()) {
      try {
        if (this.deps.elyby && this.deps.elybyClientId && this.deps.elybyClientSecret) {
          const tokenRes = await this.deps.elyby.refreshOAuthToken(
            auth.refreshToken,
            this.deps.elybyClientId,
            this.deps.elybyClientSecret,
          );
          const userInfo = await this.deps.elyby.fetchOAuthUserInfo(tokenRes.access_token);
          const newSession = {
            accessToken: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token ?? auth.refreshToken,
            username: userInfo.username,
            uuid: userInfo.uuid,
            expiresAt: Date.now() + tokenRes.expires_in * 1000,
          };
          secrets = await this.deps.secrets.load();
          if (authAccountId) {
            const accounts = Array.isArray(secrets.accounts) ? secrets.accounts : [];
            const idx = accounts.findIndex((a) => a.id === authAccountId);
            const current = idx !== -1 ? accounts[idx] : undefined;
            if (current) {
              accounts[idx] = { ...current, ...newSession };
            }
            secrets.accounts = accounts;
          }
          await this.deps.secrets.save({ ...secrets, elyby: newSession });
          auth = { ...auth, ...newSession };
        }
      } catch {
        // Token refresh failed — proceed with the old token and let Minecraft handle the auth error
      }
    }

    const ctx: LaunchContext = {
      options,
      java,
      auth: {
        username: auth!.username,
        uuid: auth!.uuid,
        accessToken: auth!.accessToken,
        provider: authProviderUsed,
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

    // Heuristic: parse the version number to determine Java version.
    // Handles BOTH versioning schemes: classic `1.8.9`/`1.20.1` (major=minor)
    // and new-style `26.1.2` (major=26).
    const parts = versionId.split('.');
    let major = 0;
    if (parts.length >= 2 && parts[0] === '1') {
      major = parseInt(parts[1] ?? '', 10); // 1.20.1 → 20
    } else if (parts[0]) {
      major = parseInt(parts[0], 10); // 26.1.2 → 26
    }
    if (!isNaN(major)) {
      if (major >= 25) return 25;
      if (major >= 21) return 21;
      if (major >= 20) return 21;
      if (major >= 18) return 17;
      if (major === 17) return 16;
      if (major >= 8) return 8;
    }

    // Default to Java 17 (safest for most versions)
    return 17;
  }
}
