import type { LaunchService, LaunchContext } from '@/infrastructure/minecraft/launch-service';
import type { JavaService } from '@/infrastructure/java/java-service';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { LaunchOptions, LaunchProgress } from '@shared/types';

export interface LaunchGameDeps {
  launchService: LaunchService;
  javaService: JavaService;
  secrets: SecretStore;
  modpackRepo: ModpackRepository;
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
    const java = await this.deps.javaService.ensure(options.versionId.startsWith('1.20') ? '21' : '17');
    const secrets = await this.deps.secrets.load();
    const auth = options.authProvider === 'elyby' ? secrets.elyby : secrets.microsoft;
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

    const result = await this.deps.launchService.launch(ctx);
    if (result.success && options.modpackId) {
      this.deps.launchService.once('closed', ({ duration }: { duration: number; crashed: boolean }) => {
        void this.deps.modpackRepo.recordPlaytime(options.modpackId!, duration);
      });
    }
    return result;
  }

  cancel(): void {
    this.deps.launchService.cancel();
  }
}
