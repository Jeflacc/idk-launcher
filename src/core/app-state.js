const lastPlayed = JSON.parse(localStorage.getItem('idk_last_played') || '{"version": null, "loader": "Vanilla"}');

export const state = {
  quickConnectTarget: null,
  currentUser: localStorage.getItem('craftlaunch_username') || '',
  authMode: localStorage.getItem('craftlaunch_authmode') || 'offline',
  selectedVersion: lastPlayed.version,
  selectedLoader: lastPlayed.loader,
  autoOptimization: localStorage.getItem('craftlaunch_autoOptimization') === 'true',
  hideLauncher: localStorage.getItem('idk_hide_launcher') !== 'false',
  launcherPerformanceMode: localStorage.getItem('idk_launcher_performance_mode') || 'balanced',
  javaPath: localStorage.getItem('craftlaunch_javaPath') || '',
  globalJavaArgs: localStorage.getItem('idk_global_java_args') || '',
  defaultWindowWidth: parseInt(localStorage.getItem('idk_default_window_width') || '1024'),
  defaultWindowHeight: parseInt(localStorage.getItem('idk_default_window_height') || '768'),
  defaultFullscreen: localStorage.getItem('idk_default_fullscreen') === 'true',
  maxMemoryGB: parseInt(localStorage.getItem('craftlaunch_maxMemory') || '4'),
  allVersions: [],
  sodiumSupportedVersions: new Set(),
  downloadedVersions: [],
  modpacks: JSON.parse(localStorage.getItem('idk_modpacks') || '[]'),
  versionSettings: JSON.parse(localStorage.getItem('idk_version_settings') || '{}'),
  activeModpackId: null,
  activeVersionForMods: null,
  browserMode: 'mod',
  currentProvider: 'modrinth',
  browserPage: 0,
  browserQuery: '',
  browserTotalResults: 0,
};

export const actions = {};

window.IdkApp = { state, actions };
