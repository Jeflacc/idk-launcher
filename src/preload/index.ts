import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel } from '@shared/ipc-channels';
import type {
  LaunchOptions,
  LaunchProgress,
  DownloadProgress,
  DownloadItem,
  AuthSession,
  Modpack,
  IdkUser,
  IdkUserProfile,
  Friend,
  FriendRequest,
  IdkMessage,
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
    fetchMicrosoftProfile: () =>
      ipcRenderer.invoke(IpcChannel.Auth.FetchMicrosoftProfile),
    elybyAuthenticate: (username: string, password: string) =>
      ipcRenderer.invoke(IpcChannel.Auth.ElybyAuthenticate, { username, password }) as Promise<AuthSession>,
    elybyOAuthAuthenticate: () =>
      ipcRenderer.invoke(IpcChannel.Auth.ElybyOAuthAuthenticate, {}) as Promise<AuthSession>,
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
    onClosed: (cb: (info: { duration: number; crashed: boolean; code?: number; output?: string }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Closed, (_e, i) => cb(i)),
    onError: (cb: (err: { message: string }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Error, (_e, e) => cb(e)),
    onWarning: (cb: (msg: { message: string }) => void) =>
      ipcRenderer.on(IpcChannel.Launch.Warning, (_e, w) => cb(w)),
    onClearJavaPath: (cb: () => void) =>
      ipcRenderer.on(IpcChannel.Launch.ClearJavaPath, () => cb()),
  },

  modpack: {
    scanProfiles: () => ipcRenderer.invoke(IpcChannel.Modpack.ScanProfiles) as Promise<Modpack[]>,
    deleteFolder: (modpackId: string) =>
      ipcRenderer.invoke(IpcChannel.Modpack.DeleteFolder, { modpackId }),
    updateProfile: (modpackId: string, changes: Record<string, unknown>) =>
      ipcRenderer.invoke(IpcChannel.Modpack.UpdateProfile, { modpackId, changes }),
    launch: (modpackId: string, quickConnect?: string) =>
      ipcRenderer.send(IpcChannel.Modpack.Launch, { modpackId, quickConnect }),
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
    export: () => ipcRenderer.invoke(IpcChannel.Settings.Export),
    import: (data: string) => ipcRenderer.invoke(IpcChannel.Settings.Import, { data }),
    getByCategory: (category: string) => ipcRenderer.invoke(IpcChannel.Settings.GetByCategory, category),
    search: (query: string) => ipcRenderer.invoke(IpcChannel.Settings.Search, query),
    getCategories: () => ipcRenderer.invoke(IpcChannel.Settings.GetCategories),
  },

  version: {
    scanDownloaded: () => ipcRenderer.invoke(IpcChannel.Version.ScanDownloaded) as Promise<string[]>,
    getManifest: () => ipcRenderer.invoke(IpcChannel.Version.GetManifest),
    getSodiumVersions: () => ipcRenderer.invoke(IpcChannel.Version.GetSodiumVersions) as Promise<string[]>,
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
    fetchElybySkinBase64: (username: string) =>
      ipcRenderer.invoke(IpcChannel.Skin.FetchElybySkinBase64, { username }) as Promise<string>,
    fetchMinotarSkinBase64: (username: string) =>
      ipcRenderer.invoke(IpcChannel.Skin.FetchMinotarSkinBase64, { username }) as Promise<string>,
    resolveSkinTextureBase64: (username: string, authMode: 'offline' | 'microsoft' | 'elyby') =>
      ipcRenderer.invoke(IpcChannel.Skin.ResolveSkinTextureBase64, { username, authMode }) as Promise<{ base64: string; source: string }>,
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

  content: {
    getMojangNews: () => ipcRenderer.invoke(IpcChannel.Content.GetMojangNews),
    getTrendingModpacks: () => ipcRenderer.invoke(IpcChannel.Content.GetTrendingModpacks),
  },

  mod: {
    search: (query: string, loader: string | null, projectType: 'mod' | 'modpack' | 'resourcepack' | 'shader', limit?: number) =>
      ipcRenderer.invoke(IpcChannel.Mod.Search, { query, loader, projectType, limit }),
    getProject: (projectId: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.GetProject, { projectId }),
    getVersions: (projectId: string, gameVersion?: string, loader?: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.GetVersions, { projectId, gameVersion, loader }),
    getDependencies: (projectId: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.GetDependencies, { projectId }),
    checkUpdates: (mods: Array<{ projectId: string | null; fileId: string; fileName: string; gameVersion: string; loader: string }>) =>
      ipcRenderer.invoke(IpcChannel.Mod.CheckUpdates, { mods }),
    getChangelog: (projectId: string, versionId: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.GetChangelog, { projectId, versionId }),
    scanMissingDependencies: (mods: Array<{ projectId: string | null; fileName: string }>) =>
      ipcRenderer.invoke(IpcChannel.Mod.ScanMissingDependencies, { mods }),
    checkIncompatibilities: (modIds: string[]) =>
      ipcRenderer.invoke(IpcChannel.Mod.CheckIncompatibilities, { modIds }),
    installFromBrowser: (modpackId: string, projectId: string, versionId: string, downloadUrl: string, fileName: string, type: 'mod' | 'resourcepack' | 'shader') =>
      ipcRenderer.invoke(IpcChannel.Mod.InstallFromBrowser, { modpackId, projectId, versionId, downloadUrl, fileName, type }),
    installToVersion: (versionId: string, projectId: string, versionIdTarget: string, downloadUrl: string, fileName: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.InstallToVersion, { versionId, projectId, versionIdTarget, downloadUrl, fileName }),
    installUpdate: (modpackId: string, fileId: string, downloadUrl: string, fileName: string, oldFileName?: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.InstallUpdate, { modpackId, fileId, downloadUrl, fileName, oldFileName }),
    resolveDependencies: (modpackId: string, modId: string, dependencyIds: string[]) =>
      ipcRenderer.invoke(IpcChannel.Mod.ResolveDependencies, { modpackId, modId, dependencyIds }),
    remove: (modpackId: string, modFileName: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.Remove, { modpackId, modFileName }),
    installResourcepack: (modpackId: string, projectId: string, versionId: string, downloadUrl: string, fileName: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.InstallResourcepack, { modpackId, projectId, versionId, downloadUrl, fileName }),
    removeResourcepack: (modpackId: string, resourcepackFileName: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.RemoveResourcepack, { modpackId, resourcepackFileName }),
    installShader: (modpackId: string, projectId: string, versionId: string, downloadUrl: string, fileName: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.InstallShader, { modpackId, projectId, versionId, downloadUrl, fileName }),
    removeShader: (modpackId: string, shaderFileName: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.RemoveShader, { modpackId, shaderFileName }),
    extractIcon: (jarPath: string, outputPath: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.ExtractIcon, { jarPath, outputPath }),
    extractAllIcons: (modpackId: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.ExtractAllIcons, { modpackId }),
    importExternalFiles: (modpackId: string, filePaths: string[]) =>
      ipcRenderer.invoke(IpcChannel.Mod.ImportExternalFiles, { modpackId, filePaths }),
    downloadCurseforgeModpack: (projectId: string, fileId: string, name: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.DownloadCurseforgeModpack, { projectId, fileId, name }),
    downloadModrinthModpack: (projectId: string, minecraftVersion: string, loader: string, name: string) =>
      ipcRenderer.invoke(IpcChannel.Mod.DownloadModrinthModpack, { projectId, minecraftVersion, loader, name }),
  },

  crash: {
    analyze: (crashLog: string) =>
      ipcRenderer.invoke(IpcChannel.Crash.Analyze, { crashLog }),
    autoInstallDependencies: (missingMods: string[]) =>
      ipcRenderer.invoke(IpcChannel.Crash.AutoInstallDependencies, { missingMods }),
  },

  achievements: {
    scanProfile: (modpackId: string) =>
      ipcRenderer.invoke(IpcChannel.Achievements.ScanProfile, { modpackId }),
    scanAll: () => ipcRenderer.invoke(IpcChannel.Achievements.ScanAll),
  },

  overlay: {
    getOverlayData: () => ipcRenderer.invoke(IpcChannel.Overlay.GetOverlayData),
    setIdkConnectData: (data: Record<string, unknown>) =>
      ipcRenderer.invoke(IpcChannel.Overlay.SetIdkConnectData, data),
    init: () => ipcRenderer.invoke(IpcChannel.Overlay.Init),
    toggleUi: () => ipcRenderer.invoke(IpcChannel.Overlay.ToggleUi),
    toggle: () => ipcRenderer.invoke(IpcChannel.Overlay.Toggle),
    syncConnect: (data?: Record<string, unknown>) =>
      ipcRenderer.invoke(IpcChannel.Overlay.SyncConnect, data),
    resumeGame: () => ipcRenderer.send(IpcChannel.Overlay.ResumeGame),
    close: () => ipcRenderer.send(IpcChannel.Overlay.Close),
    hideWindow: () => ipcRenderer.send(IpcChannel.Overlay.HideWindow),
  },

  idkConnect: {
    // Auth
    requestOtp: (email: string, username: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.RequestOtp, { email, username }),
    register: (username: string, email: string, password: string, otp: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.Register, { username, email, password, otp }) as Promise<{ success: boolean; user: IdkUser }>,
    login: (username: string, password: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.Login, { username, password }) as Promise<{ success?: boolean; user?: IdkUser; requires2fa?: boolean }>,
    verify2fa: (username: string, password: string, otp: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.Verify2fa, { username, password, otp }) as Promise<{ success: boolean; user: IdkUser }>,
    getMe: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetMe) as Promise<IdkUser | null>,
    loginWithMinecraft: (minecraftUsername: string, authMode: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.LoginWithMinecraft, { minecraftUsername, authMode }) as Promise<{ success: boolean; user: IdkUser }>,
    // OAuth
    getDiscordOAuthUrl: (linkToken?: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetDiscordOAuthUrl, { linkToken }) as Promise<{ url: string }>,
    getGoogleOAuthUrl: (linkToken?: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetGoogleOAuthUrl, { linkToken }) as Promise<{ url: string }>,
    completeOAuth: (session: string, username: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.CompleteOAuth, { session, username }) as Promise<{ success: boolean; user: IdkUser }>,
    // Settings
    updateProfile: (bio: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.UpdateProfile, { bio }),
    changeUsername: (newUsername: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.ChangeUsername, { newUsername }) as Promise<{ success: boolean; user: IdkUser }>,
    changePassword: (oldPassword: string, newPassword: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.ChangePassword, { oldPassword, newPassword }),
    deleteAccount: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.DeleteAccount),
    requestSecurityOtp: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.RequestSecurityOtp),
    updateSecurity: (newPassword: string, twoFactorEnabled: boolean, otp: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.UpdateSecurity, { newPassword, twoFactorEnabled, otp }),
    linkMinecraft: (minecraftUsername: string, authMode: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.LinkMinecraft, { minecraftUsername, authMode }),
    // Users
    searchUsers: (query: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.SearchUsers, { query }) as Promise<IdkUser[]>,
    getUserProfile: (username: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetUserProfile, { username }) as Promise<{ profile: IdkUserProfile }>,
    // Friends
    getFriends: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetFriends) as Promise<{ friends: Friend[] }>,
    getFriendRequests: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetFriendRequests) as Promise<{ requests: FriendRequest[] }>,
    sendFriendRequest: (username: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.SendFriendRequest, { username }),
    handleFriendRequest: (requestId: string, accept: boolean) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.HandleFriendRequest, { requestId, accept }),
    removeFriend: (friendId: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.RemoveFriend, { friendId }),
    // Messages
    getMessages: (friendId: string, limit?: number) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetMessages, { friendId, limit }) as Promise<{ messages: IdkMessage[] }>,
    sendMessage: (friendId: string, text: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.SendMessage, { friendId, text }) as Promise<{ message: IdkMessage }>,
    // Presence
    sendPresence: (status: string, playingVersion?: string, cloudflaredUrl?: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.SendPresence, { status, playingVersion, cloudflaredUrl }),
    // Token management
    getStoredSession: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.GetStoredSession) as Promise<{ username: string } | null>,
    storeToken: (token: string, username: string) =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.StoreToken, { token, username }),
    clearToken: () =>
      ipcRenderer.invoke(IpcChannel.IdkConnect.ClearToken),
  },
} as const;

export type PreloadApi = typeof preloadApi;

// Expose the namespaced API to the renderer via contextBridge.
contextBridge.exposeInMainWorld('idk', preloadApi);
