const lastPlayed = JSON.parse(localStorage.getItem('idk_last_played') || '{"version": null, "loader": "Vanilla"}');

export const state = {
  quickConnectTarget: null,
  currentUser: localStorage.getItem('craftlaunch_username') || '',
  authMode: localStorage.getItem('craftlaunch_authmode') || 'offline',
  selectedVersion: lastPlayed.version,
  selectedLoader: lastPlayed.loader,
  autoOptimization: localStorage.getItem('craftlaunch_autoOptimization') === 'true',
  launcherPerformanceMode: localStorage.getItem('idk_launcher_performance_mode') || 'balanced',
  javaPath: localStorage.getItem('craftlaunch_javaPath') || '',
  maxMemoryGB: parseInt(localStorage.getItem('craftlaunch_maxMemory') || '4'),
  allVersions: [],
  sodiumSupportedVersions: new Set(),
  downloadedVersions: [],
  modpacks: JSON.parse(localStorage.getItem('idk_modpacks') || '[]'),
  activeModpackId: null,
  browserMode: 'mod',
  currentProvider: 'modrinth',
};

export const actions = {};

window.IdkApp = { state, actions };
