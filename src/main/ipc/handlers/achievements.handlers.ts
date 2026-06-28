import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';

export function registerAchievementsHandlers(
  windows: WindowManager,
  repo: ModpackRepository,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Achievements.ScanProfile,
    z.object({ modpackId: z.string() }),
    async (_event, args) => {
      const profile = await repo.readProfile(args.modpackId);
      if (!profile) return [];
      // Achievements live in the profile's stats; v1's scanner is replaced by a
      // domain service (out of scope for this scaffold).
      return [];
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Achievements.ScanAll,
    z.void(),
    async () => [],
    { senderCheck: senderOk },
  );
}
