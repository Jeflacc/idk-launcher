import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
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
};

async function bootstrap(): Promise<void> {
  await app.whenReady();

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
  const authElyby = new AuthenticateElyby(elyby, secrets);
  const launchGame = new LaunchGame({ launchService, javaService, secrets, modpackRepo });
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
