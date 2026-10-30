import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import { join } from 'node:path';
import type { WindowManager } from '../../windows/window-manager';
import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { PathService } from '@/infrastructure/fs/path-service';
import { CrashAnalyzerService } from '@/domain/services/crash-analyzer';

/**
 * Crash-analysis IPC handlers.
 *
 * The analyzer is a pure domain service (CrashAnalyzerService). v1 had the
 * logic in the renderer (crash-analyzer-feature.js, 252 lines); v2 moves it
 * to the backend where it belongs.
 */
export function registerCrashHandlers(
  windows: WindowManager,
  modrinth: ModrinthClient,
  paths: PathService,
  queue: DownloadQueue,
  _crashAnalyzer?: CrashAnalyzerService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  // Analyze a crash log and return structured analysis
  registerInvoke(
    IpcChannel.Crash.Analyze,
    z.object({ crashLog: z.string() }),
    async (_event, args) => {
      const analyzer = _crashAnalyzer ?? new CrashAnalyzerService();
      return analyzer.analyze(args.crashLog);
    },
    { senderCheck: senderOk },
  );

  // Auto-install missing dependencies by searching Modrinth and downloading
  // the primary file into the modpack's mods folder.
  registerInvoke(
    IpcChannel.Crash.AutoInstallDependencies,
    z.object({
      modpackId: z.string().optional(),
      missingMods: z.array(z.string()),
      mcVersion: z.string().optional(),
    }),
    async (_event, args) => {
      const results: Array<{
        success: boolean;
        filename?: string;
        name?: string;
        modId?: string;
        reason?: string;
      }> = [];
      const loaderHints = ['fabric', 'forge', 'neoforge', 'quilt'];

      for (const modName of args.missingMods) {
        try {
          const search = await modrinth.searchMods(modName, null, 1);
          const hit = search.hits[0];
          if (!hit) {
            results.push({ success: false, modId: modName, reason: 'Not found on Modrinth' });
            continue;
          }
          const versions = await modrinth.getVersions(hit.project_id, args.mcVersion || undefined);
          const version =
            versions.find((v) => v.loaders.some((l) => loaderHints.includes(l))) ?? versions[0];
          const file = version?.files.find((f) => f.primary) ?? version?.files[0];
          if (!version || !file?.url) {
            results.push({ success: false, modId: hit.title || modName, reason: 'No compatible version found' });
            continue;
          }
          if (args.modpackId) {
            const targetPath = join(paths.modpackDirectory(args.modpackId), 'mods', file.filename);
            const downloadId = `crash-dep:${args.modpackId}:${file.filename}`;
            await queue.start(
              downloadId,
              [{ url: file.url, targetPath, filename: file.filename, skipIfPresent: false }],
              1,
            );
          }
          results.push({ success: true, filename: file.filename, name: hit.title, modId: hit.project_id });
        } catch (err) {
          results.push({
            success: false,
            modId: modName,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return results;
    },
    { senderCheck: senderOk },
  );

  // Crash.MissingDependencies — scan a crash log for missing mod dependencies
  registerInvoke(
    IpcChannel.Crash.MissingDependencies,
    z.object({ crashLog: z.string() }),
    async (_event, args) => {
      const analyzer = _crashAnalyzer ?? new CrashAnalyzerService();
      const report = analyzer.analyze(args.crashLog);
      // Extract missing mod names from the crash analysis
      const missing: string[] = [];
      if (report && typeof report === 'object') {
        const r = report as unknown as Record<string, unknown>;
        if (Array.isArray(r.missingMods)) {
          for (const mod of r.missingMods) {
            if (typeof mod === 'string') missing.push(mod);
          }
        }
        if (Array.isArray(r.suggestions)) {
          for (const s of r.suggestions) {
            if (typeof s === 'string' && s.toLowerCase().includes('install')) {
              missing.push(s);
            }
          }
        }
      }
      return { missingMods: missing };
    },
    { senderCheck: senderOk },
  );
}
