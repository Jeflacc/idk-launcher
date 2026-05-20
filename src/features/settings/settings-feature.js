import { state, actions } from '../../core/app-state.js';

export function initSettingsFeature({ switchView }) {
// --- SETTINGS LOGIC ---
const javaPathInput = document.getElementById('java-path');
javaPathInput.value = state.javaPath;

javaPathInput.addEventListener('input', (e) => {
  state.javaPath = e.target.value;
  localStorage.setItem('craftlaunch_javaPath', state.javaPath);
});

// Memory slider
const memSlider = document.getElementById('memory-slider');
const memLabel  = document.getElementById('memory-value-label');

function setMemory(gb) {
  state.maxMemoryGB = gb;
  memSlider.value = gb;
  memLabel.innerText = `${gb} GB`;
  localStorage.setItem('craftlaunch_maxMemory', gb);
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

document.getElementById('btn-toggle-devtools').addEventListener('click', () => {
  if (window.electronAPI) {
    window.electronAPI.toggleDevTools();
  } else {
    alert("Debug console is only available in the desktop app.");
  }
});



}
