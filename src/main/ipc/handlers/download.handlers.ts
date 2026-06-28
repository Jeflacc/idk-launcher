import { registerInvoke, forwardEvent } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { DownloadSchema } from '@shared/schemas/download.schema';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';

export function registerDownloadHandlers(
  windows: WindowManager,
  queue: DownloadQueue,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Download.Start,
    DownloadSchema.startRequest,
    async (_event, args) => {
      await queue.start(args.downloadId, args.items, args.concurrency);
      return true;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Download.Pause,
    DownloadSchema.pauseRequest,
    async (_event, args) => {
      queue.pause(args.downloadId);
      return true;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Download.Resume,
    DownloadSchema.resumeRequest,
    async (_event, args) => {
      queue.resume(args.downloadId);
      return true;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Download.Cancel,
    DownloadSchema.cancelRequest,
    async (_event, args) => {
      queue.cancel(args.downloadId);
      return true;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Download.CancelAll,
    z.void(),
    async () => {
      queue.cancelAll();
      return true;
    },
    { senderCheck: senderOk },
  );

  // Forward queue events to the renderer.
  const mainContents = () => windows.get('main')?.webContents ?? null;
  forwardEvent(queue, 'progress', IpcChannel.Download.Progress, (p) => [p], mainContents);
  forwardEvent(queue, 'complete', IpcChannel.Download.Complete, (id) => [id], mainContents);
  forwardEvent(queue, 'error', IpcChannel.Download.Error, (id, msg) => [id, msg], mainContents);
}
