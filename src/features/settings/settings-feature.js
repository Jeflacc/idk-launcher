import { state, actions } from "../../core/app-state.js";

const THEME_IDS = new Set(["green", "violet", "azure", "ember"]);
const UI_MODE_IDS = new Set(["classic", "advanced"]);

function applyLauncherTheme(theme) {
  const nextTheme = THEME_IDS.has(theme) ? theme : "green";
  state.launcherTheme = nextTheme;
  document.documentElement.dataset.theme = nextTheme;
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("idk_launcher_theme", nextTheme);

  document.querySelectorAll(".theme-choice-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.theme === nextTheme);
  });
}

function applyLauncherUiMode(mode) {
  const nextMode = UI_MODE_IDS.has(mode) ? mode : "classic";
  state.launcherUiMode = nextMode;
  document.body.dataset.uiMode = nextMode;
  document.body.classList.toggle("ui-advanced", nextMode === "advanced");
  localStorage.setItem("idk_launcher_ui_mode", nextMode);

  document.querySelectorAll(".ui-mode-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.uiMode === nextMode);
  });

  if (nextMode === "advanced") {
    actions.refreshHomeSkin?.();
  }
}

export function initSettingsFeature({ switchView }) {
  // --- SETTINGS LOGIC ---
  actions.applyLauncherTheme = applyLauncherTheme;
  actions.applyLauncherUiMode = applyLauncherUiMode;

  applyLauncherTheme(state.launcherTheme);
  applyLauncherUiMode(state.launcherUiMode);

  document.querySelectorAll(".theme-choice-card").forEach((card) => {
    card.addEventListener("click", () =>
      applyLauncherTheme(card.dataset.theme),
    );
  });

  document.querySelectorAll(".ui-mode-card").forEach((card) => {
    card.addEventListener("click", () =>
      applyLauncherUiMode(card.dataset.uiMode),
    );
  });

  // Custom Minecraft Location Settings
  const customMinecraftPathInput = document.getElementById("custom-minecraft-path");
  if (customMinecraftPathInput) {
    customMinecraftPathInput.value = state.customMinecraftPath || "";

    const btnBrowseMinecraftPath = document.getElementById("btn-browse-minecraft-path");
    const btnClearMinecraftPath = document.getElementById("btn-clear-minecraft-path");

    btnBrowseMinecraftPath?.addEventListener("click", async () => {
      if (window.electronAPI?.selectMinecraftFolder) {
        const result = await window.electronAPI.selectMinecraftFolder();
        if (result && result.success && result.filePath) {
          state.customMinecraftPath = result.filePath;
          customMinecraftPathInput.value = state.customMinecraftPath;
          localStorage.setItem("idk_custom_minecraft_path", state.customMinecraftPath);
          await window.electronAPI.saveSettings({ customMinecraftPath: state.customMinecraftPath });
          
          if (actions.scanDownloadedVersions) {
            await actions.scanDownloadedVersions();
          }
        }
      }
    });

    btnClearMinecraftPath?.addEventListener("click", async () => {
      state.customMinecraftPath = "";
      customMinecraftPathInput.value = "";
      localStorage.setItem("idk_custom_minecraft_path", "");
      if (window.electronAPI) {
        await window.electronAPI.saveSettings({ customMinecraftPath: "" });
      }
      
      if (actions.scanDownloadedVersions) {
        await actions.scanDownloadedVersions();
      }
    });
  }

  const javaPathInput = document.getElementById("java-path");
  javaPathInput.value = state.javaPath;

  javaPathInput.addEventListener("input", (e) => {
    state.javaPath = e.target.value;
    localStorage.setItem("craftlaunch_javaPath", state.javaPath);
  });

  // Global Java Arguments
  const globalJavaArgsInput = document.getElementById("global-java-args");
  globalJavaArgsInput.value = state.globalJavaArgs || "";
  globalJavaArgsInput.addEventListener("input", (e) => {
    state.globalJavaArgs = e.target.value;
    localStorage.setItem("idk_global_java_args", state.globalJavaArgs);
  });

  // Default Window Size
  const defaultWidthInput = document.getElementById("default-window-width");
  const defaultHeightInput = document.getElementById("default-window-height");
  const fullscreenToggle = document.getElementById("fullscreen-toggle");
  const overlayToggle = document.getElementById("overlay-toggle");

  defaultWidthInput.value = state.defaultWindowWidth || 1024;
  defaultHeightInput.value = state.defaultWindowHeight || 768;
  fullscreenToggle.checked = state.defaultFullscreen || false;
  overlayToggle.checked = state.enableOverlay || false;

  defaultWidthInput.addEventListener("input", (e) => {
    state.defaultWindowWidth = parseInt(e.target.value) || 1024;
    localStorage.setItem("idk_default_window_width", state.defaultWindowWidth);
  });

  defaultHeightInput.addEventListener("input", (e) => {
    state.defaultWindowHeight = parseInt(e.target.value) || 768;
    localStorage.setItem(
      "idk_default_window_height",
      state.defaultWindowHeight,
    );
  });

  fullscreenToggle.addEventListener("change", (e) => {
    state.defaultFullscreen = e.target.checked;
    localStorage.setItem("idk_default_fullscreen", state.defaultFullscreen);
  });

  overlayToggle.addEventListener("change", (e) => {
    state.enableOverlay = e.target.checked;
    localStorage.setItem("idk_enable_overlay", state.enableOverlay);
  });

  // Memory slider
  const memSlider = document.getElementById("memory-slider");
  const memLabel = document.getElementById("memory-value-label");

  function setMemory(gb) {
    state.maxMemoryGB = gb;
    memSlider.value = gb;
    memLabel.innerText = `${gb} GB`;
    localStorage.setItem("craftlaunch_maxMemory", gb);
    document.querySelectorAll(".mem-preset-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.gb) === gb);
    });
  }
  setMemory(state.maxMemoryGB);

  memSlider.addEventListener("input", () =>
    setMemory(parseInt(memSlider.value)),
  );
  document.querySelectorAll(".mem-preset-btn").forEach((b) => {
    b.addEventListener("click", () => setMemory(parseInt(b.dataset.gb)));
  });

  function applyLauncherPerformanceMode(mode) {
    state.launcherPerformanceMode = mode;
    document.body.dataset.launcherPerformance = mode;
    localStorage.setItem("idk_launcher_performance_mode", mode);

    document.querySelectorAll(".performance-mode-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.performanceMode === mode);
    });

    document.querySelectorAll(".bg-video, .hero-video").forEach((video) => {
      if (mode === "eco") {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    });
  }

  document.querySelectorAll(".performance-mode-card").forEach((card) => {
    card.addEventListener("click", () =>
      applyLauncherPerformanceMode(card.dataset.performanceMode),
    );
  });

  applyLauncherPerformanceMode(state.launcherPerformanceMode);

  document
    .getElementById("btn-open-settings")
    .addEventListener("click", () => switchView("settings"));
  document
    .getElementById("btn-close-settings")
    .addEventListener("click", () => switchView("main"));
  document.getElementById("btn-open-mods").addEventListener("click", () => {
    switchView("mods");
    actions.modpacks?.mpRenderList?.();
  });
  document
    .getElementById("btn-close-mods")
    .addEventListener("click", () => switchView("main"));

  document.getElementById("btn-open-folder").addEventListener("click", () => {
    if (window.electronAPI) {
      window.electronAPI.openMinecraftFolder();
    } else {
      alert("This feature is only available in the desktop app.");
    }
  });

  document
    .getElementById("btn-check-launcher-updates")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-check-launcher-updates");
      const originalText = btn.innerText;
      btn.innerText = "Checking...";
      btn.disabled = true;

      try {
        if (window.electronAPI?.checkForUpdates) {
          const result = await window.electronAPI.checkForUpdates();
          if (result.updateAvailable) {
            actions.showWarningToast(
              `Update available: ${result.latestVersion}`,
            );
            if (
              confirm(
                `A new version (${result.latestVersion}) is available. Open the release page?`,
              )
            ) {
              window.electronAPI.openExternal(result.releaseUrl);
            }
          } else {
            actions.showWarningToast("You are running the latest version!");
          }
        }
      } catch (e) {
        console.error("Failed to check for updates:", e);
        actions.showWarningToast("Failed to check for updates");
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });

  document
    .getElementById("btn-toggle-devtools")
    .addEventListener("click", () => {
      if (window.electronAPI) {
        window.electronAPI.toggleDevTools();
      } else {
        alert("Debug console is only available in the desktop app.");
      }
    });
}
