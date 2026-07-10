/* ============================================================================
   APPLICATION ENTRY POINT
   ----------------------------------------------------------------------------
   This module orchestrates the launcher startup sequence:

     1. Install the v1→v2 electronAPI compatibility shim.
     2. Load the CSS architecture (styles/index.css → tokens → themes → base
        → components → advanced → fixes).
     3. Register side-effect components (download progress, a11y, error display).
     4. Migrate settings from localStorage to the backend SettingsManager.
     5. Apply runtime DOM classes (window mode, UI scale).
     6. Render the app shell (the entire DOM is injected by app-shell.js).
     7. Initialize the view controller (switchView, returnView tracking).
     8. Dynamically import and initialize all feature modules in order.
     9. Initialize background effects and game-feature integrations.

   Feature initialization order is critical — see the comment block below.
   ============================================================================ */

import "./electron-api-shim.js";
import "./styles/index.css";

// Side-effect imports: these modules self-register on import.
// download-progress creates the progress tracker singleton.
// accessibility-manager creates the a11y live region + keyboard nav.
// error-display creates the error queue singleton.
import "./components/download-progress.js";
import "./components/accessibility-manager.js";
import "./components/error-display.js";

import { renderAppShell } from "./app/app-shell.js";
import { state, actions } from "./core/app-state.js";
import { createViewController, initWindowControls } from "./core/views.js";
import { loadAndMigrateSettings } from "./core/settings-migration.js";
import { initBackgroundEffects } from "./features/background/background-effects.js";
import { initGameFeaturesIntegration } from "./features/game-features/game-features-integration.js";

/* ---------------------------------------------------------------------------
   RUNTIME DOM CLASS MANAGEMENT
   --------------------------------------------------------------------------- */

/** Toggle body[data-window-mode] for CSS hooks (restored vs maximized). */
function applyWindowModeClass(data) {
  const maximized = !!data?.maximized;
  document.body.dataset.windowMode = maximized ? "maximized" : "restored";
}

/** Compute and apply --mods-ui-scale based on viewport size. */
function applyModpackUiScale() {
  const root = document.documentElement;
  const width = root.clientWidth || window.innerWidth || 1366;
  const height = root.clientHeight || window.innerHeight || 768;
  const minDim = Math.min(width, height);
  const scale = Math.max(0.88, Math.min(1, minDim / 900));
  root.style.setProperty("--mods-ui-scale", scale.toFixed(3));
}

/* ---------------------------------------------------------------------------
   STARTUP SEQUENCE
   --------------------------------------------------------------------------- */

// 4. Migrate settings before rendering UI so features read correct values.
await loadAndMigrateSettings();

// 5. Apply window-mode class + UI scale.
if (window.electronAPI?.onWindowStateChanged) {
  window.electronAPI.onWindowStateChanged(applyWindowModeClass);
}
applyWindowModeClass({
  maximized:
    window.outerWidth >= screen.availWidth - 20 &&
    window.outerHeight >= screen.availHeight - 20,
});
applyModpackUiScale();
window.addEventListener("resize", applyModpackUiScale);

// 6. Render the app shell — this injects the entire DOM into #app.
//    All feature init depends on this completing first.
renderAppShell();

// 7. Create the view controller and register switchView on actions.
const { switchView, getReturnView } = createViewController();
actions.switchView = switchView;

initWindowControls();

// 8. Dynamically import + initialize all features.
//    Promise.all allows the modules to load in parallel.
//    Initialization runs in a strict order (see below).
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
  import("./features/auth/auth-feature.js"),
  import("./features/settings/settings-feature.js"),
  import("./features/versions/version-feature.js"),
  import("./features/versions/version-mods-feature.js"),
  import("./features/launch/launch-feature.js"),
  import("./features/modpacks/modpacks-feature.js"),
  import("./features/content/content-feature.js"),
  import("./features/desktop/desktop-helpers.js"),
  import("./features/friends/friends-feature.js"),
  import("./features/profile/profile-feature.js"),
  import("./components/confirm-dialog.js"),
]);

actions.showConfirmDialog = showConfirmDialog;

/* ---------------------------------------------------------------------------
   FEATURE INITIALIZATION ORDER
   ----------------------------------------------------------------------------
   The order below is load-bearing. Do not reorder without understanding
   the dependencies:

     1. auth          — needs switchView; populates state.currentUser/authMode
     2. settings      — needs switchView; applies theme tokens to :root
     3. versions      — dispatches 'versions-loaded' event (async); sets
                        state.selectedVersion/selectedLoader
     4. version-mods  — needs switchView; monkey-patches actions.renderVersions
                        (must run AFTER versions)
     5. launch        — registers IPC listeners; reads actions.modpacks (set
                        in step 6) inside handlers that fire later — safe
     6. modpacks      — needs switchView; sets actions.modpacks namespace;
                        listens for 'versions-loaded' (dispatched in step 3)
     7. content       — fetches news/trending; wires nav-tab clicks
     8. desktop       — frameless-window focus workaround
     9. friends       — sets actions.updateFriendsAuthUI (called by auth)
    10. profile       — needs switchView + getReturnView; sets actions.openProfile
    11. game-features — wires crash-analyzer, mod-updates, mod-resolver
    12. background    — reads body[data-bg-effect] (set by settings in step 2)
   --------------------------------------------------------------------------- */

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
initGameFeaturesIntegration();
initBackgroundEffects();
