import type { WindowManager } from '../windows/window-manager';
import { registerSystemHandlers, forwardWindowState } from './handlers/system.handlers';
import { registerAuthHandlers } from './handlers/auth.handlers';
import { registerLaunchHandlers } from './handlers/launch.handlers';
import { registerModpackHandlers } from './handlers/modpack.handlers';
import { registerDownloadHandlers } from './handlers/download.handlers';
import { registerSettingsHandlers } from './handlers/settings.handlers';
import { registerVersionHandlers } from './handlers/version.handlers';
import { registerUpdateHandlers } from './handlers/update.handlers';
import { registerTunnelHandlers } from './handlers/tunnel.handlers';
import { registerSkinHandlers } from './handlers/skin.handlers';
import { registerCrashHandlers } from './handlers/crash.handlers';
import { registerAchievementsHandlers } from './handlers/achievements.handlers';
import { registerOverlayHandlers } from './handlers/overlay.handlers';

/**
 * Composition root for IPC. Every handler receives its dependencies explicitly
 * — no service locator, no globals. This is the single place where the
 * infrastructure services are wired to the IPC surface.
 *
 * Replaces v1's 75 untyped ipcMain handlers scattered through electron-main.cjs.
 */
export interface IpcDeps {
  windows: WindowManager;
  http: import('@/infrastructure/net/http-client').HttpClient;
  modrinth: import('@/infrastructure/net/api/modrinth-client').ModrinthClient;
  mojang: import('@/infrastructure/net/api/mojang-client').MojangClient;
  elyby: import('@/infrastructure/net/api/elyby-client').ElybyClient;
  secrets: import('@/infrastructure/crypto/secret-store').SecretStore;
  settingsStore: import('@/infrastructure/fs/settings-store').SettingsStore;
  modpackRepo: import('@/infrastructure/fs/modpack-repository').ModpackRepository;
  downloadQueue: import('@/infrastructure/download/download-queue').DownloadQueue;
  paths: import('@/infrastructure/fs/path-service').PathService;
  authMicrosoft: import('@/application/use-cases/authenticate-microsoft').AuthenticateMicrosoft;
  authElyby: import('@/application/use-cases/authenticate-elyby').AuthenticateElyby;
  launchGame: import('@/application/use-cases/launch-game').LaunchGame;
  installModpack: import('@/application/use-cases/install-modpack').InstallModpack;
  exportModpack: import('@/application/use-cases/export-modpack').ExportModpack;
  importModpack: import('@/application/use-cases/import-modpack').ImportModpack;
  updater: import('@/infrastructure/updater/updater-service').UpdaterService;
  tunnel: import('@/infrastructure/tunnel/tunnel-service').TunnelService;
}

export function registerAllIpcHandlers(deps: IpcDeps): void {
  registerSystemHandlers(deps.windows, deps.http);
  forwardWindowState(deps.windows);
  registerAuthHandlers(deps.windows, deps.authMicrosoft, deps.authElyby, deps.elyby, deps.secrets);
  registerLaunchHandlers(deps.windows, deps.launchGame);
  registerModpackHandlers(deps.windows, deps.modpackRepo, deps.modrinth, deps.installModpack, deps.exportModpack, deps.importModpack, deps.launchGame);
  registerDownloadHandlers(deps.windows, deps.downloadQueue);
  registerSettingsHandlers(deps.windows, deps.settingsStore);
  registerVersionHandlers(deps.windows, deps.mojang, deps.downloadQueue, deps.paths);
  registerUpdateHandlers(deps.windows, deps.updater);
  registerTunnelHandlers(deps.windows, deps.tunnel);
  registerSkinHandlers(deps.windows, deps.http);
  registerCrashHandlers(deps.windows);
  registerAchievementsHandlers(deps.windows, deps.modpackRepo);
  registerOverlayHandlers(deps.windows);
}
