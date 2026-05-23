const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  launchMinecraft: (username, version, javaPath, loader, autoOptimization, maxMemory, authData, quickConnect, windowSize, globalJavaArgs) =>
    ipcRenderer.send('launch-minecraft', { username, version, javaPath, loader, autoOptimization, maxMemory, authData, quickConnect, windowSize, globalJavaArgs }),

  // All IPC listeners — registered once at startup
  onLaunchProgress:  (cb) => ipcRenderer.on('launch-progress',  (_e, data)  => cb(data)),
  onGameLaunched:    (cb) => ipcRenderer.on('game-launched',    ()          => cb()),
  onLaunchClosed:    (cb) => ipcRenderer.on('launch-closed',    ()          => cb()),
  onLaunchError:     (cb) => ipcRenderer.on('launch-error',     (_e, error) => cb(error)),
  onLaunchWarning:   (cb) => ipcRenderer.on('launch-warning',   (_e, msg)   => cb(msg)),
  onClearJavaPath:   (cb) => ipcRenderer.on('clear-java-path',  ()          => cb()),

  // Overlay IPC
  onOverlayInit:     (cb) => ipcRenderer.on('overlay-init',     (_e, data)  => cb(data)),
  onToggleOverlay:   (cb) => ipcRenderer.on('toggle-overlay-ui',(_e, state) => cb(state)),
  resumeGame:        ()   => ipcRenderer.send('resume-game'),
  getOverlayData:    ()   => ipcRenderer.invoke('get-overlay-data'),

  openMinecraftFolder: () => ipcRenderer.send('open-minecraft-folder'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getVersionsPath: () => ipcRenderer.invoke('get-versions-path'),
  scanDownloadedVersions: () => ipcRenderer.invoke('scan-downloaded-versions'),
  scanVersionMods: (version) => ipcRenderer.invoke('scan-version-mods', version),
  scanProfileAchievements: (data) => ipcRenderer.invoke('scan-profile-achievements', data),
  elybyAuthenticate: (data) => ipcRenderer.invoke('elyby-authenticate', data),
  fetchElybyProfile: (username) => ipcRenderer.invoke('fetch-elyby-profile', username),
  fetchImageBase64: (url) => ipcRenderer.invoke('fetch-image-base64', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Mod / resourcepack / shader management
  installMod:          (data) => ipcRenderer.invoke('install-mod',         data),
  installModToVersion: (data) => ipcRenderer.invoke('install-mod-to-version', data),
  unzipCurseforge:     (data) => ipcRenderer.invoke('unzip-curseforge',    data),
  selectModpackZip:    () => ipcRenderer.invoke('select-modpack-zip'),
  selectExportZip:     (data) => ipcRenderer.invoke('select-export-zip',   data),
  exportModpack:       (data) => ipcRenderer.invoke('export-modpack',      data),
  downloadCurseforgeModpack: (data) => ipcRenderer.invoke('download-curseforge-modpack', data),
  removeMod:           (data) => ipcRenderer.invoke('remove-mod',          data),
  installResourcepack: (data) => ipcRenderer.invoke('install-resourcepack', data),
  removeResourcepack:  (data) => ipcRenderer.invoke('remove-resourcepack',  data),
  installShader:       (data) => ipcRenderer.invoke('install-shader',       data),
  removeShader:        (data) => ipcRenderer.invoke('remove-shader',        data),

  launchModpack: (args) => ipcRenderer.send('launch-modpack', args),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  scanProfiles: () => ipcRenderer.invoke('scan-profiles'),

  // Cloudflared Multiplayer Tunneling
  ensureCloudflared: () => ipcRenderer.invoke('ensure-cloudflared'),
  startCloudflaredTunnel: (port) => ipcRenderer.invoke('start-cloudflared-tunnel', { port }),
  stopCloudflaredTunnel: () => ipcRenderer.invoke('stop-cloudflared-tunnel'),
  onCloudflaredInstallProgress: (cb) => ipcRenderer.on('cloudflared-install-progress', (_e, data) => cb(data)),
  onCloudflaredTunnelClosed: (cb) => ipcRenderer.on('cloudflared-tunnel-closed', () => cb()),
  
  // Cloudflared Multiplayer Client-side Access Bridge
  startCloudflaredAccess: (url, localPort) => ipcRenderer.invoke('start-cloudflared-access', { url, localPort }),
  stopCloudflaredAccess: () => ipcRenderer.invoke('stop-cloudflared-access'),
  onCloudflaredAccessClosed: (cb) => ipcRenderer.on('cloudflared-access-closed', () => cb()),

  // Missing mod dependencies (crash report auto-detection)
  onMissingDependencies: (cb) => ipcRenderer.on('missing-dependencies', (_e, data) => cb(data)),
  autoInstallDependencies: (data) => ipcRenderer.invoke('auto-install-dependencies', data),

  // Extract icon from mod/RP/shader JAR file
  extractModIcon: (data) => ipcRenderer.invoke('extract-mod-icon', data),
  
  // Batch extract all icons for a modpack (for legacy profiles)
  extractAllIcons: (data) => ipcRenderer.invoke('extract-all-icons', data),

  // Delete modpack folder from disk
  deleteModpackFolder: (modpackId) => ipcRenderer.invoke('delete-modpack-folder', { modpackId }),

  // Debug: forward renderer logs to terminal
  rendererLog: (msg) => ipcRenderer.send('renderer-log', msg),

  // Download progress tracking
  startDownload: (downloadId, items, downloadPath) => 
    ipcRenderer.invoke('start-download', { downloadId, items, downloadPath }),
  pauseDownload: (downloadId) => 
    ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId) => 
    ipcRenderer.invoke('resume-download', downloadId),
  cancelDownload: (downloadId) => 
    ipcRenderer.invoke('cancel-download', downloadId),
  
  // Download progress event listeners
  onDownloadProgress: (cb) => 
    ipcRenderer.on('download-progress', (_e, downloadId, progress) => cb(downloadId, progress)),
  onDownloadComplete: (cb) => 
    ipcRenderer.on('download-complete', (_e, downloadId, result) => cb(downloadId, result)),
  onDownloadError: (cb) => 
    ipcRenderer.on('download-error', (_e, downloadId, error) => cb(downloadId, error)),
  onDownloadPaused: (cb) => 
    ipcRenderer.on('download-paused', (_e, downloadId) => cb(downloadId)),
  onDownloadResumed: (cb) => 
    ipcRenderer.on('download-resumed', (_e, downloadId) => cb(downloadId)),
  onDownloadCancelled: (cb) => 
    ipcRenderer.on('download-cancelled', (_e, downloadId) => cb(downloadId)),

  // Settings management
  loadSettings: () => 
    ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => 
    ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => 
    ipcRenderer.invoke('reset-settings'),
  exportSettings: () => 
    ipcRenderer.invoke('export-settings'),
  importSettings: () => 
    ipcRenderer.invoke('import-settings'),
  getSettingsByCategory: (category) => 
    ipcRenderer.invoke('get-settings-by-category', category),
  searchSettings: (query) => 
    ipcRenderer.invoke('search-settings', query),
  getSettingsCategories: () => 
    ipcRenderer.invoke('get-settings-categories'),
});

