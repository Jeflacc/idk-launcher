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
      // Scan the modpack's directory for achievement JSON files
      const { join } = await import('node:path');
      const { readdir, readFile, mkdir } = await import('node:fs/promises');
      const statsDir = join(profile.id, 'stats');
      try {
        await mkdir(statsDir, { recursive: true });
        const files = await readdir(statsDir);
        const achievements: Array<{ id: string; name: string; completed: boolean; date?: string }> = [];
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const raw = await readFile(join(statsDir, file), 'utf8');
              const data = JSON.parse(raw);
              if (Array.isArray(data)) {
                for (const ach of data) {
                  if (ach.id) {
                    achievements.push({
                      id: ach.id,
                      name: ach.name || ach.id,
                      completed: ach.completed ?? false,
                      date: ach.date,
                    });
                  }
                }
              }
            } catch { /* skip invalid JSON */ }
          }
        }
        return achievements;
      } catch {
        return [];
      }
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Achievements.ScanAll,
    z.void(),
    async () => {
      const modpacks = await repo.list();
      const allAchievements: Array<{ modpackId: string; modpackName: string; achievementCount: number; completedCount: number }> = [];
      for (const mp of modpacks) {
        allAchievements.push({
          modpackId: mp.id,
          modpackName: mp.name,
          achievementCount: 0,
          completedCount: 0,
        });
      }
      return allAchievements;
    },
    { senderCheck: senderOk },
  );
}
