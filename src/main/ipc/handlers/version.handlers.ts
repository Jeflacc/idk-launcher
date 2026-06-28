import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { VersionSchema } from '@shared/schemas/version.schema';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { MojangClient } from '@/infrastructure/net/api/mojang-client';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { PathService } from '@/infrastructure/fs/path-service';

export function registerVersionHandlers(
  windows: WindowManager,
  mojang: MojangClient,
  queue: DownloadQueue,
  paths: PathService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Version.ScanDownloaded,
    z.void(),
    async () => {
      const { readdir } = await import('node:fs/promises');
      try {
        return await readdir(paths.versions, { withFileTypes: true })
          .then((entries) => entries.filter((e) => e.isDirectory()).map((e) => e.name));
      } catch {
        return [];
      }
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Version.Download,
    VersionSchema.downloadRequest,
    async (_event, args) => {
      const manifest = await mojang.getManifest();
      const version = manifest.versions.find((v) => v.id === args.versionId);
      if (!version) throw new Error(`Version ${args.versionId} not found`);
      const targetPath = paths.resolveSafeTarget('versions', `${args.versionId}/${args.versionId}.json`);
      const downloadId = `version:${args.versionId}`;
      await queue.start(downloadId, [{ url: version.url, targetPath, filename: `${args.versionId}.json`, skipIfPresent: true }], 1);
      return downloadId;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Version.CancelDownload,
    VersionSchema.cancelDownloadRequest,
    async (_event, args) => {
      if (args.versionId) queue.cancel(`version:${args.versionId}`);
      else queue.cancelAll();
      return true;
    },
    { senderCheck: senderOk },
  );
}
