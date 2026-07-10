/* ============================================================================
   SETTINGS MIGRATION
   ----------------------------------------------------------------------------
   Migrates user settings from v1 localStorage keys to the v2 backend
   SettingsManager. Runs once at startup.

   Strategy:
     1. Load settings from the backend (window.electronAPI.loadSettings).
     2. For each setting: if the backend value is default/missing AND a
        localStorage value exists, use the localStorage value and queue
        it for migration to the backend.
     3. Persist any migrated values back to the backend in a single batch.
     4. Write the resolved values into the shared `state` object.

   This module replaces the 130-line inline migration block that was
   previously in main.js with a declarative table.
   ============================================================================ */

import { state } from "./app-state.js";
import { safeParse } from "./safe-parse.js";

/**
 * @typedef {Object} SettingField
 * @property {string} stateKey      - Key on the `state` object to write.
 * @property {string} backendKey    - Key in the backend settings object.
 * @property {string} localKey      - localStorage key (v1 compat).
 * @property {*} defaultValue       - Fallback if neither source has a value.
 * @property {"string"|"bool"|"int"} [type="string"] - How to parse localStorage.
 * @property {(v: any) => any} [transform] - Optional post-processing (e.g. clamp).
 */

/** @type {SettingField[]} */
const SETTING_FIELDS = [
  { stateKey: "javaPath", backendKey: "javaPath", localKey: "craftlaunch_javaPath", defaultValue: "" },
  { stateKey: "globalJavaArgs", backendKey: "globalJavaArgs", localKey: "idk_global_java_args", defaultValue: "" },
  { stateKey: "customMinecraftPath", backendKey: "customMinecraftPath", localKey: "idk_custom_minecraft_path", defaultValue: "" },
  { stateKey: "defaultWindowWidth", backendKey: "defaultWindowWidth", localKey: "idk_default_window_width", defaultValue: 1024, type: "int" },
  { stateKey: "defaultWindowHeight", backendKey: "defaultWindowHeight", localKey: "idk_default_window_height", defaultValue: 768, type: "int" },
  { stateKey: "defaultFullscreen", backendKey: "defaultFullscreen", localKey: "idk_default_fullscreen", defaultValue: false, type: "bool" },
  { stateKey: "enableOverlay", backendKey: "enableOverlay", localKey: "idk_enable_overlay", defaultValue: false, type: "bool" },
  { stateKey: "language", backendKey: "language", localKey: "idk_language", defaultValue: "en" },
  { stateKey: "backgroundEffect", backendKey: "backgroundEffect", localKey: "idk_background_effect", defaultValue: "none" },
  { stateKey: "backgroundIntensity", backendKey: "backgroundIntensity", localKey: "idk_background_intensity", defaultValue: 50, type: "int" },
  { stateKey: "concurrentDownloads", backendKey: "concurrentDownloads", localKey: "idk_concurrent_downloads", defaultValue: 4, type: "int" },
  { stateKey: "concurrentIO", backendKey: "concurrentIO", localKey: "idk_concurrent_io", defaultValue: 2, type: "int", transform: (v) => Math.min(v, 8) },
  { stateKey: "autoUpdates", backendKey: "autoUpdates", localKey: "idk_auto_updates", defaultValue: true, type: "bool" },
  { stateKey: "discordPresence", backendKey: "discordPresence", localKey: "idk_discord_presence", defaultValue: true, type: "bool" },
  { stateKey: "betaUpdates", backendKey: "betaUpdates", localKey: "idk_beta_updates", defaultValue: false, type: "bool" },
  { stateKey: "openLogsAfterLaunch", backendKey: "openLogsAfterLaunch", localKey: "idk_open_logs", defaultValue: false, type: "bool" },
  { stateKey: "analyticsEnabled", backendKey: "analyticsEnabled", localKey: "idk_analytics", defaultValue: false, type: "bool" },
  { stateKey: "hideLauncher", backendKey: "hideLauncher", localKey: "idk_hide_launcher", defaultValue: true, type: "bool" },
  { stateKey: "maxMemoryGB", backendKey: "maxMemoryGB", localKey: "craftlaunch_maxMemory", defaultValue: 4, type: "int" },
  { stateKey: "launcherPerformanceMode", backendKey: "launcherPerformanceMode", localKey: "idk_launcher_performance_mode", defaultValue: "balanced" },
  { stateKey: "autoOptimization", backendKey: "autoOptimization", localKey: "craftlaunch_autoOptimization", defaultValue: false, type: "bool" },
  { stateKey: "currentUser", backendKey: "currentUser", localKey: "craftlaunch_username", defaultValue: "" },
  { stateKey: "authMode", backendKey: "authMode", localKey: "craftlaunch_authmode", defaultValue: "offline" },
  { stateKey: "launcherTheme", backendKey: "launcherTheme", localKey: "idk_launcher_theme", defaultValue: "emerald" },
  { stateKey: "launcherAccentColor", backendKey: "launcherAccentColor", localKey: "idk_accent_color", defaultValue: "#4cb837" },
  { stateKey: "launcherBorderRadius", backendKey: "launcherBorderRadius", localKey: "idk_border_radius", defaultValue: 10, type: "int" },
  { stateKey: "launcherAnimationSpeed", backendKey: "launcherAnimationSpeed", localKey: "idk_animation_speed", defaultValue: 1, type: "int" },
  { stateKey: "launcherFontScale", backendKey: "launcherFontScale", localKey: "idk_font_scale", defaultValue: 1, type: "int" },
  { stateKey: "launcherBlurIntensity", backendKey: "launcherBlurIntensity", localKey: "idk_blur_intensity", defaultValue: "medium" },
  { stateKey: "launcherCompactMode", backendKey: "launcherCompactMode", localKey: "idk_compact_mode", defaultValue: false, type: "bool" },
  { stateKey: "launcherUiMode", backendKey: "launcherUiMode", localKey: "idk_launcher_ui_mode", defaultValue: "classic" },
];

/**
 * Parse a localStorage raw string value according to the field type.
 * @param {SettingField} field
 * @param {string} raw
 * @returns {*}
 */
function parseLocalValue(field, raw) {
  switch (field.type) {
    case "bool":
      return raw === "true";
    case "int":
      return parseInt(raw) || field.defaultValue;
    default:
      return raw;
  }
}

/**
 * Apply a transform (e.g. clamping) if the field defines one.
 * @param {SettingField} field
 * @param {*} value
 * @returns {*}
 */
function applyTransform(field, value) {
  return typeof field.transform === "function" ? field.transform(value) : value;
}

/**
 * Resolve a single setting: prefer backend, fall back to localStorage
 * (with migration flag), fall back to default.
 *
 * @param {SettingField} field
 * @param {object} backendSettings
 * @param {object} migrateQueue
 * @returns {*}
 */
function resolveSetting(field, backendSettings, migrateQueue) {
  const backendVal = backendSettings[field.backendKey];
  const localRaw = localStorage.getItem(field.localKey);

  const isBackendDefault =
    backendVal === field.defaultValue ||
    backendVal === undefined ||
    backendVal === null;

  if (isBackendDefault && localRaw !== null) {
    const localVal = parseLocalValue(field, localRaw);
    if (localVal !== field.defaultValue) {
      migrateQueue[field.backendKey] = localVal;
      return applyTransform(field, localVal);
    }
  }

  const resolved = backendVal !== undefined ? backendVal : field.defaultValue;
  return applyTransform(field, resolved);
}

/**
 * Load settings from the backend, migrate from localStorage if needed,
 * and populate the shared `state` object. Returns a promise that
 * resolves when migration is complete (or fails silently).
 *
 * @returns {Promise<void>}
 */
export async function loadAndMigrateSettings() {
  if (!window.electronAPI) return;

  try {
    const result = await window.electronAPI.loadSettings();
    if (!result || !result.success || !result.settings) return;

    const backend = result.settings;
    const migrate = {};

    // --- Standard scalar settings (table-driven) ---
    for (const field of SETTING_FIELDS) {
      state[field.stateKey] = resolveSetting(field, backend, migrate);
    }

    // --- Ely.by auth data (pass-through) ---
    if (backend.elybyData !== undefined && backend.elybyData !== null) {
      migrate.elybyData = backend.elybyData;
    }

    // --- Last played version + loader (stored as a JSON object in localStorage) ---
    const lastPlayed = safeParse(localStorage.getItem("idk_last_played"), {});

    if (backend.lastPlayedVersion !== undefined && backend.lastPlayedVersion) {
      state.selectedVersion = backend.lastPlayedVersion;
    } else if (lastPlayed.version) {
      state.selectedVersion = lastPlayed.version;
      migrate.lastPlayedVersion = lastPlayed.version;
    }

    if (backend.lastPlayedLoader !== undefined && backend.lastPlayedLoader) {
      state.selectedLoader = backend.lastPlayedLoader;
    } else if (lastPlayed.loader) {
      state.selectedLoader = lastPlayed.loader;
      migrate.lastPlayedLoader = lastPlayed.loader;
    }

    // --- Version-specific settings (nested object) ---
    if (
      backend.versionSettings !== undefined &&
      backend.versionSettings !== null &&
      Object.keys(backend.versionSettings).length > 0
    ) {
      state.versionSettings = backend.versionSettings;
    } else {
      const localVS = localStorage.getItem("idk_version_settings");
      if (localVS) {
        const parsed = safeParse(localVS, {});
        if (parsed && Object.keys(parsed).length > 0) {
          state.versionSettings = parsed;
          migrate.versionSettings = parsed;
        }
      }
    }

    // --- Playtime (backend wins; migrate from localStorage if backend is 0) ---
    const backendPlaytime = backend.playtime !== undefined ? backend.playtime : 0;
    const localPlaytimeRaw = localStorage.getItem("idk_playtime");
    let finalPlaytime = backendPlaytime;

    if (backendPlaytime === 0 && localPlaytimeRaw !== null) {
      const localPlaytime = parseInt(localPlaytimeRaw) || 0;
      if (localPlaytime > 0) {
        migrate.playtime = localPlaytime;
        finalPlaytime = localPlaytime;
      }
    }
    localStorage.setItem("idk_playtime", String(finalPlaytime));

    // --- Persist any migrated values back to the backend ---
    if (Object.keys(migrate).length > 0) {
      window.electronAPI.saveSettings(migrate).catch((err) =>
        console.error("[settings-migration] Failed to persist migrated settings:", err),
      );
    }
  } catch (err) {
    console.error("[settings-migration] Failed to load settings from backend:", err);
  }
}
