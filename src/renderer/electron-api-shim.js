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
    openPath: (folderPath) => idk?.system.openPath(folderPath) ?? noopAsync(),
    getUserDataPath: () => idk?.system.getUserDataPath() ?? Promise.resolve(''),
    getVersionsPath: () => idk?.system.getVersionsPath() ?? Promise.resolve(''),
    getProfilesPath: () => idk?.system.getProfilesPath() ?? Promise.resolve(''),
    getMinecraftRootPath: () => idk?.system.getMinecraftRootPath() ?? Promise.resolve(''),
    resolveInstancePath: (id, sub) => idk?.system.resolveInstancePath(id, sub) ?? Promise.resolve({ path: '', exists: false }),
    openInstanceFolder: (id, sub) => idk?.system.openInstanceFolder(id, sub) ?? noop(),
    ensureInstance: (id) => idk?.system.ensureInstance(id) ?? Promise.resolve({ directory: '', created: false }),
    selectMinecraftFolder: async () => {
      // v1 renderer expects { success, filePath }; the backend returns a raw path or null.
      const p = await (idk?.system.selectMinecraftFolder() ?? Promise.resolve(null));
      return { success: !!p, filePath: p };
    },
    selectImage: () => idk?.system.selectImageFile() ?? noopAsync(),
    selectImageFile: () => idk?.system.selectImageFile() ?? noopAsync(),
    selectModpackZip: () => idk?.system.selectModpackZip() ?? noopAsync(),
    selectExportZip: (defaultName) => idk?.system.selectExportZip(defaultName) ?? noopAsync(),
    rendererLog: (msg) => idk?.system.log(msg) ?? noop(),
    getPathForFile: stub('getPathForFile', ''),

    // ── Settings (v1 wraps in {success, settings}) ──
    // v1 stores FLAT keys (javaPath, customMinecraftPath, maxMemoryGB...);
    // v2 stores NESTED keys (java.customPath, general.minecraftRoot, memory.maxMb).
    // zod strips unknown keys, so flat saves would be silently dropped. This
    // map translates in both directions so v1 callers persist for real.
    FLAT_TO_NESTED: {
      javaPath: { key: 'java', prop: 'customPath' },
      globalJavaArgs: { key: 'java', prop: 'args', toNested: (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.trim().split(/\s+/) : []), toFlat: (v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')) },
      customMinecraftPath: { key: 'general', prop: 'minecraftRoot' },
      defaultWindowWidth: { key: 'launch', prop: 'windowWidth', toNested: (v) => parseInt(v) || 854, toFlat: (v) => v },
      defaultWindowHeight: { key: 'launch', prop: 'windowHeight', toNested: (v) => parseInt(v) || 480, toFlat: (v) => v },
      defaultFullscreen: { key: 'launch', prop: 'fullscreen', toNested: (v) => v === true || v === 'true', toFlat: (v) => !!v },
      enableOverlay: { key: 'launch', prop: 'showOverlay', toNested: (v) => v === true || v === 'true', toFlat: (v) => !!v },
      hideLauncher: { key: 'launch', prop: 'closeOnLaunch', toNested: (v) => v === true || v === 'true', toFlat: (v) => !!v },
      autoOptimization: { key: 'launch', prop: 'autoOptimize', toNested: (v) => v === true || v === 'true', toFlat: (v) => !!v },
      maxMemoryGB: { key: 'memory', prop: 'maxMb', toNested: (v) => (parseInt(v) || 4) * 1024, toFlat: (v) => Math.round((parseInt(v) || 4096) / 1024) },
      concurrentDownloads: { key: 'network', prop: 'concurrentDownloads', toNested: (v) => parseInt(v) || 4, toFlat: (v) => v },
      language: { key: 'general', prop: 'language' },
      backgroundEffect: { key: 'general', prop: 'backgroundEffect' },
      autoUpdates: { key: 'general', prop: 'autoUpdate', toNested: (v) => v === true || v === 'true', toFlat: (v) => !!v },
      discordPresence: { key: 'general', prop: 'discordRpc', toNested: (v) => v === true || v === 'true', toFlat: (v) => !!v },
    },
    loadSettings: async () => {
      if (idk) {
        try {
          const settings = await idk.settings.load();
          const flat = {};
          for (const [flatKey, def] of Object.entries(api.FLAT_TO_NESTED)) {
            const nestedVal = settings?.[def.key]?.[def.prop];
            if (nestedVal !== undefined && nestedVal !== null) {
              flat[flatKey] = def.toFlat ? def.toFlat(nestedVal) : nestedVal;
            }
          }
          return { success: true, settings: { ...(settings ?? {}), ...flat } };
        } catch (e) {
          console.error('[electronAPI shim] loadSettings failed:', e);
          return { success: false, settings: {} };
        }
      }
      return { success: false, settings: {} };
    },
    saveSettings: async (s) => {
      if (idk) {
        try {
          const nested = {};
          for (const [key, value] of Object.entries(s ?? {})) {
            const def = api.FLAT_TO_NESTED[key];
            if (def) {
              if (!nested[def.key]) nested[def.key] = {};
              nested[def.key][def.prop] = def.toNested ? def.toNested(value) : value;
            } else if (typeof key === 'string' && key.includes('.')) {
              // dot-path keys (e.g. session.currentUser)
              const [group, ...rest] = key.split('.');
              if (!nested[group]) nested[group] = {};
              let cur = nested[group];
              for (let i = 0; i < rest.length - 1; i++) {
                cur = cur[rest[i]] ??= {};
              }
              cur[rest[rest.length - 1]] = value;
            } else {
              // nested v2 keys (session, general, ...) pass through untouched
              nested[key] = value;
            }
          }
          await idk.settings.save(nested);
          return { success: true };
        } catch (e) {
          console.error('[electronAPI shim] saveSettings failed:', e);
          return { success: false };
        }
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
    // Multi-account management
    listAccounts: () => idk?.auth.listAccounts() ?? Promise.resolve({ accounts: [], activeAccountId: null }),
    getActiveAccount: () => idk?.auth.getActiveAccount() ?? Promise.resolve(null),
    addOfflineAccount: (username) => idk?.auth.addOfflineAccount(username) ?? Promise.resolve(null),
    removeAccount: (accountId) => idk?.auth.removeAccount(accountId) ?? Promise.resolve(false),
    setActiveAccount: (accountId) => idk?.auth.setActiveAccount(accountId) ?? Promise.resolve(null),

    // ── Launch ──
    // v1 calls launchMinecraft with 12 positional args. v2 expects a single options object.
    // authProvider is derived from window.IdkApp.state.authMode (the renderer's
    // source of truth) because authData heuristics break: getMicrosoftAuthData()
    // returns raw AuthSession and modpacks-feature wraps it in `.data` → null.
    resolveAuthProvider: (authData) => {
      const mode = window.IdkApp?.state?.authMode;
      if (mode === 'elyby' || mode === 'microsoft' || mode === 'offline') return mode;
      if (authData?.elyby || authData?.provider === 'elyby') return 'elyby';
      if (authData) return 'microsoft';
      return 'offline';
    },
    launchMinecraft: (...args) => {
      const [username, versionId, javaPath, loader, autoOpt, perfRenderer, maxMemory, authData, quickConnect, windowSize, javaArgs, forceUpdate] = args;
      const authProvider = api.resolveAuthProvider(authData);
      let memMb = 4096;
      if (maxMemory && typeof maxMemory === 'string') {
        const parsed = parseInt(maxMemory.replace(/[Gg]$/, ''), 10);
        if (!isNaN(parsed)) memMb = parsed * 1024;
      }
      // v1 quick-connect is either a string or { host, port } — normalize to string
      let qc = quickConnect;
      if (qc && typeof qc === 'object' && qc.host) {
        qc = qc.port ? `${qc.host}:${qc.port}` : qc.host;
      }
      const opts = {
        versionId: versionId || '',
        loader: (loader || 'vanilla').toLowerCase(),
        javaPath: javaPath || undefined,
        maxMemoryMb: memMb,
        javaArgs: Array.isArray(javaArgs)
          ? javaArgs
          : (typeof javaArgs === 'string' && javaArgs.trim() ? javaArgs.trim().split(/\s+/) : []),
        windowSize: windowSize ? { width: windowSize.width || 854, height: windowSize.height || 480 } : undefined,
        autoOptimization: autoOpt !== false,
        performanceRenderer: perfRenderer === true || perfRenderer === 'true',
        quickConnect: qc || undefined,
        forceUpdate: forceUpdate === true,
        authProvider,
        username: username || undefined,
        accountId: window.IdkApp?.state?.activeAccountId || undefined,
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
    autoInstallDependencies: ({ modpackId, missing, mcVersion } = {}) =>
      idk?.crash.autoInstallDependencies({
        modpackId,
        missingMods: Array.isArray(missing) ? missing : [],
        mcVersion,
      }) ?? Promise.resolve([]),

    // ── Modpacks ──
    scanProfiles: async () => {
      const data = await (idk?.modpack.scanProfiles() ?? []);
      const profiles = Array.isArray(data)
        ? data.map((p) => ({
            ...p,
            // v1 renderer reads `mcVersion`; v2 backend returns `minecraftVersion`
            mcVersion: p.minecraftVersion ?? p.mcVersion ?? '',
            minecraftVersion: p.minecraftVersion ?? p.mcVersion ?? '',
          }))
        : [];
      return { success: true, profiles };
    },
    deleteModpackFolder: (modpackId) => idk?.modpack.deleteFolder(modpackId) ?? Promise.resolve({ success: false }),
    renameInstance: (modpackId, newName) => idk?.modpack.rename(modpackId, newName) ?? Promise.resolve(''),
    updateModpackProfile: (args) => {
      // v1 renderer passes a flat object { modpackId, name, mcVersion, ... };
      // the preload expects (modpackId, changes).
      const { modpackId, ...changes } = (args && typeof args === 'object') ? args : { modpackId: args };
      return idk?.modpack.updateProfile(modpackId, changes) ?? Promise.resolve({ success: false });
    },
    launchModpack: (modpackId) => {
      const id = typeof modpackId === 'string' ? modpackId : (modpackId?.modpackId || '');
      const authData = typeof modpackId === 'object' ? modpackId?.authData : undefined;
      const authProvider = api.resolveAuthProvider(authData);
      // v1 quick-connect is either a string or { host, port } — normalize to string
      let qc = typeof modpackId === 'object' ? modpackId?.quickConnect : undefined;
      if (qc && typeof qc === 'object' && qc.host) {
        qc = qc.port ? `${qc.host}:${qc.port}` : qc.host;
      }
      // v1 maxMemory is "4G" → v2 wants MB
      let memMb;
      const maxMem = typeof modpackId === 'object' ? modpackId?.maxMemory : undefined;
      if (maxMem && typeof maxMem === 'string') {
        const parsed = parseInt(maxMem.replace(/[Gg]$/, ''), 10);
        if (!isNaN(parsed)) memMb = parsed * 1024;
      }
      let winSize;
      const ws = typeof modpackId === 'object' ? modpackId?.windowSize : undefined;
      if (ws && ws.width && ws.height) winSize = { width: ws.width, height: ws.height };
      // v1 globalJavaArgs is a string
      const gja = typeof modpackId === 'object' ? modpackId?.globalJavaArgs : undefined;
      const jArgs = Array.isArray(gja)
        ? gja
        : (typeof gja === 'string' && gja.trim() ? gja.trim().split(/\s+/) : undefined);
      idk?.modpack.launch(id, {
        quickConnect: qc || undefined,
        authProvider,
        maxMemoryMb: memMb,
        windowSize: winSize,
        javaArgs: jArgs,
        username: window.IdkApp?.state?.currentUser || undefined,
        accountId: window.IdkApp?.state?.activeAccountId || undefined,
      });
      return Promise.resolve({ success: true });
    },
    downloadModrinthModpack: (projectId, minecraftVersion, loader, name) =>
      idk?.mod.downloadModrinthModpack(projectId, minecraftVersion, loader, name) ?? Promise.resolve({ success: false }),
    downloadCurseforgeModpack: (projectId, fileId, name) => idk?.mod.downloadCurseforgeModpack(projectId, fileId, name) ?? Promise.resolve({ success: false }),
    exportModpack: (modpackId, targetPath) => idk?.modpack.export(modpackId, targetPath) ?? Promise.resolve({ success: false }),
    unzipCurseforge: (zipPath, name) => idk?.modpack.importZip(zipPath, name) ?? Promise.resolve({ success: false }),

    // ── Versions ──
    scanDownloadedVersions: async () => {
      // v1 renderer expects { success, versions, versionDetails }; v2 backend now returns exactly that.
      const data = await (idk?.version.scanDownloaded() ?? { success: false, versions: [], versionDetails: {} });
      return data;
    },
    downloadVersion: (versionId, loader, loaderVersion) => {
      // v1 renderer passes an object ({ version: id }); preload expects separate args.
      const args = (versionId && typeof versionId === 'object') ? versionId : { versionId, loader, loaderVersion };
      return idk?.version.download(args.versionId ?? args.version ?? '', args.loader, args.loaderVersion) ?? Promise.resolve({ success: false });
    },
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
    installMod: (args) =>
      idk?.mod.installFromBrowser(args) ?? Promise.resolve({ success: false }),
    installModToVersion: (args) =>
      idk?.mod.installToVersion(args) ?? Promise.resolve({ success: false }),
    installResourcepack: (args) =>
      idk?.mod.installResourcepack(args) ?? Promise.resolve({ success: false }),
    installShader: (args) =>
      idk?.mod.installShader(args) ?? Promise.resolve({ success: false }),
    importExternalFiles: (args) =>
      idk?.mod.importExternalFiles(args) ?? Promise.resolve({ success: false }),
    removeMod: (args) =>
      idk?.mod.remove(args) ?? Promise.resolve({ success: false }),
    removeResourcepack: (args) =>
      idk?.mod.removeResourcepack(args) ?? Promise.resolve({ success: false }),
    removeShader: (args) =>
      idk?.mod.removeShader(args) ?? Promise.resolve({ success: false }),
    searchMods: (query, loader, projectType, limit, offset, categories, gameVersion) => idk?.mod.search(query, loader, projectType, limit, offset, categories, gameVersion) ?? Promise.resolve({ hits: [], total_hits: 0 }),
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
    scanProfileAchievements: (args) => {
      // v1 renderer passes { modpackId, versionId }; preload expects a plain string.
      const modpackId = (args && typeof args === 'object') ? (args.modpackId ?? '') : (args ?? '');
      return idk?.achievements.scanProfile(modpackId) ?? Promise.resolve([]);
    },

    // ── Overlay ──
    getOverlayData: () => idk?.overlay.getOverlayData() ?? Promise.resolve(null),
    onOverlayInit: listenerStub('onOverlayInit'),
    onToggleOverlay: listenerStub('onToggleOverlay'),

    // ── Updates ──
    checkForUpdates: async () => {
      // electron-updater returns UpdateCheckResult ({ isUpdateAvailable, updateInfo });
      // v1 renderer expects { updateAvailable, latestVersion }.
      try {
        const res = await (idk?.update.check() ?? Promise.resolve(null));
        if (!res) return { updateAvailable: false };
        const info = res.updateInfo;
        return {
          updateAvailable: !!res.isUpdateAvailable,
          latestVersion: info?.version,
          releaseNotes: info?.releaseNotes,
        };
      } catch {
        // Not packed or no updater configured — v1 treated this as "no update".
        return { updateAvailable: false };
      }
    },

    // ── Java path (v1 had a dedicated channel) ──
    onClearJavaPath: listenerStub('onClearJavaPath'),
  };

  window.electronAPI = api;
  console.info('[electronAPI shim] installed —', Object.keys(api).length, 'methods bridged to window.idk');
})();
