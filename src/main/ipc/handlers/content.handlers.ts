import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { MojangContentClient } from '@/infrastructure/net/api/mojang-content-client';
import type { CurseforgeClient } from '@/infrastructure/net/api/curseforge-client';

const zVoid = z.unknown().optional();

/**
 * Content IPC handlers — news feed + trending modpacks.
 *
 * Replaces v1's direct renderer-side fetch() calls to
 * launchercontent.mojang.com and api.curse.tools.
 */
export function registerContentHandlers(
  windows: WindowManager,
  mojangContent: MojangContentClient,
  curseforge: CurseforgeClient,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Content.GetMojangNews,
    zVoid,
    async () => {
      const result = await mojangContent.getNews();
      return result.news ?? [];
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Content.GetTrendingModpacks,
    zVoid,
    async () => {
      try {
        const result = await curseforge.searchModpacks('', 4);
        return result.data ?? [];
      } catch {
        // If CurseForge is unreachable, return empty — the renderer has
        // a hardcoded fallback list for this case.
        return [];
      }
    },
    { senderCheck: senderOk },
  );
}
