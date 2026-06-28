/**
 * IPC channel registry — the single source of truth for every IPC channel name
 * used between the main process and the renderer (via preload).
 *
 * Channels are namespaced by domain. Every channel is typed in
 * `src/shared/types/*` and validated by a zod schema in `src/shared/schemas/*`.
 *
 * The v1 launcher exposed a flat, unvalidated 86-method preload surface. This
 * registry replaces that with a structured, typed, validated contract.
 */

export const IpcChannel = {
  // Window management
  Window: {
    Minimize: 'window:minimize',
    Maximize: 'window:maximize',
    Close: 'window:close',
    StateChanged: 'window:state-changed',
    ToggleDevTools: 'window:toggle-devtools',
  },
  // System / paths
  System: {
    GetUserDataPath: 'system:get-user-data-path',
    GetVersionsPath: 'system:get-versions-path',
    OpenExternal: 'system:open-external',
    OpenMinecraftFolder: 'system:open-minecraft-folder',
    SelectMinecraftFolder: 'system:select-minecraft-folder',
    SelectImageFile: 'system:select-image-file',
    SelectModpackZip: 'system:select-modpack-zip',
    SelectExportZip: 'system:select-export-zip',
    RendererLog: 'system:renderer-log',
  },
  // Authentication
  Auth: {
    MicrosoftAuthenticate: 'auth:microsoft-authenticate',
    GetMicrosoftAuthData: 'auth:get-microsoft-auth-data',
    FetchMicrosoftProfile: 'auth:fetch-microsoft-profile',
    ElybyAuthenticate: 'auth:elyby-authenticate',
    GetElybyAuthData: 'auth:get-elyby-auth-data',
    FetchElybyProfile: 'auth:fetch-elyby-profile',
    SignOut: 'auth:sign-out',
  },
  // Skins
  Skin: {
    UploadMicrosoftSkin: 'skin:upload-microsoft-skin',
    EquipMicrosoftCape: 'skin:equip-microsoft-cape',
    SelectMicrosoftCape: 'skin:select-microsoft-cape',
    FetchImageBase64: 'skin:fetch-image-base64',
  },
  // Versions
  Version: {
    ScanDownloaded: 'version:scan-downloaded',
    Download: 'version:download',
    CancelDownload: 'version:cancel-download',
    ScanVersionMods: 'version:scan-mods',
  },
  // Launch
  Launch: {
    Minecraft: 'launch:minecraft',
    Modpack: 'launch:modpack',
    Cancel: 'launch:cancel',
    Progress: 'launch:progress',
    GameLaunched: 'launch:game-launched',
    Closed: 'launch:closed',
    Error: 'launch:error',
    Warning: 'launch:warning',
    ClearJavaPath: 'launch:clear-java-path',
  },
  // Modpacks
  Modpack: {
    ScanProfiles: 'modpack:scan-profiles',
    DeleteFolder: 'modpack:delete-folder',
    UpdateProfile: 'modpack:update-profile',
    Launch: 'modpack:launch',
  },
  // Mods / resources
  Mod: {
    Install: 'mod:install',
    InstallToVersion: 'mod:install-to-version',
    ImportExternalFiles: 'mod:import-external',
    UnzipCurseforge: 'mod:unzip-curseforge',
    DownloadCurseforgeModpack: 'mod:download-curseforge-modpack',
    DownloadModrinthModpack: 'mod:download-modrinth-modpack',
    Remove: 'mod:remove',
    InstallResourcepack: 'mod:install-resourcepack',
    RemoveResourcepack: 'mod:remove-resourcepack',
    InstallShader: 'mod:install-shader',
    RemoveShader: 'mod:remove-shader',
    ExtractIcon: 'mod:extract-icon',
    ExtractAllIcons: 'mod:extract-all-icons',
    ExportModpack: 'mod:export',
  },
  // Downloads (the unified queue)
  Download: {
    Start: 'download:start',
    Pause: 'download:pause',
    Resume: 'download:resume',
    Cancel: 'download:cancel',
    CancelAll: 'download:cancel-all',
    Progress: 'download:progress',
    Complete: 'download:complete',
    Error: 'download:error',
    Paused: 'download:paused',
    Resumed: 'download:resumed',
    Cancelled: 'download:cancelled',
  },
  // Settings
  Settings: {
    Load: 'settings:load',
    Save: 'settings:save',
    Reset: 'settings:reset',
    Export: 'settings:export',
    Import: 'settings:import',
    GetByCategory: 'settings:get-by-category',
    Search: 'settings:search',
    GetCategories: 'settings:get-categories',
  },
  // Overlay
  Overlay: {
    Init: 'overlay:init',
    ToggleUi: 'overlay:toggle-ui',
    Toggle: 'overlay:toggle',
    SyncConnect: 'overlay:sync-connect',
    ResumeGame: 'overlay:resume-game',
    Close: 'overlay:close',
    HideWindow: 'overlay:hide-window',
    SetIdkConnectData: 'overlay:set-idk-connect-data',
    GetOverlayData: 'overlay:get-data',
  },
  // Achievements
  Achievements: {
    ScanProfile: 'achievements:scan-profile',
    ScanAll: 'achievements:scan-all',
  },
  // Crash analysis (missing deps)
  Crash: {
    MissingDependencies: 'crash:missing-dependencies',
    AutoInstallDependencies: 'crash:auto-install',
  },
  // Auto-updater
  Update: {
    Check: 'update:check',
    Download: 'update:download',
    Install: 'update:install',
    Available: 'update:available',
    Progress: 'update:progress',
    Downloaded: 'update:downloaded',
    Error: 'update:error',
  },
  // FRP tunneling (opt-in, user-provided token)
  Tunnel: {
    EnsureFrpc: 'tunnel:ensure-frpc',
    Start: 'tunnel:start',
    Stop: 'tunnel:stop',
    InstallProgress: 'tunnel:install-progress',
    Closed: 'tunnel:closed',
  },
  // Startup notifications
  Startup: {
    ShowNotification: 'startup:show-notification',
  },
} as const;

export type IpcChannelGroup = keyof typeof IpcChannel;
