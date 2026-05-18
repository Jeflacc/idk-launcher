const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  launchMinecraft: (username, version, javaPath, loader, autoOptimization, maxMemory, authData, quickConnect) =>
    ipcRenderer.send('launch-minecraft', { username, version, javaPath, loader, autoOptimization, maxMemory, authData, quickConnect }),

  // All IPC listeners — registered once at startup
  onLaunchProgress:  (cb) => ipcRenderer.on('launch-progress',  (_e, data)  => cb(data)),
  onGameLaunched:    (cb) => ipcRenderer.on('game-launched',    ()          => cb()),
  onLaunchClosed:    (cb) => ipcRenderer.on('launch-closed',    ()          => cb()),
  onLaunchError:     (cb) => ipcRenderer.on('launch-error',     (_e, error) => cb(error)),
  onLaunchWarning:   (cb) => ipcRenderer.on('launch-warning',   (_e, msg)   => cb(msg)),
  onClearJavaPath:   (cb) => ipcRenderer.on('clear-java-path',  ()          => cb()),

  openMinecraftFolder: () => ipcRenderer.send('open-minecraft-folder'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  elybyAuthenticate: (data) => ipcRenderer.invoke('elyby-authenticate', data),
  fetchElybyProfile: (username) => ipcRenderer.invoke('fetch-elyby-profile', username),
  fetchImageBase64: (url) => ipcRenderer.invoke('fetch-image-base64', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Mod / resourcepack / shader management
  installMod:          (data) => ipcRenderer.invoke('install-mod',         data),
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
});

