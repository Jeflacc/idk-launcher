import { state, actions } from '../../core/app-state.js';

function updateSetupDisplay() {
  const el = document.getElementById('play-dd-setup-value');
  if (el) {
    el.textContent = `${state.selectedVersion || '—'} · ${state.selectedLoader || 'Vanilla'}`;
  }
}

function populateVersionList() {
  const list = document.getElementById('play-dd-version-list');
  if (!list) return;

  const downloadedList = (state.allVersions || []).filter(v =>
    state.downloadedVersions.includes(v.id)
  );

  if (downloadedList.length === 0) {
    list.innerHTML = `
      <div style="padding:12px 8px;text-align:center;color:rgba(255,255,255,0.5);font-size:11px;line-height:1.5;">
        No versions installed yet.<br>
        <span style="display:inline-block;margin-top:8px;padding:6px 14px;border-radius:4px;background:rgba(var(--theme-accent-rgb),0.15);color:var(--theme-accent-bright);cursor:pointer;font-family:var(--font-title);font-size:11px;letter-spacing:0.5px;" id="play-dd-go-modpacks">
          Download a Version
        </span>
      </div>
    `;
    const goBtn = document.getElementById('play-dd-go-modpacks');
    if (goBtn) {
      goBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pd = document.getElementById('play-dropdown');
        const pdt = document.getElementById('play-dropdown-trigger');
        if (pd) pd.classList.remove('active');
        if (pdt) pdt.classList.remove('active');
        if (actions.switchView) actions.switchView('mods');
      });
    }
    return;
  }

  // Show up to 8 downloaded versions (latest first)
  const sorted = [...downloadedList].sort((a, b) => {
    const idxA = state.allVersions.indexOf(a);
    const idxB = state.allVersions.indexOf(b);
    return idxA - idxB;
  }).slice(0, 8);

  function getLoaderForVersion(verId) {
    // Truth source: actual installed loader from disk scan
    if (window.__installedLoaders && window.__installedLoaders[verId]) return window.__installedLoaders[verId];
    return 'Vanilla';
  }

  list.innerHTML = '';
  sorted.forEach(v => {
    const loader = getLoaderForVersion(v.id);
    const wrapper = document.createElement('div');
    wrapper.className = 'play-dd-version-wrapper';
    wrapper.innerHTML = `
      <button class="play-dd-version-btn${v.id === state.selectedVersion ? ' active' : ''}" data-version="${v.id}">
        <span class="play-dd-version-id">${v.id}</span>
        <span class="play-dd-version-loader">${loader}</span>
      </button>
    `;
    const btn = wrapper.querySelector('.play-dd-version-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedVersion = v.id;
      const txt = document.getElementById('selected-version-text');
      if (txt) txt.textContent = `Version: ${v.id}`;
      localStorage.setItem('idk_last_played', JSON.stringify({ version: state.selectedVersion, loader: state.selectedLoader }));
      // Use the actual installed loader from disk, not user preference
      const installedLoader = (window.__installedLoaders && window.__installedLoaders[v.id]) || 'Vanilla';
      state.selectedLoader = installedLoader;
      localStorage.setItem('idk_selected_loader', state.selectedLoader);
      updateLoaderUIFromDropdown(state.selectedLoader);
      updateSetupDisplay();
      populateVersionList();
      document.getElementById('version-dropdown')?.classList.remove('open');
      if (window.electronAPI) {
        window.electronAPI.saveSettings({ lastPlayedVersion: state.selectedVersion, lastPlayedLoader: state.selectedLoader }).catch(console.error);
      }
      if (actions.updateLoaderUI) actions.updateLoaderUI(state.selectedLoader);
      if (actions.renderVersions) actions.renderVersions();
    });
    list.appendChild(wrapper);
  });
  // "More" button that opens the full version dropdown
  const moreBtn = document.createElement('button');
  moreBtn.className = 'play-dd-version-btn play-dd-version-more';
  moreBtn.textContent = 'All versions…';
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const pd = document.getElementById('play-dropdown');
    const pdt = document.getElementById('play-dropdown-trigger');
    if (pd) pd.classList.remove('active');
    if (pdt) pdt.classList.remove('active');
    if (window.showLaunchVersionPicker) {
      window.showLaunchVersionPicker();
    } else {
      // Fallback: try to open the old version-dropdown
      const versionDropdown = document.getElementById('version-dropdown');
      if (versionDropdown) {
        versionDropdown.classList.add('open');
        document.getElementById('selected-version-text')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
  list.appendChild(moreBtn);
}

// Own renderer for play-dropdown "All versions" modal — selects version for launch
function renderForLaunchVersionsModal(tab) {
  const list = document.getElementById('mp-all-version-list');
  if (!list) return;
  const filtered = (state.allVersions || []).filter(v => {
    if (tab === 'release') return v.type === 'release';
    if (tab === 'snapshot') return v.type === 'snapshot';
    if (tab === 'old') return v.type === 'old_beta' || v.type === 'old_alpha';
    return true;
  });
  list.innerHTML = '';
  filtered.forEach(v => {
    const isDownloaded = state.downloadedVersions.includes(v.id);
    const installedLoader = (window.__installedLoaders && window.__installedLoaders[v.id]) || null;
    const label = v.type === 'release' ? 'Release' : v.type === 'snapshot' ? 'Snapshot' : 'Old';
    const item = document.createElement('div');
    item.className = 'mp-version-download-item' + (isDownloaded ? ' downloaded' : '');
    if (isDownloaded) {
      item.style.cursor = 'pointer';
      item.title = 'Click to select this version for launch';
    }
    item.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px;">
        <span class="version-name">${v.id}</span>
        ${isDownloaded && installedLoader ? `<span class="mp-dl-loader-badge">${installedLoader}</span>` : ''}
        <span class="version-type">${label}</span>
      </span>
      <button class="mp-dl-btn${isDownloaded ? ' downloaded' : ''}" data-version="${v.id}">
        ${isDownloaded ? 'Use' : 'Download'}
      </button>
    `;
    const btn = item.querySelector('.mp-dl-btn');
    if (isDownloaded) {
      const handler = (e) => {
        e.stopPropagation();
        state.selectedVersion = v.id;
        const txt = document.getElementById('selected-version-text');
        if (txt) txt.textContent = `Version: ${v.id}`;
        const loader = installedLoader || 'Vanilla';
        state.selectedLoader = loader;
        localStorage.setItem('idk_last_played', JSON.stringify({ version: v.id, loader }));
        localStorage.setItem('idk_selected_loader', loader);
        if (window.electronAPI) {
          window.electronAPI.saveSettings({ lastPlayedVersion: v.id, lastPlayedLoader: loader }).catch(console.error);
        }
        if (actions.updateLoaderUI) actions.updateLoaderUI(loader);
        document.getElementById('mp-all-versions-modal')?.classList.remove('active');
      };
      btn.addEventListener('click', handler);
      item.addEventListener('click', handler);
    } else {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!window.electronAPI) return;
        btn.classList.add('downloading');
        btn.textContent = 'Downloading…';
        btn.disabled = true;
        const result = await window.electronAPI.downloadVersion({ version: v.id });
        if (result.success) {
          if (!state.downloadedVersions.includes(v.id)) {
            state.downloadedVersions.push(v.id);
            localStorage.setItem('idk_downloaded_versions', JSON.stringify(state.downloadedVersions));
          }
          btn.classList.remove('downloading');
          btn.classList.add('downloaded');
          btn.textContent = 'Use';
          btn.disabled = false;
          renderForLaunchVersionsModal(currentLaunchTab);
        } else {
          btn.classList.remove('downloading');
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Download'; btn.disabled = false; }, 2000);
        }
      });
    }
    list.appendChild(item);
  });
}
let currentLaunchTab = 'release';
window.showLaunchVersionPicker = () => {
  document.getElementById('mp-all-versions-modal')?.classList.add('active');
  // Clone-replace tab buttons to strip modpacks-feature's event listeners
  document.querySelectorAll('#mp-all-versions-modal [data-dl-tab]').forEach(oldBtn => {
    const clone = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(clone, oldBtn);
    clone.addEventListener('click', () => {
      document.querySelectorAll('[data-dl-tab]').forEach(b => b.classList.remove('active'));
      clone.classList.add('active');
      renderForLaunchVersionsModal(clone.getAttribute('id').replace('mp-dl-tab-', ''));
    });
  });
  renderForLaunchVersionsModal('release');
};

function updateLoaderUIFromDropdown(loaderName) {
  document.querySelectorAll('.play-dd-loader-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-loader') === loaderName);
  });
}

export function initLaunchFeature() {
// --- PLAY BUTTON DROPDOWN ---
const playDropdown = document.getElementById('play-dropdown');
const playDropdownTrigger = document.getElementById('play-dropdown-trigger');

if (playDropdownTrigger && playDropdown) {
  playDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    playDropdown.classList.toggle('active');
    playDropdownTrigger.classList.toggle('active');
    if (playDropdown.classList.contains('active')) {
      updateSetupDisplay();
      populateVersionList();
      updateLoaderUIFromDropdown(state.selectedLoader);
    }
  });

  document.getElementById('play-dd-modpacks').addEventListener('click', () => {
    playDropdown.classList.remove('active');
    playDropdownTrigger.classList.remove('active');
    actions.switchView('mods');
  });

  // Loader buttons
  document.querySelectorAll('.play-dd-loader-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const loader = btn.getAttribute('data-loader');
      state.selectedLoader = loader;
      localStorage.setItem('idk_selected_loader', loader);
      if (state.selectedVersion) {
        if (!state.versionSettings[state.selectedVersion]) {
          state.versionSettings[state.selectedVersion] = {};
        }
        state.versionSettings[state.selectedVersion].loader = loader;
        localStorage.setItem('idk_version_settings', JSON.stringify(state.versionSettings));
      }
      if (window.electronAPI) {
        window.electronAPI.saveSettings({ lastPlayedLoader: loader, versionSettings: state.versionSettings }).catch(console.error);
      }
      updateLoaderUIFromDropdown(loader);
      updateSetupDisplay();
      if (actions.updateLoaderUI) actions.updateLoaderUI(loader);
    });
  });

  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('play-btn-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      playDropdown.classList.remove('active');
      playDropdownTrigger.classList.remove('active');
    }
  });
}

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
    const errMsg = typeof error === 'string' ? error : (error?.message || 'An unknown error occurred.');
    const attemptedVersion = error?.version || state.selectedVersion || 'this version';
    const attemptedLoader = error?.loader || state.selectedLoader || 'Unknown';
    overlay.classList.remove('active');
    playBtn.innerText = 'PLAY';
    playBtn.classList.remove('running');
    playBtn.disabled = false;

    // Smart loader-unavailable handling
    const loaderUnavailablePattern = /(Fabric|Forge|NeoForge|Quilt).*?(not available|No.*?builds found)/i;
    const match = errMsg.match(loaderUnavailablePattern);
    if (match) {
      document.getElementById('error-message').innerHTML = `
        <strong>${attemptedLoader}</strong> is not available for Minecraft <strong>${attemptedVersion}</strong>.<br><br>
        This version may not have a ${attemptedLoader} release. Use the dropdown to switch to a different loader or version, then try again.
      `;
      document.getElementById('error-modal').classList.add('active');
      return;
    }

    document.getElementById('error-message').innerText = errMsg;
    document.getElementById('error-modal').classList.add('active');
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
