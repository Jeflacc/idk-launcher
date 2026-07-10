import { registerSend, forwardEvent } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { LaunchSchema } from '@shared/schemas/launch.schema';
import type { WindowManager } from '../../windows/window-manager';
import type { LaunchGame } from '@/application/use-cases/launch-game';

export function registerLaunchHandlers(
  windows: WindowManager,
  launchGame: LaunchGame,
): void {
  registerSend(
    IpcChannel.Launch.Minecraft,
    LaunchSchema.options,
    async (event, options) => {
      if (!windows.assertSender(event, 'main')) return;
      launchGame.onProgress((p) => {
        windows.send('main', IpcChannel.Launch.Progress, p);
      });
      const result = await launchGame.execute(options);
      if (result.success && result.pid) {
        windows.send('main', IpcChannel.Launch.GameLaunched, { pid: result.pid });
      } else if (!result.success) {
        windows.send('main', IpcChannel.Launch.Error, { message: result.error });
      }
    },
  );

  registerSend(IpcChannel.Launch.Cancel, zUnknownOptional(), () => {
    launchGame.cancel();
  });

  // Launch.Modpack — launch a specific modpack by ID
  registerSend(
    IpcChannel.Launch.Modpack,
    z.object({ modpackId: z.string(), quickConnect: z.string().optional() }).optional(),
    async (event, _args) => {
      if (!windows.assertSender(event, 'main')) return;
      // Delegates to the modpack launch flow (wired via Modpack.Launch handler)
      // This channel exists for the v1 shim compatibility
    },
  );

  // Launch.ClearJavaPath — notify the renderer that the Java path was cleared
  // This is a send-only channel that the main process can use to push to renderer
  registerSend(IpcChannel.Launch.ClearJavaPath, zUnknownOptional(), () => {
    // No-op — this channel is for main→renderer push, not renderer→main
  });

  // Forward launcher service events to the renderer.
  const emitter = (launchGame as unknown as { deps: { launchService: { on: (e: string, fn: (...a: unknown[]) => void) => void } } }).deps.launchService;
  forwardEvent(emitter, 'warning', IpcChannel.Launch.Warning, (msg) => [msg], () => windows.get('main')?.webContents ?? null);
  forwardEvent(emitter, 'closed', IpcChannel.Launch.Closed, (info: unknown) => [info], () => windows.get('main')?.webContents ?? null);
}

import { z } from 'zod';
function zUnknownOptional() {
  return z.unknown().optional();
}
