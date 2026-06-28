import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel } from '@shared/ipc-channels';
import type {
  LaunchOptions,
  LaunchProgress,
  DownloadProgress,
  DownloadItem,
  AuthSession,
  Modpack,
} from '@shared/types';

/**
 * The renderer-facing API surface. Namespaced by domain (v1 was a flat
 * 86-method surface). Every method maps 1:1 to a typed, zod-validated IPC
 * channel registered in src/main/ipc/handlers/*.
 *
 * The renderer imports `preloadApi` for full type safety — no `any`, no
 * stringly-typed channel names.
 */
export const preloadApi = {
  window: {
    minimize: () => ipcRenderer.send(IpcChannel.Window.Minimize),
    maximize: () => ipcRenderer.send(IpcChannel.Window.Maximize),
    close: () => ipcRenderer.send(IpcChannel.Window.Close),
    toggleDevTools: () => ipcRenderer.send(IpcChannel.Window.ToggleDevTools),
    onStateChanged: (cb: (state: { maximized: boolean }) => void) =>
      ipcRenderer.on(IpcChannel.Window.StateChanged, (_e, s) => cb(s)),
  },

  system: {
    getUserDataPath: () => ipcRenderer.invoke(IpcChannel.System.GetUserDataPath),
    getVersionsPath: () => ipcRenderer.invoke(IpcChannel.System.GetVersionsPath),
    openExternal: (url: string) => ipcRenderer.send(IpcChannel.System.OpenExternal, url),
    openMinecraftFolder: () => ipcRenderer.send(IpcChannel.System.OpenMinecraftFolder),
    selectMinecraftFolder: () => ipcRenderer.invoke(IpcChannel.System.SelectMinecraftFolder),
    selectImageFile: () => ipcRenderer.invoke(IpcChannel.System.SelectImageFile),
    selectModpackZip: () => ipcRenderer.invoke(IpcChannel.System.SelectModpackZip),
    selectExportZip: (defaultName?: string) =>
      ipcRenderer.invoke(IpcChannel.System.SelectExportZip, { defaultName }),
    log: (msg: string) => ipcRenderer.send(IpcChannel.System.RendererLog, msg),
  },

  auth: {
    microsoftAuthenticate: (interactive = true) =>
      ipcRenderer.invoke(IpcChannel.Auth.MicrosoftAuthenticate, { interactive }) as Promise<AuthSession>,
    getMicrosoftAuthData: () =>
      ipcRenderer.invoke(IpcChannel.Auth.GetMicrosoftAuthData) as Promise<AuthSession | null>,
    elybyAuthenticate: (username: string, password: string) =>
      ipcRenderer.invoke(IpcChannel.Auth.ElybyAuthenticate, { username, password }) as Promise<AuthSession>,
    fetchElybyProfile: (username: string) =>
      ipcRenderer.invoke(IpcChannel.Auth.FetchElybyProfile, { username }),
    getElybyAuthData: () =>
      ipcRenderer.invoke(IpcChannel.Auth.GetElybyAuthData) as Promise<AuthSession | null>,
    signOut: () => ipcRenderer.invoke(IpcChannel.Auth.SignOut),
  },

  launch: {
    minecraft: (options: LaunchOptions) => ipcRenderer.send(IpcChannel.Launch.Minecraft, options),
    cancel: () => ipcRenderer.send(IpcChannel.Launch.Cancel),
    onProgress: (cb: (p: LaunchProgress) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Progress, (_e, p) => cb(p)),
    onGameLaunched: (cb: (info: { pid: number }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.GameLaunched, (_e, i) => cb(i)),
    onClosed: (cb: (info: { duration: number; crashed: boolean }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Closed, (_e, i) => cb(i)),
    onError: (cb: (err: { message: string }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Error, (_e, e) => cb(e)),
    onWarning: (cb: (msg: { message: string }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Warning, (_e, w) => cb(w)),
  },

  modpack: {
    scanProfiles: () => ipcRenderer.invoke(IpcChannel.Modpack.ScanProfiles) as Promise<Modpack[]>,
    deleteFolder: (modpackId: string) =>
      ipcRenderer.invoke(IpcChannel.Modpack.DeleteFolder, { modpackId }),
    updateProfile: (modpackId: string, changes: Record<string, unknown>) =>
      ipcRenderer.invoke(IpcChannel.Modpack.UpdateProfile, { modpackId, changes }),
    launch: (modpackId: string, quickConnect?: string) =>
      ipcRenderer.invoke(IpcChannel.Modpack.Launch, { modpackId, quickConnect }),
    install: (projectId: string, minecraftVersion: string, loader: Modpack['loader'], name: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.Install, { projectId, minecraftVersion, loader, name }),
    export: (modpackId: string, targetPath: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.ExportModpack, { modpackId, targetPath }),
    importZip: (zipPath: string, name: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.UnzipCurseforge, { zipPath, name }),
  },

  download: {
    start: (downloadId: string, items: DownloadItem[], concurrency = 4) =>
      ipcRenderer.invoke(IpcChannel.Download.Start, { downloadId, items, concurrency }),
    pause: (downloadId: string) => ipcRenderer.invoke(IpcChannel.Download.Pause, { downloadId }),
    resume: (downloadId: string) => ipcRenderer.invoke(IpcChannel.Download.Resume, { downloadId }),
    cancel: (downloadId: string) => ipcRenderer.invoke(IpcChannel.Download.Cancel, { downloadId }),
    cancelAll: () => ipcRenderer.invoke(IpcChannel.Download.CancelAll),
    onProgress: (cb: (p: DownloadProgress) => void) =>
      ipcRenderer.on(IpcChannel.Download.Progress, (_e, p) => cb(p)),
    onComplete: (cb: (downloadId: string) => void) =>
      ipcRenderer.on(IpcChannel.Download.Complete, (_e, id) => cb(id)),
    onError: (cb: (downloadId: string, msg: string) => void) =>
      ipcRenderer.on(IpcChannel.Download.Error, (_e, id, m) => cb(id, m)),
  },

  settings: {
    load: () => ipcRenderer.invoke(IpcChannel.Settings.Load),
    save: (settings: Partial<import('@shared/types').LauncherSettings>) =>
      ipcRenderer.invoke(IpcChannel.Settings.Save, settings),
    reset: () => ipcRenderer.invoke(IpcChannel.Settings.Reset),
    getByCategory: (category: string) => ipcRenderer.invoke(IpcChannel.Settings.GetByCategory, category),
    search: (query: string) => ipcRenderer.invoke(IpcChannel.Settings.Search, query),
    getCategories: () => ipcRenderer.invoke(IpcChannel.Settings.GetCategories),
  },

  version: {
    scanDownloaded: () => ipcRenderer.invoke(IpcChannel.Version.ScanDownloaded) as Promise<string[]>,
    download: (versionId: string, loader = 'vanilla', loaderVersion?: string) =>
      ipcRenderer.invoke(IpcChannel.Version.Download, { versionId, loader, loaderVersion }),
    cancelDownload: (versionId?: string) =>
      ipcRenderer.invoke(IpcChannel.Version.CancelDownload, { versionId }),
  },

  skin: {
    fetchImageBase64: (url: string) =>
      ipcRenderer.invoke(IpcChannel.Skin.FetchImageBase64, url) as Promise<string>,
    uploadMicrosoftSkin: (filePath: string, variant: 'classic' | 'slim') =>
      ipcRenderer.invoke(IpcChannel.Skin.UploadMicrosoftSkin, { filePath, variant }),
  },

  tunnel: {
    ensureFrpc: () => ipcRenderer.invoke(IpcChannel.Tunnel.EnsureFrpc),
    start: (port: number, token: string) =>
      ipcRenderer.invoke(IpcChannel.Tunnel.Start, { port, token }),
    stop: () => ipcRenderer.invoke(IpcChannel.Tunnel.Stop),
    onClosed: (cb: () => void) => ipcRenderer.on(IpcChannel.Tunnel.Closed, () => cb()),
  },

  update: {
    check: () => ipcRenderer.invoke(IpcChannel.Update.Check),
    download: () => ipcRenderer.invoke(IpcChannel.Update.Download),
    install: () => ipcRenderer.invoke(IpcChannel.Update.Install),
    onAvailable: (cb: (info: unknown) => void) =>
      ipcRenderer.on(IpcChannel.Update.Available, (_e, i) => cb(i)),
    onProgress: (cb: (p: unknown) => void) =>
      ipcRenderer.on(IpcChannel.Update.Progress, (_e, p) => cb(p)),
    onDownloaded: (cb: (info: unknown) => void) =>
      ipcRenderer.on(IpcChannel.Update.Downloaded, (_e, i) => cb(i)),
    onError: (cb: (err: { message: string }) => void) =>
      ipcRenderer.on(IpcChannel.Update.Error, (_e, e) => cb(e)),
  },
} as const;

export type PreloadApi = typeof preloadApi;

// Expose the namespaced API to the renderer via contextBridge.
contextBridge.exposeInMainWorld('idk', preloadApi);
