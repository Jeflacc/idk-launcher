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
    OpenPath: 'system:open-path',
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
    ElybyOAuthAuthenticate: 'auth:elyby-oauth-authenticate',
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
    FetchElybySkinBase64: 'skin:fetch-elyby-skin-base64',
    FetchMinotarSkinBase64: 'skin:fetch-minotar-skin-base64',
    ResolveSkinTextureBase64: 'skin:resolve-skin-texture-base64',
  },
  // Versions
  Version: {
    ScanDownloaded: 'version:scan-downloaded',
    Download: 'version:download',
    CancelDownload: 'version:cancel-download',
    ScanVersionMods: 'version:scan-mods',
    GetManifest: 'version:get-manifest',
    GetSodiumVersions: 'version:get-sodium-versions',
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
    Search: 'mod:search',
    GetProject: 'mod:get-project',
    GetVersions: 'mod:get-versions',
    GetDependencies: 'mod:get-dependencies',
    InstallFromBrowser: 'mod:install-from-browser',
    CheckUpdates: 'mod:check-updates',
    InstallUpdate: 'mod:install-update',
    GetChangelog: 'mod:get-changelog',
    ScanMissingDependencies: 'mod:scan-missing-dependencies',
    ResolveDependencies: 'mod:resolve-dependencies',
    CheckIncompatibilities: 'mod:check-incompatibilities',
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
    Analyze: 'crash:analyze',
  },
  // Content (news, trending)
  Content: {
    GetMojangNews: 'content:get-mojang-news',
    GetTrendingModpacks: 'content:get-trending-modpacks',
  },
  // IDK Connect (social backend at api.somniac.me)
  IdkConnect: {
    // Auth
    RequestOtp: 'idk-connect:request-otp',
    Register: 'idk-connect:register',
    Login: 'idk-connect:login',
    Verify2fa: 'idk-connect:verify-2fa',
    GetMe: 'idk-connect:get-me',
    LoginWithMinecraft: 'idk-connect:login-with-minecraft',
    // OAuth
    GetDiscordOAuthUrl: 'idk-connect:get-discord-oauth-url',
    GetGoogleOAuthUrl: 'idk-connect:get-google-oauth-url',
    CompleteOAuth: 'idk-connect:complete-oauth',
    // Settings
    UpdateProfile: 'idk-connect:update-profile',
    ChangeUsername: 'idk-connect:change-username',
    ChangePassword: 'idk-connect:change-password',
    DeleteAccount: 'idk-connect:delete-account',
    RequestSecurityOtp: 'idk-connect:request-security-otp',
    UpdateSecurity: 'idk-connect:update-security',
    LinkMinecraft: 'idk-connect:link-minecraft',
    // Users
    SearchUsers: 'idk-connect:search-users',
    GetUserProfile: 'idk-connect:get-user-profile',
    // Friends
    GetFriends: 'idk-connect:get-friends',
    GetFriendRequests: 'idk-connect:get-friend-requests',
    SendFriendRequest: 'idk-connect:send-friend-request',
    HandleFriendRequest: 'idk-connect:handle-friend-request',
    RemoveFriend: 'idk-connect:remove-friend',
    // Messages
    GetMessages: 'idk-connect:get-messages',
    SendMessage: 'idk-connect:send-message',
    // Presence
    SendPresence: 'idk-connect:send-presence',
    // Token management (stored in SecretStore, not localStorage)
    GetStoredSession: 'idk-connect:get-stored-session',
    StoreToken: 'idk-connect:store-token',
    ClearToken: 'idk-connect:clear-token',
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
