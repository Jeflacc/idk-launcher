const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  launchMinecraft: (username, version, javaPath, loader, autoOptimization, maxMemory, authData) =>
    ipcRenderer.send('launch-minecraft', { username, version, javaPath, loader, autoOptimization, maxMemory, authData }),

  // All IPC listeners — registered once at startup
  onLaunchProgress:  (cb) => ipcRenderer.on('launch-progress',  (_e, data)  => cb(data)),
  onGameLaunched:    (cb) => ipcRenderer.on('game-launched',    ()          => cb()),
  onLaunchClosed:    (cb) => ipcRenderer.on('launch-closed',    ()          => cb()),
  onLaunchError:     (cb) => ipcRenderer.on('launch-error',     (_e, error) => cb(error)),
  onLaunchWarning:   (cb) => ipcRenderer.on('launch-warning',   (_e, msg)   => cb(msg)),
  onClearJavaPath:   (cb) => ipcRenderer.on('clear-java-path',  ()          => cb()),

  openMinecraftFolder: () => ipcRenderer.send('open-minecraft-folder'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  elybyAuthenticate: (data) => ipcRenderer.invoke('elyby-authenticate', data),

  // Mod / resourcepack / shader management
  installMod:          (data) => ipcRenderer.invoke('install-mod',         data),
  removeMod:           (data) => ipcRenderer.invoke('remove-mod',          data),
  installResourcepack: (data) => ipcRenderer.invoke('install-resourcepack', data),
  removeResourcepack:  (data) => ipcRenderer.invoke('remove-resourcepack',  data),
  installShader:       (data) => ipcRenderer.invoke('install-shader',       data),
  removeShader:        (data) => ipcRenderer.invoke('remove-shader',        data),

  launchModpack: (args) => ipcRenderer.send('launch-modpack', args),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
});
