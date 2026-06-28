import type { PreloadApi } from '../../preload';

/**
 * Renderer-side access to the typed preload API. The `window.idk` object is
 * injected by preload's contextBridge. This module gives every renderer
 * module a typed, importable handle instead of reaching for `window` directly.
 *
 * Replaces v1's flat `window.electronAPI` (86 untyped methods).
 */
declare global {
  interface Window {
    idk: PreloadApi;
  }
}

/**
 * When running outside Electron (e.g. `vite dev` in a plain browser for UI
 * development / visual QA), `window.idk` is absent. Rather than crash every
 * component that calls `api.*`, we provide a dev mock that returns benign
 * defaults. This lets the renderer render fully for screenshots.
 *
 * In production (inside Electron), the real preload script runs first and
 * `window.idk` is present, so this fallback is never used.
 */
function createDevMock(): PreloadApi {
  const asyncStub = async () => undefined;
  const asyncString = async () => '' as string;
  const asyncStringNull = async () => null as string | null;
  const noop = () => {};

  return {
    window: {
      minimize: noop,
      maximize: noop,
      close: noop,
      toggleDevTools: noop,
      onStateChanged: noop,
    },
    system: {
      getUserDataPath: asyncString as () => Promise<string>,
      getVersionsPath: asyncString as () => Promise<string>,
      openExternal: noop,
      openMinecraftFolder: noop,
      selectMinecraftFolder: asyncStub,
      selectImageFile: asyncStub,
      selectModpackZip: asyncStub,
      selectExportZip: asyncStringNull as () => Promise<string | null>,
      log: noop,
    },
    auth: {
      microsoftAuthenticate: async () => ({ provider: 'microsoft' as const, username: 'DevPlayer', uuid: 'dev-uuid-0001' }),
      getMicrosoftAuthData: async () => ({ provider: 'microsoft' as const, username: 'DevPlayer', uuid: 'dev-uuid-0001' }),
      elybyAuthenticate: async () => ({ provider: 'elyby' as const, username: 'ElybyDev', uuid: 'dev-uuid-0002' }),
      fetchElybyProfile: asyncStub,
      getElybyAuthData: async () => null,
      signOut: asyncStub,
    },
    launch: {
      minecraft: noop,
      cancel: noop,
      onProgress: noop,
      onGameLaunched: noop,
      onClosed: noop,
      onError: noop,
      onWarning: noop,
    },
    modpack: {
      scanProfiles: async () => [
        {
          id: 'dev-skyblock',
          name: 'Skyblock Adventures',
          description: 'A dev preview modpack',
          minecraftVersion: '1.20.1',
          loader: 'fabric',
          directory: '/tmp/dev/skyblock',
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 3600000,
          lastPlayedAt: Date.now() - 3600000,
          playtimeSeconds: 14400,
          modCount: 42,
        },
        {
          id: 'dev-rpg',
          name: 'RPG Legends',
          description: 'Epic RPG modpack',
          minecraftVersion: '1.19.2',
          loader: 'forge',
          directory: '/tmp/dev/rpg',
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now() - 7200000,
          modCount: 87,
        },
      ],
      deleteFolder: asyncStub,
      updateProfile: asyncStub,
      launch: asyncStub,
      install: asyncString as () => Promise<string>,
      export: asyncStub,
      importZip: asyncString as () => Promise<string>,
    },
    download: {
      start: asyncStub,
      pause: asyncStub,
      resume: asyncStub,
      cancel: asyncStub,
      cancelAll: asyncStub,
      onProgress: noop,
      onComplete: noop,
      onError: noop,
    },
    settings: {
      load: async () => ({
        general: { theme: 'glass', language: 'en', minecraftRoot: '', discordRpc: true, autoUpdate: true, backgroundEffect: 'particles' },
        java: { customPath: '', autoDetect: true, args: [] },
        memory: { maxMb: 8192, minMb: 2048, autoAllocate: true },
        appearance: { glassmorphism: true, accentColor: '#4cb837', compactMode: false, reducedMotion: false },
        launch: { closeOnLaunch: false, showOverlay: true, autoOptimize: true, windowWidth: 1920, windowHeight: 1080, fullscreen: false },
        network: { concurrentDownloads: 4, verifyIntegrity: true, proxyUrl: '' },
        connect: { enabled: false, serverUrl: '', tunnelToken: '', tunnelEnabled: false },
      }),
      save: asyncStub,
      reset: asyncStub,
      getByCategory: asyncStub,
      search: asyncStub,
      getCategories: async () => [
        { id: 'general', label: 'General', description: 'Theme, language, updates', icon: 'settings' },
        { id: 'java', label: 'Java', description: 'Java runtime and arguments', icon: 'coffee' },
        { id: 'memory', label: 'Memory', description: 'JVM memory allocation', icon: 'memory-stick' },
        { id: 'appearance', label: 'Appearance', description: 'Glassmorphism and accent', icon: 'palette' },
        { id: 'launch', label: 'Launch', description: 'Launch window behavior', icon: 'play' },
        { id: 'network', label: 'Network', description: 'Downloads and integrity', icon: 'globe' },
        { id: 'connect', label: 'IDK Connect', description: 'Multiplayer tunneling', icon: 'users' },
      ],
    },
    version: {
      scanDownloaded: async () => ['1.20.1', '1.19.4', '1.18.2'],
      download: asyncString as () => Promise<string>,
      cancelDownload: asyncStub,
    },
    skin: {
      fetchImageBase64: asyncString as () => Promise<string>,
      uploadMicrosoftSkin: asyncStub,
    },
    tunnel: {
      ensureFrpc: asyncStub,
      start: asyncStub,
      stop: asyncStub,
      onClosed: noop,
    },
    update: {
      check: asyncStub,
      download: asyncStub,
      install: asyncStub,
      onAvailable: noop,
      onProgress: noop,
      onDownloaded: noop,
      onError: noop,
    },
  } as unknown as PreloadApi;
}

export const api: PreloadApi =
  typeof window !== 'undefined' && window.idk
    ? window.idk
    : createDevMock();
