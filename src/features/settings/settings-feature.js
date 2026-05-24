import { state, actions } from '../../core/app-state.js';

export function initSettingsFeature({ switchView }) {
// --- SETTINGS LOGIC ---
const javaPathInput = document.getElementById('java-path');
javaPathInput.value = state.javaPath;

javaPathInput.addEventListener('input', (e) => {
  state.javaPath = e.target.value;
  localStorage.setItem('craftlaunch_javaPath', state.javaPath);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ javaPath: state.javaPath }).catch(console.error);
  }
});

// Global Java Arguments
const globalJavaArgsInput = document.getElementById('global-java-args');
globalJavaArgsInput.value = state.globalJavaArgs || '';
globalJavaArgsInput.addEventListener('input', (e) => {
  state.globalJavaArgs = e.target.value;
  localStorage.setItem('idk_global_java_args', state.globalJavaArgs);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ globalJavaArgs: state.globalJavaArgs }).catch(console.error);
  }
});

// Default Window Size
const defaultWidthInput = document.getElementById('default-window-width');
const defaultHeightInput = document.getElementById('default-window-height');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const overlayToggle = document.getElementById('overlay-toggle');

defaultWidthInput.value = state.defaultWindowWidth || 1024;
defaultHeightInput.value = state.defaultWindowHeight || 768;
fullscreenToggle.checked = state.defaultFullscreen || false;
overlayToggle.checked = state.enableOverlay || false;

defaultWidthInput.addEventListener('input', (e) => {
  state.defaultWindowWidth = parseInt(e.target.value) || 1024;
  localStorage.setItem('idk_default_window_width', state.defaultWindowWidth);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ defaultWindowWidth: state.defaultWindowWidth }).catch(console.error);
  }
});

defaultHeightInput.addEventListener('input', (e) => {
  state.defaultWindowHeight = parseInt(e.target.value) || 768;
  localStorage.setItem('idk_default_window_height', state.defaultWindowHeight);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ defaultWindowHeight: state.defaultWindowHeight }).catch(console.error);
  }
});

fullscreenToggle.addEventListener('change', (e) => {
  state.defaultFullscreen = e.target.checked;
  localStorage.setItem('idk_default_fullscreen', state.defaultFullscreen);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ defaultFullscreen: state.defaultFullscreen }).catch(console.error);
  }
});

overlayToggle.addEventListener('change', (e) => {
  state.enableOverlay = e.target.checked;
  localStorage.setItem('idk_enable_overlay', state.enableOverlay);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ enableOverlay: state.enableOverlay }).catch(console.error);
  }
});

// Hide Launcher on Launch
const hideLauncherToggle = document.getElementById('hide-launcher-toggle');
hideLauncherToggle.checked = state.hideLauncher !== false;

hideLauncherToggle.addEventListener('change', (e) => {
  state.hideLauncher = e.target.checked;
  localStorage.setItem('idk_hide_launcher', state.hideLauncher);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ hideLauncher: state.hideLauncher }).catch(console.error);
  }
});

// Memory slider
const memSlider = document.getElementById('memory-slider');
const memLabel  = document.getElementById('memory-value-label');

function setMemory(gb) {
  state.maxMemoryGB = gb;
  memSlider.value = gb;
  memLabel.innerText = `${gb} GB`;
  localStorage.setItem('craftlaunch_maxMemory', gb);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ maxMemoryGB: gb }).catch(console.error);
  }
  // Highlight active preset button
  document.querySelectorAll('.mem-preset-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.gb) === gb);
  });
}
setMemory(state.maxMemoryGB); // init from saved value

memSlider.addEventListener('input', () => setMemory(parseInt(memSlider.value)));
document.querySelectorAll('.mem-preset-btn').forEach(b => {
  b.addEventListener('click', () => setMemory(parseInt(b.dataset.gb)));
});

function applyLauncherPerformanceMode(mode) {
  state.launcherPerformanceMode = mode;
  document.body.dataset.launcherPerformance = mode;
  localStorage.setItem('idk_launcher_performance_mode', mode);
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ launcherPerformanceMode: mode }).catch(console.error);
  }

  document.querySelectorAll('.performance-mode-card').forEach(card => {
    card.classList.toggle('active', card.dataset.performanceMode === mode);
  });

  document.querySelectorAll('.bg-video, .hero-video').forEach(video => {
    if (mode === 'eco') {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  });
}

document.querySelectorAll('.performance-mode-card').forEach(card => {
  card.addEventListener('click', () => applyLauncherPerformanceMode(card.dataset.performanceMode));
});

applyLauncherPerformanceMode(state.launcherPerformanceMode);

document.getElementById('btn-open-settings').addEventListener('click', () => switchView('settings'));
document.getElementById('btn-close-settings').addEventListener('click', () => switchView('main'));
document.getElementById('btn-open-mods').addEventListener('click', () => { switchView('mods'); actions.modpacks?.mpRenderList?.(); });
document.getElementById('btn-close-mods').addEventListener('click', () => switchView('main'));

document.getElementById('btn-open-folder').addEventListener('click', () => {
  if (window.electronAPI) {
    window.electronAPI.openMinecraftFolder();
  } else {
    alert("This feature is only available in the desktop app.");
  }
});

document.getElementById('btn-check-updates').addEventListener('click', async () => {
  const btn = document.getElementById('btn-check-updates');
  const originalText = btn.innerText;
  btn.innerText = 'Checking...';
  btn.disabled = true;
  
  try {
    if (window.electronAPI?.checkForUpdates) {
      const result = await window.electronAPI.checkForUpdates();
      if (result.updateAvailable) {
        actions.showWarningToast(`Update available: ${result.latestVersion}`);
        if (confirm(`A new version (${result.latestVersion}) is available. Open the release page?`)) {
          window.electronAPI.openExternal(result.releaseUrl);
        }
      } else {
        actions.showWarningToast('You are running the latest version!');
      }
    }
  } catch (e) {
    console.error('Failed to check for updates:', e);
    actions.showWarningToast('Failed to check for updates');
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
});

document.getElementById('btn-toggle-devtools').addEventListener('click', () => {
  if (window.electronAPI) {
    window.electronAPI.toggleDevTools();
  } else {
    alert("Debug console is only available in the desktop app.");
  }
});



}
