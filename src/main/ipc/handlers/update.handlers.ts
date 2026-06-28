import { registerInvoke, forwardEvent } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { UpdaterService } from '@/infrastructure/updater/updater-service';

export function registerUpdateHandlers(
  windows: WindowManager,
  updater: UpdaterService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');
  const mainContents = () => windows.get('main')?.webContents ?? null;

  registerInvoke(IpcChannel.Update.Check, z.void(), async () => updater.check(), { senderCheck: senderOk });
  registerInvoke(IpcChannel.Update.Download, z.void(), async () => updater.download(), { senderCheck: senderOk });
  registerInvoke(IpcChannel.Update.Install, z.void(), async () => updater.quitAndInstall(), { senderCheck: senderOk });

  forwardEvent(updater, 'available', IpcChannel.Update.Available, (info) => [info], mainContents);
  forwardEvent(updater, 'progress', IpcChannel.Update.Progress, (p) => [p], mainContents);
  forwardEvent(updater, 'downloaded', IpcChannel.Update.Downloaded, (info) => [info], mainContents);
  forwardEvent(updater, 'error', IpcChannel.Update.Error, (err) => [{ message: String(err) }], mainContents);
}
