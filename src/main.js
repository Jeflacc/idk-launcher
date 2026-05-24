import './style.css';
import { downloadProgressTracker } from './components/download-progress.js';
import { accessibilityManager } from './components/accessibility-manager.js';
import { errorDisplay } from './components/error-display.js';
import SettingsUI from './components/settings-ui.js';
import { renderAppShell } from './app/app-shell.js';
import { state, actions } from './core/app-state.js';
import { createViewController, initWindowControls } from './core/views.js';

// Load persistent settings from settings.json via Electron IPC
if (window.electronAPI) {
  try {
    const result = await window.electronAPI.loadSettings();
    if (result && result.success && result.settings) {
      const s = result.settings;
      const migrate = {};

      // Helper for migration from localStorage if setting has default/empty value
      const getMigrated = (key, localKey, defaultValue, isBool = false, isInt = false) => {
        const backendVal = s[key];
        const localValRaw = localStorage.getItem(localKey);
        
        if ((backendVal === defaultValue || backendVal === undefined || backendVal === null) && localValRaw !== null) {
          let localVal = localValRaw;
          if (isBool) localVal = localValRaw === 'true';
          else if (isInt) localVal = parseInt(localValRaw) || defaultValue;
          
          if (localVal !== defaultValue) {
            migrate[key] = localVal;
            return localVal;
          }
        }
        return backendVal !== undefined ? backendVal : defaultValue;
      };

      state.javaPath = getMigrated('javaPath', 'craftlaunch_javaPath', '');
      state.globalJavaArgs = getMigrated('globalJavaArgs', 'idk_global_java_args', '');
      state.defaultWindowWidth = getMigrated('defaultWindowWidth', 'idk_default_window_width', 1024, false, true);
      state.defaultWindowHeight = getMigrated('defaultWindowHeight', 'idk_default_window_height', 768, false, true);
      state.defaultFullscreen = getMigrated('defaultFullscreen', 'idk_default_fullscreen', false, true);
      state.enableOverlay = getMigrated('enableOverlay', 'idk_enable_overlay', false, true);
      state.maxMemoryGB = getMigrated('maxMemoryGB', 'craftlaunch_maxMemory', 4, false, true);
      state.launcherPerformanceMode = getMigrated('launcherPerformanceMode', 'idk_launcher_performance_mode', 'balanced');
      state.autoOptimization = getMigrated('autoOptimization', 'craftlaunch_autoOptimization', false, true);
      state.currentUser = getMigrated('currentUser', 'craftlaunch_username', '');
      state.authMode = getMigrated('authMode', 'craftlaunch_authmode', 'offline');

      if (s.elybyData !== undefined && s.elybyData !== null) {
        localStorage.setItem('craftlaunch_elybydata', JSON.stringify(s.elybyData));
      } else {
        const localEly = localStorage.getItem('craftlaunch_elybydata');
        if (localEly) {
          try {
            const parsed = JSON.parse(localEly);
            if (parsed && Object.keys(parsed).length > 0) {
              migrate.elybyData = parsed;
            }
          } catch(e) {}
        }
      }
      
      // Load lastPlayed if present
      if (s.lastPlayedVersion !== undefined && s.lastPlayedVersion) {
        state.selectedVersion = s.lastPlayedVersion;
      } else {
        const lpRaw = localStorage.getItem('idk_last_played');
        if (lpRaw) {
          try {
            const lp = JSON.parse(lpRaw);
            if (lp && lp.version) {
              state.selectedVersion = lp.version;
              migrate.lastPlayedVersion = lp.version;
            }
          } catch(e) {}
        }
      }

      if (s.lastPlayedLoader !== undefined && s.lastPlayedLoader) {
        state.selectedLoader = s.lastPlayedLoader;
      } else {
        const lpRaw = localStorage.getItem('idk_last_played');
        if (lpRaw) {
          try {
            const lp = JSON.parse(lpRaw);
            if (lp && lp.loader) {
              state.selectedLoader = lp.loader;
              migrate.lastPlayedLoader = lp.loader;
            }
          } catch(e) {}
        }
      }
      
      // Load versionSettings if present
      if (s.versionSettings !== undefined && s.versionSettings !== null && Object.keys(s.versionSettings).length > 0) {
        state.versionSettings = s.versionSettings;
      } else {
        const localVS = localStorage.getItem('idk_version_settings');
        if (localVS) {
          try {
            state.versionSettings = JSON.parse(localVS) || {};
            migrate.versionSettings = state.versionSettings;
          } catch(e) {}
        }
      }
      
      // Load playtime if present
      const backendPlaytime = s.playtime !== undefined ? s.playtime : 0;
      const localPlaytimeRaw = localStorage.getItem('idk_playtime');
      let finalPlaytime = backendPlaytime;
      if (backendPlaytime === 0 && localPlaytimeRaw !== null) {
        const localPlaytime = parseInt(localPlaytimeRaw) || 0;
        if (localPlaytime > 0) {
          migrate.playtime = localPlaytime;
          finalPlaytime = localPlaytime;
        }
      }
      localStorage.setItem('idk_playtime', finalPlaytime);
      
      // Save migrated settings back to file
      if (Object.keys(migrate).length > 0) {
        console.log('[Main] Migrating settings from localStorage to settings.json:', migrate);
        window.electronAPI.saveSettings(migrate).catch(console.error);
      }
      
      console.log('[Main] Persistent settings loaded and applied to state.');
    }
  } catch (e) {
    console.error('[Main] Failed to load settings from SettingsManager:', e);
  }
}

renderAppShell();

// Keep these singletons alive; their constructors register UI and IPC behavior.
void downloadProgressTracker;
void accessibilityManager;
void errorDisplay;
void SettingsUI;

const { switchView, getReturnView } = createViewController();
actions.switchView = switchView;

initWindowControls();

const [
  { initAuthFeature },
  { initSettingsFeature },
  { initVersionsFeature },
  { initVersionModsFeature },
  { initLaunchFeature },
  { initModpacksFeature },
  { initContentFeature },
  { initDesktopHelpers },
  { initFriendsFeature },
  { initProfileFeature },
  { showConfirmDialog },
] = await Promise.all([
  import('./features/auth/auth-feature.js'),
  import('./features/settings/settings-feature.js'),
  import('./features/versions/version-feature.js'),
  import('./features/versions/version-mods-feature.js'),
  import('./features/launch/launch-feature.js'),
  import('./features/modpacks/modpacks-feature.js'),
  import('./features/content/content-feature.js'),
  import('./features/desktop/desktop-helpers.js'),
  import('./features/friends/friends-feature.js'),
  import('./features/profile/profile-feature.js'),
  import('./components/confirm-dialog.js'),
]);

actions.showConfirmDialog = showConfirmDialog;

initAuthFeature({ switchView });
initSettingsFeature({ switchView });
initVersionsFeature();
initVersionModsFeature({ switchView });
initLaunchFeature();
initModpacksFeature({ switchView });
initContentFeature();
initDesktopHelpers();
initFriendsFeature();
initProfileFeature({ switchView, getReturnView });
