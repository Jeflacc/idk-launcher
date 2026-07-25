import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'node:path';
import { WindowManager } from './windows/window-manager';
import { registerAllIpcHandlers, type IpcDeps } from './ipc';
import { HttpClient, DEFAULT_HOST_ALLOWLIST } from '@/infrastructure/net/http-client';
import { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import { MojangClient } from '@/infrastructure/net/api/mojang-client';
import { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import { IdkConnectClient } from '@/infrastructure/net/api/idk-connect-client';
import { MinotarClient } from '@/infrastructure/net/api/minotar-client';
import { MojangContentClient } from '@/infrastructure/net/api/mojang-content-client';
import { CurseforgeClient } from '@/infrastructure/net/api/curseforge-client';
import { SecretStore } from '@/infrastructure/crypto/secret-store';
import { SettingsStore } from '@/infrastructure/fs/settings-store';
import { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import { PathService } from '@/infrastructure/fs/path-service';
import { DownloadQueue } from '@/infrastructure/download/download-queue';
import { LaunchService } from '@/infrastructure/minecraft/launch-service';
import { JavaService } from '@/infrastructure/java/java-service';
import { TunnelService } from '@/infrastructure/tunnel/tunnel-service';
import { UpdaterService } from '@/infrastructure/updater/updater-service';
import { DiscordRpcService } from '@/infrastructure/discord/discord-rpc-service';
import { IntegrityPolicyService } from '@/domain/services/integrity-policy';
import { AuthenticateMicrosoft } from '@/application/use-cases/authenticate-microsoft';
import { AuthenticateElyby } from '@/application/use-cases/authenticate-elyby';
import { LaunchGame } from '@/application/use-cases/launch-game';
import { InstallModpack } from '@/application/use-cases/install-modpack';
import { ExportModpack } from '@/application/use-cases/export-modpack';
import { ImportModpack } from '@/application/use-cases/import-modpack';
import type { LauncherSettings } from '@shared/types';
import { env } from './env-config';

const isDev = env.isDev;
// Preload is bundled by scripts/build-main.mjs to a `.cjs` file so Node/Electron
// treat it as CommonJS regardless of `package.json#type: "module"`.
const PRELOAD_PATH = join(__dirname, '..', 'preload', 'index.cjs');
const RENDERER_DIST = join(__dirname, '..', '..', 'dist-renderer');

// ── Process-level error handlers ──
// Without these, unhandled rejections and uncaught exceptions crash the main
// process silently — no logs, no error modal, just a frozen window.
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled promise rejection:', reason);
});

// ── Event-loop watchdog ──
// Detects when the main process event loop is blocked (e.g. by a synchronous
// operation or a hung HTTP request in mclc). Logs a warning every 5 seconds
// while blocked so the issue is visible in dev tools.
{
  let lastTick = Date.now();
  const THRESHOLD_MS = 3_000;
  const tick = () => {
    const lag = Date.now() - lastTick;
    if (lag > THRESHOLD_MS) {
      console.warn(`[Watchdog] Event loop blocked for ~${lag}ms — possible hung I/O`);
    }
    lastTick = Date.now();
  };
  setInterval(tick, 1_000).unref();
}

// Default settings (matches SettingsSchema defaults).
const DEFAULT_SETTINGS: LauncherSettings = {
  general: {
    theme: 'glass',
    language: 'en',
    minecraftRoot: '',
    discordRpc: true,
    autoUpdate: true,
    backgroundEffect: 'particles',
  },
  java: { customPath: '', autoDetect: true, args: [] },
  memory: { maxMb: 4096, minMb: 1024, autoAllocate: true },
  appearance: { glassmorphism: true, accentColor: '#6366f1', compactMode: false, reducedMotion: false },
  launch: { closeOnLaunch: false, showOverlay: true, autoOptimize: true, windowWidth: 854, windowHeight: 480, fullscreen: false },
  network: { concurrentDownloads: 4, verifyIntegrity: true, proxyUrl: '' },
  connect: { enabled: false, serverUrl: '', tunnelToken: '', tunnelEnabled: false },
  session: { currentUser: '', authMode: 'offline' },
};

async function bootstrap(): Promise<void> {
  await app.whenReady();

  // Migrate userData folder to dot-prefixed name (.idk-launcher).
  // Rename only works on a cold start (folder not locked by Electron).
  // If it fails (EPERM in dev/hot-reload), we keep the old path so data stays accessible.
  const currentUserData = app.getPath('userData');
  const parentDir = dirname(currentUserData);
  const dirName = currentUserData.split(/[/\\]/).pop() || '';
  const dotPrefixedName = '.' + dirName;
  const dotPrefixedPath = join(parentDir, dotPrefixedName);
  if (currentUserData !== dotPrefixedPath) {
    const { existsSync, renameSync } = await import('node:fs');
    const oldExists = existsSync(currentUserData);
    const newExists = existsSync(dotPrefixedPath);
    let switched = false;
    if (newExists) {
      // New path already exists (previous rename, or fresh install) — switch to it
      app.setPath('userData', dotPrefixedPath);
      switched = true;
    } else if (oldExists) {
      // Old folder exists but new doesn't — try to rename (works on cold start only)
      try {
        renameSync(currentUserData, dotPrefixedPath);
        app.setPath('userData', dotPrefixedPath);
        switched = true;
      } catch (e) {
        console.warn('[Bootstrap] rename failed (expected in dev mode):', (e as Error).message);
        // keep currentUserData — don't switch to an empty .idk-launcher
      }
    }
    if (switched) {
      console.log('[Bootstrap] userData migrated to', dotPrefixedPath);
    }
  }

  // Infrastructure
  const paths = new PathService(DEFAULT_SETTINGS.general.minecraftRoot || null);
  await paths.ensureAll();

  const secrets = new SecretStore(paths.secretsFile);
  const settingsStore = new SettingsStore(paths.settingsFile, DEFAULT_SETTINGS);
  const settings = await settingsStore.load();

  const http = new HttpClient(DEFAULT_HOST_ALLOWLIST, 30_000, 2);
  const modrinth = new ModrinthClient(http);
  const mojang = new MojangClient(http);
  const elyby = new ElybyClient(http);
  const idkConnect = new IdkConnectClient(http, env.idkConnectBaseUrl);
  const minotar = new MinotarClient(http);
  const mojangContent = new MojangContentClient(http);
  const curseforge = new CurseforgeClient(http, env.curseforgeApiKey);
  const modpackRepo = new ModpackRepository(paths);
  const downloadQueue = new DownloadQueue(http, settings.network.concurrentDownloads);
  const integrity = new IntegrityPolicyService(settings);
  const launchService = new LaunchService(paths, http, integrity);
  const javaService = new JavaService(paths, http, settings.java.customPath || undefined);
  const tunnel = new TunnelService(paths, http);
  const updater = new UpdaterService();
  const discord = new DiscordRpcService(env.discordClientId);

  // Application use-cases
  const authMicrosoft = new AuthenticateMicrosoft(secrets);
  const authElyby = new AuthenticateElyby(elyby, secrets, env.elybyClientId, env.elybyClientSecret, env.elybyRedirectPort);
  const launchGame = new LaunchGame({ launchService, javaService, secrets, modpackRepo, http, paths, elyby, elybyClientId: env.elybyClientId, elybyClientSecret: env.elybyClientSecret });
  const installModpack = new InstallModpack(modrinth, modpackRepo, downloadQueue);
  const exportModpack = new ExportModpack(modpackRepo);
  const importModpack = new ImportModpack(modpackRepo);

  // Windows
  const windows = new WindowManager(PRELOAD_PATH, RENDERER_DIST);
  windows.create({
    id: 'main',
    width: 1280,
    height: 800,
    frameless: true,
    transparent: true,
    devUrl: isDev ? 'http://localhost:5173' : undefined,
    productionFile: isDev ? undefined : 'index.html',
  });

  if (settings.general.discordRpc) {
    void discord.connect();
  }

  if (settings.general.autoUpdate) {
    void updater.check();
  }

  // IPC
  const ipcDeps: IpcDeps = {
    windows,
    http,
    modrinth,
    mojang,
    elyby,
    idkConnect,
    minotar,
    mojangContent,
    curseforge,
    secrets,
    settingsStore,
    modpackRepo,
    downloadQueue,
    paths,
    authMicrosoft,
    authElyby,
    launchGame,
    installModpack,
    exportModpack,
    importModpack,
    updater,
    tunnel,
  };
  registerAllIpcHandlers(ipcDeps);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windows.create({
        id: 'main',
        width: 1280,
        height: 800,
        frameless: true,
        transparent: true,
        devUrl: isDev ? 'http://localhost:5173' : undefined,
        productionFile: isDev ? undefined : 'index.html',
      });
    }
  });
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  app.quit();
});
