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

  // Forward launcher service events to the renderer.
  const emitter = (launchGame as unknown as { deps: { launchService: { on: (e: string, fn: (...a: unknown[]) => void) => void } } }).deps.launchService;
  forwardEvent(emitter, 'warning', IpcChannel.Launch.Warning, (msg) => [msg], () => windows.get('main')?.webContents ?? null);
  forwardEvent(emitter, 'closed', IpcChannel.Launch.Closed, (info: unknown) => [info], () => windows.get('main')?.webContents ?? null);
}

import { z } from 'zod';
function zUnknownOptional() {
  return z.unknown().optional();
}
