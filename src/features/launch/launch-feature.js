import { state, actions } from '../../core/app-state.js';

export function initLaunchFeature() {
// --- PLAY LOGIC ---
const playBtn = document.getElementById('play-btn');
const overlay = document.getElementById('launch-overlay');
const launchStatus = document.getElementById('launch-status');
const launchFill = document.getElementById('launch-fill');

const mcFunStatuses = [
  "Waking up the Iron Golems...",
  "Feeding the Baby Turtles...",
  "Polishing Diamond Chestplates...",
  "Distracting the Creepers...",
  "Taming a pack of Wolves...",
  "Avoiding the Warden's gaze...",
  "Brewing Swiftness potions...",
  "Trading emeralds with Villagers...",
  "Mining straight down (don't!)...",
  "Spawning Herobrine...",
  "Placing redstone repeaters...",
  "Dodging skeleton arrows...",
  "Shearing pink sheep...",
  "Crafting a Netherite Hoe...",
  "Polishing smooth stone...",
  "Charging the Respawn Anchor...",
  "Watering the Nether Warts...",
  "Chasing Endermen away...",
  "Cleaning up the inventory...",
  "Smelting ancient debris...",
  "Befriending the Allays...",
  "Collecting dragon breath..."
];

let activeFunStatus = "";

function getFunStatus(status) {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes('downloading assets') || 
      s.includes('downloading file') || 
      s.includes('fetching manifest') || 
      s.includes('preparing') || 
      s.includes('asset')) {
    if (!activeFunStatus) {
      activeFunStatus = mcFunStatuses[Math.floor(Math.random() * mcFunStatuses.length)];
    }
    return activeFunStatus;
  }
  activeFunStatus = "";
  return status;
}

// Register ALL IPC listeners ONCE at startup — NOT inside click handlers.
// This is the fix for modpack play getting stuck: the listeners exist for both
// regular play AND modpack play without needing to be re-registered each time.
if (window.electronAPI) {
  window.electronAPI.onLaunchProgress((data) => {
    if (data.percent !== undefined) launchFill.style.width = `${data.percent}%`;
    if (data.status) launchStatus.innerText = getFunStatus(data.status);
  });
  window.electronAPI.onGameLaunched(() => {
    // Smart UI Offloading
    document.body.classList.add('game-running');
    document.querySelectorAll('video').forEach(v => v.pause());
    const mojangNewsGrid = document.getElementById('mojang-news-grid');
    if (mojangNewsGrid) mojangNewsGrid.innerHTML = '';
    const trendingModsGrid = document.getElementById('trending-mods-grid');
    if (trendingModsGrid) trendingModsGrid.innerHTML = '';

    // Mark the current version as downloaded since the game launched successfully
    if (!state.downloadedVersions.includes(state.selectedVersion)) {
      state.downloadedVersions.push(state.selectedVersion);
      localStorage.setItem('idk_downloaded_versions', JSON.stringify(state.downloadedVersions));
    }
    
    // Update lastPlayed timestamp for the current modpack
    const mp = actions.modpacks?.mpGet?.();
    if (mp) {
      mp.lastPlayed = new Date().toISOString();
      actions.modpacks?.mpSave?.();
      actions.modpacks?.mpRenderDetail?.();
    }
    
    launchFill.style.width = '100%';
    launchStatus.innerText = 'Game is running!';
    setTimeout(() => {
      overlay.classList.remove('active');
      playBtn.innerText = 'RUNNING';
      playBtn.classList.add('running');
      playBtn.disabled = true;
    }, 800);
  });
  window.electronAPI.onLaunchClosed(() => {
    document.body.classList.remove('game-running');
    window.dispatchEvent(new Event('reload-content'));
    playBtn.innerText = 'PLAY';
    playBtn.classList.remove('running');
    playBtn.disabled = false;
    updatePlaytime();
    updateAchievementsDisplay();
  });
  window.electronAPI.onLaunchError((error) => {
    document.getElementById('error-message').innerText = error;
    document.getElementById('error-modal').classList.add('active');
    overlay.classList.remove('active');
    playBtn.innerText = 'PLAY';
    playBtn.classList.remove('running');
    playBtn.disabled = false;
  });
  window.electronAPI.onLaunchWarning((msg) => showWarningToast(msg));

  // Missing mod dependencies detected from crash report
  if (window.electronAPI.onMissingDependencies) {
    window.electronAPI.onMissingDependencies(({ missing, mcVersion }) => {
      showMissingDepsModal(missing, mcVersion);
    });
  }
  window.electronAPI.onClearJavaPath(() => {
    localStorage.removeItem('craftlaunch_javaPath');
    state.javaPath = '';
    const javaPathInput = document.getElementById('java-path');
    if (javaPathInput) javaPathInput.value = '';
    showWarningToast('Auto-Healer: Incompatible Java version detected. Custom Java path was cleared to let the launcher auto-download Java 21!');
    overlay.classList.remove('active');
    playBtn.innerText = 'PLAY';
    playBtn.classList.remove('running');
    playBtn.disabled = false;
  });
}

playBtn.addEventListener('click', () => {
  localStorage.setItem('idk_last_played', JSON.stringify({ version: state.selectedVersion, loader: state.selectedLoader }));
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ lastPlayedVersion: state.selectedVersion, lastPlayedLoader: state.selectedLoader }).catch(console.error);
  }
  overlay.classList.add('active');
  gameStartTime = Date.now();
  launchFill.style.width = '0%';
  launchStatus.innerText = 'Initializing...';
  const authData = state.authMode === 'elyby' ? JSON.parse(localStorage.getItem('craftlaunch_elybydata') || '{}') : null;

  if (window.electronAPI) {
    const windowSize = {
      width: state.defaultWindowWidth,
      height: state.defaultWindowHeight,
      fullscreen: state.defaultFullscreen,
      enableOverlay: state.enableOverlay,
      hideLauncher: state.hideLauncher !== false
    };
    window.electronAPI.launchMinecraft(
      state.currentUser,
      state.selectedVersion,
      state.javaPath,
      state.selectedLoader,
      state.autoOptimization,
      `${state.maxMemoryGB}G`,
      authData,
      state.quickConnectTarget,
      windowSize,
      state.globalJavaArgs
    );
    state.quickConnectTarget = null; // Reset after launch
  } else {
    let progress = 0;
    const statuses = ['Fetching manifest...', 'Downloading assets...', 'Finalizing...'];
    let statusIdx = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) progress = 100;
      launchFill.style.width = `${progress}%`;
      if (progress > (statusIdx + 1) * 33 && statusIdx < statuses.length - 1) {
        statusIdx++; launchStatus.innerText = getFunStatus(statuses[statusIdx]);
      }
      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          overlay.classList.remove('active');
          playBtn.innerText = 'RUNNING'; playBtn.classList.add('running'); playBtn.disabled = true;
          setTimeout(() => { playBtn.innerText = 'PLAY'; playBtn.classList.remove('running'); playBtn.disabled = false; updatePlaytime(); }, 3000);
        }, 1000);
      }
    }, 200);
  }
});

// Modal Logic
document.getElementById('btn-close-modal').addEventListener('click', () => {
  document.getElementById('error-modal').classList.remove('active');
});

// Missing Dependencies Modal
function showMissingDepsModal(missing, mcVersion) {
  // Remove existing modal if any
  const existing = document.getElementById('missing-deps-modal');
  if (existing) existing.remove();

  const mp = actions.modpacks?.mpGet?.();
  const modpackId = mp ? mp.id : null;

  const modal = document.createElement('div');
  modal.id = 'missing-deps-modal';
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.75);z-index:9999;
    display:flex;align-items:center;justify-content:center;
  `;

  const list = missing.map(d =>
    `<li style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;">
      <strong style="color:var(--theme-accent);">${d.modId}</strong>
      <span style="color:#888;font-size:11px;margin-left:8px;">required by ${d.requiredBy}</span>
    </li>`
  ).join('');

  modal.innerHTML = `
    <div style="background:#1a1a1b;border:2px solid var(--theme-accent);border-radius:8px;padding:32px;max-width:480px;width:90%;font-family:var(--font-title);">
      <div style="text-align:center;margin-bottom:20px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="margin-bottom:12px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <h2 style="font-size:20px;color:white;margin:0 0 8px;">Missing Dependencies</h2>
        <p style="color:#888;font-size:13px;margin:0;">The game crashed because these required mods are missing:</p>
      </div>
      <ul style="list-style:none;padding:0;margin:0 0 24px;max-height:200px;overflow-y:auto;">${list}</ul>
      <div style="display:flex;gap:10px;">
        <button id="btn-auto-install-deps" style="flex:1;background:var(--theme-accent);border:none;border-radius:4px;padding:12px;color:white;font-family:var(--font-title);font-size:13px;font-weight:700;cursor:pointer;">
          Auto-Install All
        </button>
        <button id="btn-dismiss-deps" style="flex:1;background:#3a3a3b;border:none;border-radius:4px;padding:12px;color:white;font-family:var(--font-title);font-size:13px;font-weight:700;cursor:pointer;">
          Dismiss
        </button>
      </div>
      <div id="deps-install-status" style="margin-top:12px;font-size:12px;color:#888;text-align:center;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-dismiss-deps').onclick = () => modal.remove();

  document.getElementById('btn-auto-install-deps').onclick = async () => {
    if (!modpackId || !window.electronAPI) {
      document.getElementById('deps-install-status').innerText = 'Cannot auto-install: no active modpack.';
      return;
    }
    const btn = document.getElementById('btn-auto-install-deps');
    btn.disabled = true;
    btn.innerText = 'Installing...';
    const status = document.getElementById('deps-install-status');
    status.innerText = 'Searching Modrinth for dependencies...';

    try {
      const results = await window.electronAPI.autoInstallDependencies({ modpackId, missing, mcVersion });
      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Add installed mods to the modpack profile
      if (succeeded.length > 0) {
        const mp = actions.modpacks?.mpGet?.();
        if (mp) {
          succeeded.forEach(r => {
            if (!mp.mods.find(m => m.filename === r.filename)) {
              mp.mods.push({ name: r.name || r.modId, filename: r.filename, modrinthId: r.modId, version: '', iconUrl: '' });
            }
          });
          actions.modpacks?.mpSave?.();
          actions.modpacks?.mpRenderDetail?.();
          actions.modpacks?.mpRenderList?.();
        }
      }

      if (failed.length === 0) {
        status.style.color = 'var(--theme-accent)';
        status.innerText = `\u2713 Installed ${succeeded.length} dependencies. Launch the game again!`;
        btn.innerText = 'Done!';
      } else {
        status.style.color = '#f59e0b';
        status.innerText = `Installed ${succeeded.length}, failed ${failed.length}: ${failed.map(f => f.modId).join(', ')}`;
        btn.innerText = 'Partial Install';
      }
    } catch (e) {
      status.style.color = '#ef4444';
      status.innerText = 'Error: ' + e.message;
      btn.disabled = false;
      btn.innerText = 'Retry';
    }
  };
}

// Warning Toast Logic
let toastTimeout = null;
function showWarningToast(msg) {
  const toast = document.getElementById('warning-toast');
  document.getElementById('warning-toast-msg').innerText = msg;
  toast.classList.add('visible');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 6000);
}

// Playtime Tracking Logic
let gameStartTime = 0;

function updatePlaytimeDisplay() {
  const totalMs = parseInt(localStorage.getItem('idk_playtime') || '0');
  const hours = (totalMs / (1000 * 60 * 60)).toFixed(1);
  const el = document.getElementById('stat-playtime');
  if (el) el.innerText = `${hours}h`;
}

async function updateAchievementsDisplay() {
  const el = document.getElementById('stat-achievements');
  if (!el) return;
  if (window.electronAPI && window.electronAPI.scanAllAchievements) {
    try {
      const result = await window.electronAPI.scanAllAchievements();
      if (result && result.success) {
        el.innerText = result.count;
      }
    } catch (e) {
      console.error('[Achievements] Failed to fetch total achievements:', e);
    }
  }
}

// Make updatePlaytime global so it can be called inside the event listeners
window.updatePlaytime = function() {
  if (gameStartTime > 0) {
    const playedMs = Date.now() - gameStartTime;
    const totalMs = parseInt(localStorage.getItem('idk_playtime') || '0');
    const newTotalPlaytime = totalMs + playedMs;
    localStorage.setItem('idk_playtime', newTotalPlaytime);
    if (window.electronAPI) {
      window.electronAPI.saveSettings({ playtime: newTotalPlaytime }).catch(console.error);
    }
    gameStartTime = 0;
    updatePlaytimeDisplay();
  }
};

// Initial display
updatePlaytimeDisplay();
updateAchievementsDisplay();

// Background Dimming on Scroll
const viewMain = document.getElementById('view-main');
const bgSlider = document.querySelector('.background-slider');

if (viewMain && bgSlider) {
  viewMain.addEventListener('scroll', () => {
    const scroll = viewMain.scrollTop;
    const opacity = Math.max(0.5, 1.0 - (scroll / 300) * 0.5);
    bgSlider.style.opacity = opacity;
  });
}


  Object.assign(actions, {
    showWarningToast,
    beginLaunchOverlay(status = 'Initializing...') {
      overlay.classList.add('active');
      gameStartTime = Date.now();
      launchFill.style.width = '0%';
      launchStatus.innerText = status;
    },
    playGame: () => playBtn.click(),
    getPlayButton: () => playBtn,
  });
}
