import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
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

  registerInvoke(
    IpcChannel.Crash.AutoInstallDependencies,
    z.object({ missingMods: z.array(z.string()) }),
    async (_event, args) => {
      return { requested: args.missingMods, status: 'queued' as const };
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
