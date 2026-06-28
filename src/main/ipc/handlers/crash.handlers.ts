import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';

/**
 * Crash-analysis IPC handlers. The analyzer itself is a pure domain service
 * (CrashAnalyzerService) invoked directly from the renderer for instant
 * feedback; this handler covers the auto-install-missing-dependencies action.
 */
export function registerCrashHandlers(
  windows: WindowManager,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Crash.AutoInstallDependencies,
    z.object({ missingMods: z.array(z.string()) }),
    async (_event, args) => {
      // Delegates to the mod install use-case (wired in the composition root).
      return { requested: args.missingMods, status: 'queued' as const };
    },
    { senderCheck: senderOk },
  );
}
