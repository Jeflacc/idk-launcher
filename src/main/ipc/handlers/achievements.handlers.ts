import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import type { WindowManager } from '../../windows/window-manager';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { PathService } from '@/infrastructure/fs/path-service';

interface ScannedAchievement {
  id: string;
  name: string;
  completed: boolean;
  date?: string;
}

/** Read achievement JSON files from an instance's stats directory. */
async function scanStatsDir(statsDir: string): Promise<ScannedAchievement[]> {
  try {
    const files = await readdir(statsDir);
    const achievements: ScannedAchievement[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await readFile(join(statsDir, file), 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const ach of data) {
            if (ach && ach.id) {
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
    return achievements;
  } catch {
    return [];
  }
}

export function registerAchievementsHandlers(
  windows: WindowManager,
  repo: ModpackRepository,
  paths: PathService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Achievements.ScanProfile,
    z.object({ modpackId: z.string() }),
    async (_event, args) => {
      const profile = await repo.readProfile(args.modpackId);
      if (!profile) return [];
      // The stats dir lives inside the instance's game directory.
      const statsDir = join(paths.modpackDirectory(profile.id), 'stats');
      return scanStatsDir(statsDir);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Achievements.ScanAll,
    z.void(),
    async () => {
      const modpacks = await repo.list();
      const achievements: Array<{
        modpackId: string;
        modpackName: string;
        achievementCount: number;
        completedCount: number;
      }> = [];
      let count = 0;
      for (const mp of modpacks) {
        const found = await scanStatsDir(join(paths.modpackDirectory(mp.id), 'stats'));
        const completed = found.filter((a) => a.completed).length;
        count += completed;
        achievements.push({
          modpackId: mp.id,
          modpackName: mp.name,
          achievementCount: found.length,
          completedCount: completed,
        });
      }
      // v1 renderer expects { success, count } — keep the array too.
      return { success: true, count, achievements };
    },
    { senderCheck: senderOk },
  );
}
