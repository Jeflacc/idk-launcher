import './style.css';
import { downloadProgressTracker } from './components/download-progress.js';
import { accessibilityManager } from './components/accessibility-manager.js';
import { errorDisplay } from './components/error-display.js';
import SettingsUI from './components/settings-ui.js';
import { renderAppShell } from './app/app-shell.js';
import { actions } from './core/app-state.js';
import { createViewController, initWindowControls } from './core/views.js';

renderAppShell();

// Keep these singletons alive; their constructors register UI and IPC behavior.
void downloadProgressTracker;
void accessibilityManager;
void errorDisplay;
void SettingsUI;

const { switchView } = createViewController();
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
]);

initAuthFeature({ switchView });
initSettingsFeature({ switchView });
initVersionsFeature();
initVersionModsFeature({ switchView });
initLaunchFeature();
initModpacksFeature({ switchView });
initContentFeature();
initDesktopHelpers();
initFriendsFeature();
