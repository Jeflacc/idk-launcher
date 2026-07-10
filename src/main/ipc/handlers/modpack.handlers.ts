import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { ModpackSchema } from '@shared/schemas/modpack.schema';
import { LaunchSchema } from '@shared/schemas/launch.schema';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import type { InstallModpack } from '@/application/use-cases/install-modpack';
import type { ExportModpack } from '@/application/use-cases/export-modpack';
import type { ImportModpack } from '@/application/use-cases/import-modpack';
import type { LaunchGame } from '@/application/use-cases/launch-game';

export function registerModpackHandlers(
  windows: WindowManager,
  repo: ModpackRepository,
  _modrinth: ModrinthClient,
  installModpack: InstallModpack,
  exportModpack: ExportModpack,
  importModpack: ImportModpack,
  launchGame: LaunchGame,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Modpack.ScanProfiles,
    z.void(),
    async () => repo.list(),
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Modpack.DeleteFolder,
    ModpackSchema.deleteFolderRequest,
    async (_event, args) => {
      await repo.delete(args.modpackId);
      return true;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Modpack.UpdateProfile,
    ModpackSchema.updateProfileRequest,
    async (_event, args) => repo.updateProfile(args.modpackId, args.changes),
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Modpack.Launch,
    ModpackSchema.launchRequest,
    async (_event, args) => {
      const profile = await repo.readProfile(args.modpackId);
      if (!profile) throw new Error('Modpack not found');
      const result = await launchGame.execute(LaunchSchema.options.parse({
        versionId: profile.minecraftVersion,
        modpackId: args.modpackId,
        loader: profile.loader,
        loaderVersion: profile.loaderVersion,
        authProvider: 'microsoft',
      }));
      return result;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Mod.Install,
    z.object({
      projectId: z.string(),
      minecraftVersion: z.string(),
      loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']),
      name: z.string(),
    }),
    async (_event, args) => installModpack.execute({ modrinthProjectId: args.projectId, minecraftVersion: args.minecraftVersion, loader: args.loader, name: args.name }),
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Mod.ExportModpack,
    z.object({ modpackId: z.string(), targetPath: z.string() }),
    async (_event, args) => {
      await exportModpack.execute(args.modpackId, args.targetPath);
      return true;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Mod.UnzipCurseforge,
    z.object({ zipPath: z.string(), name: z.string() }),
    async (_event, args) => importModpack.execute(args.zipPath, args.name),
    { senderCheck: senderOk },
  );
}
