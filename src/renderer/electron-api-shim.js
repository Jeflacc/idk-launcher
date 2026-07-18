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
    exportSettings: () => idk?.settings.export() ?? Promise.resolve({ success: false }),
    importSettings: (data) => idk?.settings.import(data) ?? Promise.resolve({ success: false, settings: {} }),

    // ── Auth ──
    microsoftAuthenticate: (interactive = true) => idk?.auth.microsoftAuthenticate(interactive) ?? Promise.resolve(null),
    getMicrosoftAuthData: () => idk?.auth.getMicrosoftAuthData() ?? Promise.resolve(null),
    fetchMicrosoftProfile: () => idk?.auth.fetchMicrosoftProfile() ?? Promise.resolve(null),
    elybyAuthenticate: (username, password) => idk?.auth.elybyAuthenticate(username, password) ?? Promise.resolve(null),
    elybyOAuthAuthenticate: () => idk?.auth.elybyOAuthAuthenticate() ?? Promise.resolve(null),
    fetchElybyProfile: (username) => idk?.auth.fetchElybyProfile(username) ?? Promise.resolve(null),
    getElybyAuthData: () => idk?.auth.getElybyAuthData() ?? Promise.resolve(null),

    // ── Launch ──
    // v1 calls launchMinecraft with 12 positional args. v2 expects a single options object.
    launchMinecraft: (...args) => {
      const [username, versionId, javaPath, loader, autoOpt, perfRenderer, maxMemory, authData, quickConnect, windowSize, javaArgs, forceUpdate] = args;
      let authProvider = 'microsoft';
      if (authData?.elyby || authData?.provider === 'elyby') authProvider = 'elyby';
      else if (!authData) authProvider = 'offline';
      let memMb = 4096;
      if (maxMemory && typeof maxMemory === 'string') {
        const parsed = parseInt(maxMemory.replace(/[Gg]$/, ''), 10);
        if (!isNaN(parsed)) memMb = parsed * 1024;
      }
      const opts = {
        versionId: versionId || '',
        loader: (loader || 'vanilla').toLowerCase(),
        javaPath: javaPath || undefined,
        maxMemoryMb: memMb,
        javaArgs: Array.isArray(javaArgs) ? javaArgs : [],
        windowSize: windowSize ? { width: windowSize.width || 854, height: windowSize.height || 480 } : undefined,
        autoOptimization: autoOpt !== false,
        performanceRenderer: perfRenderer === true || perfRenderer === 'true',
        quickConnect: quickConnect || undefined,
        forceUpdate: forceUpdate === true,
        authProvider,
      };
      return idk?.launch.minecraft(opts) ?? Promise.resolve({ success: false });
    },
    cancelLaunch: () => idk?.launch.cancel() ?? noop(),
    resumeGame: () => idk?.overlay.resumeGame() ?? noop(),
    onLaunchProgress: (cb) => idk?.launch.onProgress(cb) ?? noop(),
    onGameLaunched: (cb) => idk?.launch.onGameLaunched(cb) ?? noop(),
    onLaunchClosed: (cb) => idk?.launch.onClosed(cb) ?? noop(),
    onLaunchError: (cb) => idk?.launch.onError(cb) ?? noop(),
    onLaunchWarning: (cb) => idk?.launch.onWarning(cb) ?? noop(),
    onClearJavaPath: (cb) => idk?.launch.onClearJavaPath(cb) ?? noop(),
    onMissingDependencies: listenerStub('onMissingDependencies'),
    autoInstallDependencies: (missingMods) => idk?.crash.autoInstallDependencies(missingMods) ?? Promise.resolve({ success: false }),

    // ── Modpacks ──
    scanProfiles: () => idk?.modpack.scanProfiles() ?? Promise.resolve([]),
    deleteModpackFolder: (modpackId) => idk?.modpack.deleteFolder(modpackId) ?? Promise.resolve({ success: false }),
    updateModpackProfile: (modpackId, changes) => idk?.modpack.updateProfile(modpackId, changes) ?? Promise.resolve({ success: false }),
    launchModpack: (modpackId) => {
      const id = typeof modpackId === 'string' ? modpackId : (modpackId?.modpackId || '');
      idk?.modpack.launch(id, typeof modpackId === 'object' ? modpackId?.quickConnect : undefined);
      return Promise.resolve({ success: true });
    },
    downloadModrinthModpack: (projectId, minecraftVersion, loader, name) =>
      idk?.mod.downloadModrinthModpack(projectId, minecraftVersion, loader, name) ?? Promise.resolve({ success: false }),
    downloadCurseforgeModpack: (projectId, fileId, name) => idk?.mod.downloadCurseforgeModpack(projectId, fileId, name) ?? Promise.resolve({ success: false }),
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
    equipMicrosoftCape: (capeId) => idk?.skin.equipMicrosoftCape(capeId) ?? Promise.resolve({ success: false }),
    fetchElybySkinBase64: (username) => idk?.skin.fetchElybySkinBase64(username) ?? Promise.resolve(''),
    fetchMinotarSkinBase64: (username) => idk?.skin.fetchMinotarSkinBase64(username) ?? Promise.resolve(''),
    resolveSkinTextureBase64: (username, authMode) => idk?.skin.resolveSkinTextureBase64(username, authMode) ?? Promise.resolve({ base64: '', source: 'steve' }),

    // ── Mods / resources ──
    installMod: (modpackId, projectId, versionId, downloadUrl, fileName, type = 'mod') =>
      idk?.mod.installFromBrowser(modpackId, projectId, versionId, downloadUrl, fileName, type) ??
      Promise.resolve({ success: false }),
    installModToVersion: (versionId, projectId, versionIdTarget, downloadUrl, fileName) =>
      idk?.mod.installToVersion(versionId, projectId, versionIdTarget, downloadUrl, fileName) ??
      Promise.resolve({ success: false }),
    installResourcepack: (modpackId, projectId, versionId, downloadUrl, fileName) =>
      idk?.mod.installResourcepack(modpackId, projectId, versionId, downloadUrl, fileName) ??
      Promise.resolve({ success: false }),
    installShader: (modpackId, projectId, versionId, downloadUrl, fileName) =>
      idk?.mod.installShader(modpackId, projectId, versionId, downloadUrl, fileName) ??
      Promise.resolve({ success: false }),
    importExternalFiles: (modpackId, filePaths) =>
      idk?.mod.importExternalFiles(modpackId, filePaths) ??
      Promise.resolve({ success: false }),
    searchMods: (query, loader, projectType, limit) => idk?.mod.search(query, loader, projectType, limit) ?? Promise.resolve({ hits: [], total_hits: 0 }),
    getModProject: (projectId) => idk?.mod.getProject(projectId) ?? Promise.resolve(null),
    getModVersions: (projectId, gameVersion, loader) => idk?.mod.getVersions(projectId, gameVersion, loader) ?? Promise.resolve([]),
    getModDependencies: (projectId) => idk?.mod.getDependencies(projectId) ?? Promise.resolve([]),
    checkModUpdates: (mods) => idk?.mod.checkUpdates(mods) ?? Promise.resolve([]),
    getModChangelog: (projectId, versionId) => idk?.mod.getChangelog(projectId, versionId) ?? Promise.resolve(null),
    scanMissingDependencies: (mods) => idk?.mod.scanMissingDependencies(mods) ?? Promise.resolve([]),
    checkIncompatibilities: (modIds) => idk?.mod.checkIncompatibilities(modIds) ?? Promise.resolve([]),

    // ── Content ──
    getMojangNews: () => idk?.content.getMojangNews() ?? Promise.resolve([]),
    getTrendingModpacks: () => idk?.content.getTrendingModpacks() ?? Promise.resolve([]),

    // ── Crash analysis ──
    analyzeCrash: (crashLog) => idk?.crash.analyze(crashLog) ?? Promise.resolve(null),

    // ── Version manifest ──
    getVersionManifest: () => idk?.version.getManifest() ?? Promise.resolve(null),
    getSodiumVersions: () => idk?.version.getSodiumVersions() ?? Promise.resolve([]),

    // ── IDK Connect (social backend) ──
    idkRequestOtp: (email, username) => idk?.idkConnect.requestOtp(email, username) ?? Promise.resolve({ success: false }),
    idkRegister: (username, email, password, otp) => idk?.idkConnect.register(username, email, password, otp) ?? Promise.resolve({ success: false }),
    idkLogin: (username, password) => idk?.idkConnect.login(username, password) ?? Promise.resolve({ requires2fa: false }),
    idkVerify2fa: (username, password, otp) => idk?.idkConnect.verify2fa(username, password, otp) ?? Promise.resolve({ success: false }),
    idkGetMe: () => idk?.idkConnect.getMe() ?? Promise.resolve(null),
    idkLoginWithMinecraft: (mcUsername, authMode) => idk?.idkConnect.loginWithMinecraft(mcUsername, authMode) ?? Promise.resolve({ success: false }),
    idkGetDiscordOAuthUrl: (linkToken) => idk?.idkConnect.getDiscordOAuthUrl(linkToken) ?? Promise.resolve({ url: '' }),
    idkGetGoogleOAuthUrl: (linkToken) => idk?.idkConnect.getGoogleOAuthUrl(linkToken) ?? Promise.resolve({ url: '' }),
    idkCompleteOAuth: (session, username) => idk?.idkConnect.completeOAuth(session, username) ?? Promise.resolve({ success: false }),
    idkUpdateProfile: (bio) => idk?.idkConnect.updateProfile(bio) ?? Promise.resolve({ success: false }),
    idkChangeUsername: (newUsername) => idk?.idkConnect.changeUsername(newUsername) ?? Promise.resolve({ success: false }),
    idkChangePassword: (oldPassword, newPassword) => idk?.idkConnect.changePassword(oldPassword, newPassword) ?? Promise.resolve({ success: false }),
    idkDeleteAccount: () => idk?.idkConnect.deleteAccount() ?? Promise.resolve({ success: false }),
    idkRequestSecurityOtp: () => idk?.idkConnect.requestSecurityOtp() ?? Promise.resolve({ success: false }),
    idkUpdateSecurity: (newPassword, twoFactorEnabled, otp) => idk?.idkConnect.updateSecurity(newPassword, twoFactorEnabled, otp) ?? Promise.resolve({ success: false }),
    idkLinkMinecraft: (mcUsername, authMode) => idk?.idkConnect.linkMinecraft(mcUsername, authMode) ?? Promise.resolve({ success: false }),
    idkSearchUsers: (query) => idk?.idkConnect.searchUsers(query) ?? Promise.resolve([]),
    idkGetUserProfile: (username) => idk?.idkConnect.getUserProfile(username) ?? Promise.resolve({ profile: null }),
    idkGetFriends: () => idk?.idkConnect.getFriends() ?? Promise.resolve({ friends: [] }),
    idkGetFriendRequests: () => idk?.idkConnect.getFriendRequests() ?? Promise.resolve({ requests: [] }),
    idkSendFriendRequest: (username) => idk?.idkConnect.sendFriendRequest(username) ?? Promise.resolve({ success: false }),
    idkHandleFriendRequest: (requestId, accept) => idk?.idkConnect.handleFriendRequest(requestId, accept) ?? Promise.resolve({ success: false }),
    idkRemoveFriend: (friendId) => idk?.idkConnect.removeFriend(friendId) ?? Promise.resolve({ success: false }),
    idkGetMessages: (friendId, limit) => idk?.idkConnect.getMessages(friendId, limit) ?? Promise.resolve({ messages: [] }),
    idkSendMessage: (friendId, text) => idk?.idkConnect.sendMessage(friendId, text) ?? Promise.resolve({ message: null }),
    idkSendPresence: (status, playingVersion, cloudflaredUrl) => idk?.idkConnect.sendPresence(status, playingVersion, cloudflaredUrl) ?? Promise.resolve({ success: false }),
    idkGetStoredSession: () => idk?.idkConnect.getStoredSession() ?? Promise.resolve(null),
    idkStoreToken: (token, username) => idk?.idkConnect.storeToken(token, username) ?? Promise.resolve({ success: false }),
    idkClearToken: () => idk?.idkConnect.clearToken() ?? Promise.resolve({ success: false }),

    // ── Tunnel (IDK Connect) ──
    ensureFrpc: () => idk?.tunnel.ensureFrpc() ?? Promise.resolve({ success: false }),
    startFrpcTunnel: (port, token) => idk?.tunnel.start(port, token) ?? Promise.resolve({ success: false }),
    stopFrpcTunnel: () => idk?.tunnel.stop() ?? Promise.resolve({ success: false }),
    stopCloudflaredAccess: stub('stopCloudflaredAccess', { success: false }),
    onFrpcTunnelClosed: (cb) => idk?.tunnel.onClosed(cb) ?? noop(),
    onFrpcInstallProgress: listenerStub('onFrpcInstallProgress'),

    // ── Achievements ──
    scanAllAchievements: () => idk?.achievements.scanAll() ?? Promise.resolve([]),
    scanProfileAchievements: (modpackId) => idk?.achievements.scanProfile(modpackId) ?? Promise.resolve([]),

    // ── Overlay ──
    getOverlayData: () => idk?.overlay.getOverlayData() ?? Promise.resolve(null),
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
