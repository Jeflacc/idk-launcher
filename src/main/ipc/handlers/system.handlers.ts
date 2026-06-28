import { app, shell, dialog } from 'electron';
import { registerInvoke, registerSend } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { HttpClient } from '@/infrastructure/net/http-client';

/**
 * System / window IPC handlers. Replaces the window-management and
 * open-external handlers in v1 (which had no URL allowlist — SSRF/RCE risk).
 */
export function registerSystemHandlers(
  windows: WindowManager,
  _http: HttpClient,
): void {
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
  registerInvoke(IpcChannel.System.GetVersionsPath, z.void(), () => app.getPath('userData') + '/minecraft/versions');

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

  registerInvoke(IpcChannel.System.OpenMinecraftFolder, z.void(), async () => {
    // path-service owns the real path; this handler opens whatever shell.openPath receives
  });

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

  registerSend(IpcChannel.System.RendererLog, z.string(), (_event, msg) => {
    // eslint-disable-next-line no-console
    console.log('[renderer]', msg);
  });
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
