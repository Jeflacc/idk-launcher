/**
 * v1 electronAPI compatibility shim.
 *
 * v1 (idk-main) renderer expects `window.electronAPI` — a flat object with ~75
 * methods. v2's preload exposes `window.idk` — a namespaced, typed API. This
 * shim bridges them so v1's vanilla renderer can drive v2's backend without
 * any changes to either side.
 *
 * Strategy:
 *   - Where v1 method has a direct v2 equivalent, delegate.
 *   - Where v1 expects a wrapped return shape (e.g. `loadSettings` returns
 *     `{success, settings}`), wrap the v2 call.
 *   - Where no v2 equivalent exists, provide a safe no-op stub that returns
 *     a default value so the v1 UI doesn't crash. These are tagged with
 *     `TODO(v2-backend)` for later wiring.
 */
(function installElectronApiShim() {
  if (typeof window === 'undefined') return;
  // Wait for v2's preload to expose `window.idk`. The preload runs before the
  // renderer's module graph, so it should already be available.
  const idk = window.idk;
  if (!idk) {
    console.warn('[electronAPI shim] window.idk not found — preload may have failed. Falling back to no-op stubs.');
  }

  const noop = () => {};
  const noopAsync = async () => null;
  const noopAsyncTrue = async () => ({ success: true });
  const noopAsyncArr = async () => [];

  // Helper: log once per unmapped method so we can see what's still missing.
  // Listener-style methods (onXxx) are silent — they're often registered defensively.
  // Data-returning stubs always return Promises (v1 callers expect .then()).
  const warned = new Set();
  const stub = (name, defaultReturn = null, silent = false) => {
    return (...args) => {
      if (!silent && !warned.has(name)) {
        console.warn(`[electronAPI shim] "${name}" has no v2 backend mapping — using stub. args:`, args);
        warned.add(name);
      }
      const val = typeof defaultReturn === 'function' ? defaultReturn() : defaultReturn;
      // Always return a Promise for non-listener stubs so callers can .then() safely.
      return Promise.resolve(val);
    };
  };
  // Listener stubs return undefined (callers ignore the return value).
  const listenerStub = (name, silent = true) => {
    return (...args) => {
      if (!silent && !warned.has(name)) {
        console.warn(`[electronAPI shim] "${name}" (listener) has no v2 backend mapping — using no-op stub.`);
        warned.add(name);
      }
    };
  };

  const api = {
    // ── Window controls ──
    minimize: () => idk?.window.minimize() ?? noop(),
    maximize: () => idk?.window.maximize() ?? noop(),
    close: () => idk?.window.close() ?? noop(),
    toggleDevTools: () => idk?.window.toggleDevTools() ?? noop(),
    onWindowStateChanged: (cb) => idk?.window.onStateChanged(cb) ?? noop(),

    // ── System / file pickers ──
    openExternal: (url) => idk?.system.openExternal(url) ?? noop(),
    openMinecraftFolder: () => idk?.system.openMinecraftFolder() ?? noop(),
    selectMinecraftFolder: () => idk?.system.selectMinecraftFolder() ?? noopAsync(),
    selectImage: () => idk?.system.selectImageFile() ?? noopAsync(),
    selectImageFile: () => idk?.system.selectImageFile() ?? noopAsync(),
    selectModpackZip: () => idk?.system.selectModpackZip() ?? noopAsync(),
    selectExportZip: (defaultName) => idk?.system.selectExportZip(defaultName) ?? noopAsync(),
    rendererLog: (msg) => idk?.system.log(msg) ?? noop(),
    getPathForFile: stub('getPathForFile', ''),

    // ── Settings (v1 wraps in {success, settings}) ──
    loadSettings: async () => {
      if (idk) {
        try {
          const settings = await idk.settings.load();
          return { success: true, settings: settings ?? {} };
        } catch (e) {
          console.error('[electronAPI shim] loadSettings failed:', e);
          return { success: false, settings: {} };
        }
      }
      return { success: false, settings: {} };
    },
    saveSettings: async (s) => {
      if (idk) {
        try { await idk.settings.save(s); return { success: true }; }
        catch (e) { console.error('[electronAPI shim] saveSettings failed:', e); return { success: false }; }
      }
      return { success: false };
    },
    resetSettings: async () => {
      if (idk) { try { await idk.settings.reset(); return { success: true }; } catch { return { success: false }; } }
      return { success: false };
    },
    exportSettings: stub('exportSettings', { success: false }),
    importSettings: stub('importSettings', { success: false, settings: {} }),

    // ── Auth ──
    microsoftAuthenticate: (interactive = true) => idk?.auth.microsoftAuthenticate(interactive) ?? Promise.resolve(null),
    getMicrosoftAuthData: () => idk?.auth.getMicrosoftAuthData() ?? Promise.resolve(null),
    fetchMicrosoftProfile: stub('fetchMicrosoftProfile', null),
    elybyAuthenticate: (username, password) => idk?.auth.elybyAuthenticate(username, password) ?? Promise.resolve(null),
    fetchElybyProfile: (username) => idk?.auth.fetchElybyProfile(username) ?? Promise.resolve(null),
    getElybyAuthData: () => idk?.auth.getElybyAuthData() ?? Promise.resolve(null),

    // ── Launch ──
    launchMinecraft: (options) => idk?.launch.minecraft(options) ?? noop(),
    cancelLaunch: () => idk?.launch.cancel() ?? noop(),
    resumeGame: stub('resumeGame'),
    onLaunchProgress: (cb) => idk?.launch.onProgress(cb) ?? noop(),
    onGameLaunched: (cb) => idk?.launch.onGameLaunched(cb) ?? noop(),
    onLaunchClosed: (cb) => idk?.launch.onClosed(cb) ?? noop(),
    onLaunchError: (cb) => idk?.launch.onError(cb) ?? noop(),
    onLaunchWarning: (cb) => idk?.launch.onWarning(cb) ?? noop(),
    onMissingDependencies: listenerStub('onMissingDependencies'),
    autoInstallDependencies: stub('autoInstallDependencies', { success: false }),

    // ── Modpacks ──
    scanProfiles: () => idk?.modpack.scanProfiles() ?? Promise.resolve([]),
    deleteModpackFolder: (modpackId) => idk?.modpack.deleteFolder(modpackId) ?? Promise.resolve({ success: false }),
    updateModpackProfile: (modpackId, changes) => idk?.modpack.updateProfile(modpackId, changes) ?? Promise.resolve({ success: false }),
    launchModpack: (modpackId, quickConnect) => idk?.modpack.launch(modpackId, quickConnect) ?? Promise.resolve({ success: false }),
    downloadModrinthModpack: (projectId, minecraftVersion, loader, name) =>
      idk?.modpack.install(projectId, minecraftVersion, loader, name) ?? Promise.resolve({ success: false }),
    downloadCurseforgeModpack: stub('downloadCurseforgeModpack', { success: false }),
    exportModpack: (modpackId, targetPath) => idk?.modpack.export(modpackId, targetPath) ?? Promise.resolve({ success: false }),
    unzipCurseforge: (zipPath, name) => idk?.modpack.importZip(zipPath, name) ?? Promise.resolve({ success: false }),

    // ── Versions ──
    scanDownloadedVersions: () => idk?.version.scanDownloaded() ?? Promise.resolve([]),
    downloadVersion: (versionId, loader, loaderVersion) =>
      idk?.version.download(versionId, loader, loaderVersion) ?? Promise.resolve({ success: false }),
    cancelDownload: (versionId) => idk?.version.cancelDownload(versionId) ?? Promise.resolve({ success: false }),
    pauseDownload: (downloadId) => idk?.download.pause(downloadId) ?? Promise.resolve({ success: false }),
    resumeDownload: (downloadId) => idk?.download.resume(downloadId) ?? Promise.resolve({ success: false }),
    onDownloadProgress: (cb) => idk?.download.onProgress(cb) ?? noop(),
    onDownloadComplete: (cb) => idk?.download.onComplete(cb) ?? noop(),
    onDownloadError: (cb) => idk?.download.onError(cb) ?? noop(),
    onDownloadCancelled: listenerStub('onDownloadCancelled'),
    onDownloadPaused: listenerStub('onDownloadPaused'),
    onDownloadResumed: listenerStub('onDownloadResumed'),

    // ── Skins ──
    fetchImageBase: (url) => idk?.skin.fetchImageBase64(url) ?? Promise.resolve(''),
    uploadMicrosoftSkin: (filePath, variant) => idk?.skin.uploadMicrosoftSkin(filePath, variant) ?? Promise.resolve({ success: false }),
    equipMicrosoftCape: stub('equipMicrosoftCape', { success: false }),

    // ── Mods / resources ──
    installMod: stub('installMod', { success: false }),
    installModToVersion: stub('installModToVersion', { success: false }),
    installResourcepack: stub('installResourcepack', { success: false }),
    installShader: stub('installShader', { success: false }),
    importExternalFiles: stub('importExternalFiles', { success: false }),

    // ── Tunnel (IDK Connect) ──
    ensureFrpc: () => idk?.tunnel.ensureFrpc() ?? Promise.resolve({ success: false }),
    startFrpcTunnel: (port, token) => idk?.tunnel.start(port, token) ?? Promise.resolve({ success: false }),
    stopFrpcTunnel: () => idk?.tunnel.stop() ?? Promise.resolve({ success: false }),
    stopCloudflaredAccess: stub('stopCloudflaredAccess', { success: false }),
    onFrpcTunnelClosed: (cb) => idk?.tunnel.onClosed(cb) ?? noop(),
    onFrpcInstallProgress: listenerStub('onFrpcInstallProgress'),

    // ── Achievements ──
    scanAllAchievements: stub('scanAllAchievements', []),
    scanProfileAchievements: stub('scanProfileAchievements', []),

    // ── Overlay ──
    getOverlayData: stub('getOverlayData', null),
    onOverlayInit: listenerStub('onOverlayInit'),
    onToggleOverlay: listenerStub('onToggleOverlay'),

    // ── Updates ──
    checkForUpdates: () => idk?.update.check() ?? Promise.resolve(null),

    // ── Java path (v1 had a dedicated channel) ──
    onClearJavaPath: listenerStub('onClearJavaPath'),
  };

  window.electronAPI = api;
  console.info('[electronAPI shim] installed —', Object.keys(api).length, 'methods bridged to window.idk');
})();
