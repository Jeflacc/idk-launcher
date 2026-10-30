import { app, shell, dialog } from 'electron';
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { registerInvoke, registerSend } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { PathService } from '@/infrastructure/fs/path-service';


/**
 * System / window IPC handlers. Replaces the v1's window-management and
 * open-external handlers (which had no URL allowlist — SSRF/RCE risk).
 */
export function registerSystemHandlers(
  windows: WindowManager,
  _http: HttpClient,
  paths: PathService,
): void {
  const sanitizeInstanceId = (id: string): string => id.replace(/[\\/:*?"<>|]/g, '-');

  const resolveProfileDir = (instanceId: string): string | null => {
    const direct = join(paths.modpacks, instanceId);
    if (existsSync(direct)) return direct;
    const sanitized = join(paths.modpacks, sanitizeInstanceId(instanceId));
    if (existsSync(sanitized)) return sanitized;
    return null;
  };
  registerSend(IpcChannel.Window.Minimize, z.void(), () => {
    windows.get('main')?.minimize();
  });
  registerSend(IpcChannel.Window.Maximize, z.void(), () => {
    const win = windows.get('main');
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  registerSend(IpcChannel.Window.Close, z.void(), () => windows.get('main')?.close());
  registerSend(IpcChannel.Window.ToggleDevTools, z.void(), () => {
    windows.get('main')?.webContents.toggleDevTools();
  });

  registerInvoke(IpcChannel.System.GetUserDataPath, z.void(), () => app.getPath('userData'));
  registerInvoke(IpcChannel.System.GetVersionsPath, z.void(), () => paths.versions);
  registerInvoke(IpcChannel.System.GetProfilesPath, z.void(), () => paths.modpacks);
  registerInvoke(IpcChannel.System.GetMinecraftRootPath, z.void(), () => paths.minecraftRoot);

  const externalUrlSchema = z.string().url();
  registerSend(IpcChannel.System.OpenExternal, externalUrlSchema, (_event, url) => {
    // Allowlist: http/https only. Blocks file:// and custom schemes.
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        void shell.openExternal(url);
      }
    } catch {
      // invalid url — ignore
    }
  });

  registerSend(IpcChannel.System.OpenMinecraftFolder, z.void(), () => {
    void shell.openPath(paths.minecraftRoot);
  });

  registerInvoke(IpcChannel.System.OpenPath, z.object({ folderPath: z.string() }), async (_event, args) => {
    await shell.openPath(args.folderPath);
    return { success: true };
  });

  registerInvoke(
    IpcChannel.System.ResolveInstancePath,
    z.object({ instanceId: z.string(), subfolder: z.string().optional() }),
    (_event, args) => {
      const base = resolveProfileDir(args.instanceId);
      if (!base) return { path: '', exists: false };
      const target = args.subfolder ? join(base, args.subfolder) : base;
      return { path: target, exists: existsSync(target) };
    },
  );

  registerSend(
    IpcChannel.System.OpenInstanceFolder,
    z.object({ instanceId: z.string(), subfolder: z.string().optional() }),
    (_event, args) => {
      const base = resolveProfileDir(args.instanceId);
      if (base) {
        const target = args.subfolder ? join(base, args.subfolder) : base;
        if (existsSync(target)) {
          void shell.openPath(target);
          return;
        }
      }
      void shell.openPath(paths.minecraftRoot);
    },
  );

  registerInvoke(IpcChannel.System.SelectMinecraftFolder, z.void(), async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  registerInvoke(IpcChannel.System.SelectImageFile, z.void(), async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  registerInvoke(IpcChannel.System.SelectModpackZip, z.void(), async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Modpacks', extensions: ['zip', 'mrpack'] }],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  registerInvoke(IpcChannel.System.SelectExportZip, z.object({ defaultName: z.string().optional() }), async () => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'Modpack', extensions: ['zip'] }],
    });
    return result.canceled ? null : result.filePath ?? null;
  });

  registerInvoke(
    IpcChannel.System.EnsureInstance,
    z.object({ instanceId: z.string() }),
    async (_event, args) => {
      const id = args.instanceId.replace(/[\\/:*?"<>|]/g, '-');
      const dir = join(paths.modpacks, id);
      if (existsSync(join(dir, 'profile.json'))) {
        return { directory: dir, created: false };
      }
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, 'mods'), { recursive: true });
      mkdirSync(join(dir, 'resourcepacks'), { recursive: true });
      mkdirSync(join(dir, 'shaderpacks'), { recursive: true });
      const profile = {
        id,
        name: id,
        description: '',
        minecraftVersion: id,
        loader: 'vanilla' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        playtimeSeconds: 0,
        mods: [] as string[],
      };
      writeFileSync(join(dir, 'profile.json'), JSON.stringify(profile, null, 2), 'utf8');
      return { directory: dir, created: true };
    },
  );

  registerSend(IpcChannel.System.RendererLog, z.string(), (_event, msg) => {
    // eslint-disable-next-line no-console
    console.log('[renderer]', msg);
  });

  // Startup.ShowNotification — show a system notification from the main process
  registerSend(
    IpcChannel.Startup.ShowNotification,
    z.object({ title: z.string(), body: z.string().optional() }),
    (_event, args) => {
      const win = windows.get('main');
      if (win && !win.isDestroyed()) {
        win.webContents.send(IpcChannel.Startup.ShowNotification, args);
      }
    },
  );
}

export function forwardWindowState(windows: WindowManager): void {
  const win = windows.get('main');
  if (!win) return;
  win.on('maximize', () => {
    if (!win.isDestroyed()) win.webContents.send(IpcChannel.Window.StateChanged, { maximized: true });
  });
  win.on('unmaximize', () => {
    if (!win.isDestroyed()) win.webContents.send(IpcChannel.Window.StateChanged, { maximized: false });
  });
}
