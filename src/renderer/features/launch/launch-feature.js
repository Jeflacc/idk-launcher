import { state, actions } from '../../core/app-state.js';
import { loadTemplate } from '../../core/html-loader.js';
import { showRenderEngineDialog } from "../../components/render-dialog.js";

function updateSetupDisplay() {
  const el = document.getElementById('play-dd-setup-value');
  let statusText = `${state.selectedVersion || '—'} · ${state.selectedLoader || 'Vanilla'}`;
  
  if (state.selectedIsModpack) {
    const mp = (state.modpacks).find(m => m.id === state.selectedModpackId);
    if (mp) statusText = mp.name;
  }
  
  if (el) {
    el.textContent = statusText;
  }
  
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.setAttribute('data-status', `Ready to play ${statusText}`);
  }
}

function populateVersionList() {
  const list = document.getElementById('play-dd-version-list');
  if (!list) return;

  const downloadedList = (state.allVersions || []).filter(v =>
    state.downloadedVersions.includes(v.id)
  );

  if (downloadedList.length === 0) {
    const tpl = loadTemplate("play-dd-empty-template");
    if (tpl) {
      const node = tpl.clone();
      const goBtn = node.goBtn;
      goBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pd = document.getElementById("play-dropdown");
        const pdt = document.getElementById("play-dropdown-trigger");
        if (pd) pd.classList.remove("active");
        if (pdt) pdt.classList.remove("active");
        if (actions.switchView) actions.switchView("mods");
      });
      list.replaceChildren(node.root);
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
      <button class="play-dd-version-btn${v.id === state.selectedVersion && !state.selectedIsModpack ? ' active' : ''}" data-version="${v.id}">
        <span class="play-dd-version-id">${v.id}</span>
        <span class="play-dd-version-loader">${loader}</span>
      </button>
    `;
    const btn = wrapper.querySelector('.play-dd-version-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedIsModpack = false;
      state.selectedModpackId = null;
      localStorage.setItem('idk_last_played_is_modpack', 'false');
      
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
  const query = (document.getElementById('mp-dl-search')?.value || '').trim().toLowerCase();
  const filtered = (state.allVersions || []).filter(v => {
    if (tab === 'release') return v.type === 'release';
    if (tab === 'snapshot') return v.type === 'snapshot';
    if (tab === 'old') return v.type === 'old_beta' || v.type === 'old_alpha';
    return true;
  }).filter(v => !query || v.id.toLowerCase().includes(query));
  list.innerHTML = '';
  filtered.forEach(v => {
    const isDownloaded = state.downloadedVersions.includes(v.id);
    const installedLoader = (window.__installedLoaders && window.__installedLoaders[v.id]) || null;
    const isSelected = !state.selectedIsModpack && v.id === state.selectedVersion;
    const label = v.type === 'release' ? 'Release' : v.type === 'snapshot' ? 'Snapshot' : 'Old';
    const item = document.createElement('div');
    item.className = 'mp-version-download-item' + (isDownloaded ? ' downloaded' : '') + (isSelected ? ' selected' : '');
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
      <button type="button" class="mp-dl-btn${isDownloaded ? ' downloaded' : ''}" data-version="${v.id}">
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
      const startDownload = async (e) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        if (!window.electronAPI?.downloadVersion) {
          console.warn('[Launch] downloadVersion API is unavailable');
          return;
        }
        document.getElementById('mp-all-versions-modal')?.classList.remove('active');
        const panelShow = window.showDownloadPanel || window.showDlPanel;
        const panelUpdate = window.updateDownloadPanel || window.updateDlPanel;
        const panelHide = window.hideDownloadPanel || window.hideDlPanel;
        panelShow?.(`Downloading ${v.id}...`, 5, 'Downloading Minecraft Version');
        btn.classList.add('downloading');
        btn.textContent = 'Downloading...';
        btn.disabled = true;
        const progressHandler = (data) => {
          const payload = data?.downloadId ? data : (data || {});
          panelUpdate?.(
            payload.status || `Downloading ${v.id}...`,
            Number.isFinite(payload.percent) ? payload.percent : 5,
            payload.speed,
            payload.eta,
            payload.item || v.id
          );
        };
        const removeProgress = window.electronAPI.onDownloadProgress?.(progressHandler);
        
        let cancelled = false;
        window.onDownloadPanelCancel = () => {
          cancelled = true;
          window.electronAPI?.cancelVersionDownload?.({ version: v.id });
        };

        try {
          const loader = (state.selectedLoader || 'Vanilla').toLowerCase();
          const result = await window.electronAPI.downloadVersion({ version: v.id, loader });
          if (cancelled || (result && result.error && result.error.includes('cancelled'))) {
             throw new Error('Download cancelled');
          }
          if (!result) throw new Error(`Failed to download Minecraft ${v.id}`);
          if (!state.downloadedVersions.includes(v.id)) {
            state.downloadedVersions.push(v.id);
            localStorage.setItem('idk_downloaded_versions', JSON.stringify(state.downloadedVersions));
          }
          btn.classList.remove('downloading');
          btn.classList.add('downloaded');
          btn.textContent = 'Use';
          btn.disabled = false;
          panelHide?.();
          renderForLaunchVersionsModal(currentLaunchTab);
        } catch (err) {
          console.error('[Launch] Version download failed:', err);
          btn.classList.remove('downloading');
          btn.textContent = err.message.includes('cancelled') ? 'Cancelled' : 'Failed';
          panelHide?.();
          setTimeout(() => { btn.textContent = 'Download'; btn.disabled = false; }, 2000);
        } finally {
          window.onDownloadPanelCancel = null;
          removeProgress?.();
        }
      };
      btn.addEventListener('click', startDownload);
      item.addEventListener('click', startDownload);
    }
    list.appendChild(item);
  });
}
let currentLaunchTab = 'release';
window.showLaunchVersionPicker = () => {
  window.__dlModalOwner = 'launch';
  currentLaunchTab = 'release';
  document.getElementById('mp-all-versions-modal')?.classList.add('active');
  // Clone-replace tab buttons to strip modpacks-feature's event listeners
  document.querySelectorAll('#mp-all-versions-modal [data-dl-tab]').forEach(oldBtn => {
    const clone = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(clone, oldBtn);
    clone.addEventListener('click', () => {
      document.querySelectorAll('[data-dl-tab]').forEach(b => b.classList.remove('active'));
      clone.classList.add('active');
      currentLaunchTab = clone.getAttribute('id').replace('mp-dl-tab-', '');
      renderForLaunchVersionsModal(currentLaunchTab);
    });
  });
  renderForLaunchVersionsModal('release');
};

function updateLoaderUIFromDropdown(loaderName) {
  document.querySelectorAll('.play-dd-loader-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-loader') === loaderName);
  });
}

function initLaunchVersionPickerSearch() {
  const dlSearchInput = document.getElementById('mp-dl-search');
  if (!dlSearchInput) return;
  dlSearchInput.addEventListener('input', () => {
    if (window.__dlModalOwner !== 'launch') return;
    renderForLaunchVersionsModal(currentLaunchTab);
  });
}

export function initLaunchFeature() {
initLaunchVersionPickerSearch();
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

  // --- FOLDER OPENING ---
  function closePlayDropdown() {
    playDropdown.classList.remove('active');
    playDropdownTrigger.classList.remove('active');
  }

  async function openFolderFor(action) {
    const api = window.electronAPI;
    if (!api) return;

    if (action === 'root') {
      api.openMinecraftFolder();
      return;
    }

    let dir = null;

    if (state.selectedIsModpack && state.selectedModpackId) {
      const mp = state.modpacks.find((m) => m.id === state.selectedModpackId);
      if (mp?.directory) {
        dir = mp.directory;
      }
    } else if (state.selectedVersion) {
      const prof = state.modpacks.find((mp) => mp.id === state.selectedVersion);
      if (prof?.directory) {
        dir = prof.directory;
      } else {
        const result = await api.ensureInstance(state.selectedVersion);
        if (result.directory) dir = result.directory;
      }
    }

    if (!dir) {
      api.openMinecraftFolder();
      return;
    }

    if (action === 'version') {
      await api.openPath(dir);
    } else if (action === 'mods') {
      await api.openPath(dir + '\\mods');
    }
  }

  // Advanced-UI dropdown folder items (v1 layout never added the buttons —
  // they now live in the advanced dropdown panel).
  document.querySelectorAll('#play-dropdown [data-folder-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      closePlayDropdown();
      await openFolderFor(btn.getAttribute('data-folder-action'));
    });
  });

  // Normal-UX hover folder menu: hidden by default, revealed when hovering the
  // play-button cluster (.play-container) or the menu itself. Scoped to the
  // container — no listeners on the document-level hover.
  const folderMenu = document.getElementById('play-folder-menu');
  const folderTrigger = document.getElementById('play-folder-trigger');
  if (folderMenu && folderTrigger) {
    let hoverTimer = null;

    const openFolderMenu = () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      folderMenu.classList.add('open');
      folderTrigger.setAttribute('aria-expanded', 'true');
    };
    const closeFolderMenu = () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      folderMenu.classList.remove('open');
      folderTrigger.setAttribute('aria-expanded', 'false');
    };

    folderTrigger.addEventListener('mouseenter', openFolderMenu);
    folderMenu.addEventListener('mouseleave', () => {
      hoverTimer = setTimeout(closeFolderMenu, 120);
    });
    // Keep the menu open while moving from trigger into the panel.
    folderMenu.addEventListener('mouseenter', () => {
      if (hoverTimer) clearTimeout(hoverTimer);
    });

    folderTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      folderMenu.classList.contains('open') ? closeFolderMenu() : openFolderMenu();
    });

    folderMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.play-folder-item');
      if (!item) return;
      e.stopPropagation();
      closeFolderMenu();
      openFolderFor(item.getAttribute('data-action'));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFolderMenu();
    });

    document.addEventListener('click', (e) => {
      if (!folderMenu.contains(e.target)) closeFolderMenu();
    });
  }

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
const cancelLaunchBtn = document.getElementById('btn-cancel-launch');

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
    // Backend sends { type, phase, completed, total, currentFile, message }
    // Calculate percent from completed/total
    const percent = data.percent !== undefined
      ? data.percent
      : (data.total > 0 ? Math.round((data.completed / data.total) * 100) : undefined);

    if (percent !== undefined) launchFill.style.width = `${percent}%`;

    // Generate status text from type/phase or legacy status field
    let text = "";
    const status = data.status || (data.type ? `${data.type} ${data.phase || ''}`.trim() : '');
    if (status && status.toLowerCase().includes('downloading')) {
      text = percent !== undefined ? `${status} (${percent}%)` : status;
    } else if (data.message) {
      text = getFunStatus(data.message);
      if (percent !== undefined) text = `${text} (${percent}%)`;
    } else if (status) {
      text = getFunStatus(status);
      if (percent !== undefined) text = `${text} (${percent}%)`;
    }

    if (text) {
      launchStatus.innerText = text;
      setMiniText(text);
    }
  });
  window.electronAPI.onGameLaunched(() => {
    // Smart UI Offloading
    document.body.classList.add('game-running');
    gameStartTime = Date.now();
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
    // Hide the mini-indicator — the game is now running independently.
    if (miniIndicator) miniIndicator.classList.remove('visible');
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.classList.remove('minimized');
      playBtn.innerText = 'RUNNING';
      playBtn.classList.add('running');
      playBtn.disabled = true;
    }, 800);
  });
  window.electronAPI.onLaunchClosed((data) => {
    document.body.classList.remove('game-running');
    window.dispatchEvent(new Event('reload-content'));
    // Always dismiss the launch overlay regardless of which play button
    // initiated the launch (main page or modpack page).
    if (overlay) {
      overlay.classList.remove('active');
      overlay.classList.remove('minimized');
    }
    if (miniIndicator) miniIndicator.classList.remove('visible');
    if (playBtn) {
      playBtn.innerText = 'PLAY';
      playBtn.classList.remove('running');
      playBtn.disabled = false;
    }
    const mpPlayBtn = document.getElementById('btn-play-modpack');
    if (mpPlayBtn) {
      mpPlayBtn.innerText = 'PLAY';
      mpPlayBtn.classList.remove('running');
      mpPlayBtn.disabled = false;
    }

    // Crash / quick-exit detection
    const code = data?.code;
    const output = data?.output || '';
    const elapsed = gameStartTime ? (Date.now() - gameStartTime) / 1000 : Infinity;
    gameStartTime = 0;
    if (code !== undefined && code !== null && code !== 0) {
      const isQuickExit = elapsed < 15;
      const header = isQuickExit
        ? 'Game exited unexpectedly right after launch.'
        : `Game exited with code ${code}.`;
      const hint = output
        ? `\n\nLast output:\n${output.slice(-800)}`
        : '';
      showWarningToast(header + hint);
    } else if (output && /Exception|FATAL|Error:/.test(output) && elapsed < 15) {
      showWarningToast('Game crashed shortly after launch. Check the logs for details.');
    }

    updatePlaytime();
    updateAchievementsDisplay();
  });
  // Store the last launch error so it can be re-shown
  let lastLaunchError = null;

  function humanizeError(msg) {
    if (!msg) return 'An unknown error occurred.';
    // Java / Adoptium errors
    if (/adoptium|jre|java.*download/i.test(msg)) return 'Failed to download Java runtime. Please check your internet connection and try again.';
    if (/No.*JRE found/i.test(msg)) return 'No compatible Java runtime found for this Minecraft version. Please install Java manually and set the path in Settings.';
    // Network errors
    if (/ENOTFOUND|getaddrinfo|ETIMEDOUT/i.test(msg)) return 'Network error — please check your internet connection.';
    if (/fetch failed|network/i.test(msg)) return 'Network error — please check your internet connection and try again.';
    // HTTP errors
    const httpMatch = msg.match(/HTTP\s*(\d+)/i);
    if (httpMatch) {
      const code = parseInt(httpMatch[1], 10);
      if (code === 404) return 'A required resource was not found. This may be a temporary server issue — please try again later.';
      if (code === 403) return 'Access denied by server. Please try again later.';
      if (code >= 500) return 'Server error. Please try again later.';
      return `HTTP error ${code} — please try again.`;
    }
    if (msg.startsWith('HTTP')) return 'Network error — please check your internet connection and try again.';
    // Already-friendly messages (from our own code) pass through
    if (msg.length < 120 && !/[{]/.test(msg)) return msg;
    return 'Launch failed. Please check your internet connection and Java installation, then try again.';
  }

  function showErrorModal(msg) {
    const humanMsg = humanizeError(msg);
    document.getElementById('error-message').innerText = humanMsg;
    document.getElementById('error-modal').classList.add('active');
    lastLaunchError = { raw: msg, human: humanMsg };
    console.error('[Launch Error]', msg);
  }

  window.electronAPI.onLaunchError((error) => {
    const errMsg = typeof error === 'string' ? error : (error?.message || 'An unknown error occurred.');
    const attemptedVersion = error?.version || state.selectedVersion || 'this version';
    const attemptedLoader = error?.loader || state.selectedLoader || 'Unknown';
    if (overlay) {
      overlay.classList.remove('active');
      overlay.classList.remove('minimized');
    }
    if (miniIndicator) miniIndicator.classList.remove('visible');
    if (playBtn) {
      playBtn.innerText = 'PLAY';
      playBtn.classList.remove('running');
      playBtn.disabled = false;
    }
    const mpPlayBtn = document.getElementById('btn-play-modpack');
    if (mpPlayBtn) {
      mpPlayBtn.innerText = 'PLAY';
      mpPlayBtn.classList.remove('running');
      mpPlayBtn.disabled = false;
    }

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

    showErrorModal(errMsg);
  });
  window.electronAPI.onLaunchWarning((msg) => {
    const text = typeof msg === 'string' ? msg : (msg?.message || String(msg));
    showWarningToast(text);
  });

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

if (cancelLaunchBtn && window.electronAPI) {
  cancelLaunchBtn.addEventListener('click', () => {
    window.electronAPI.cancelLaunch?.();
    overlay.classList.remove('active');
    overlay.classList.remove('minimized');
    playBtn.innerText = 'PLAY';
    playBtn.classList.remove('running');
    playBtn.disabled = false;
  });
}

// --- Minimize / restore the launch overlay ---
// When minimized, the full overlay (backdrop + card) is completely
// hidden via display:none, and a small floating "launch-mini-indicator"
// pill is shown at bottom-right. Clicking the pill restores the full
// overlay. Clicking the X on the pill dismisses the indicator only
// (the launch continues in the background).
const minimizeLaunchBtn = document.getElementById('btn-minimize-launch');
const restoreLaunchBtn = document.getElementById('btn-restore-launch');
const miniIndicator = document.getElementById('launch-mini-indicator');
const miniText = document.getElementById('launch-mini-text');
const miniClose = document.getElementById('btn-mini-close');
let miniIndicatorDismissed = false;

function setLaunchMinimized(minimized) {
  if (!overlay) return;
  overlay.classList.toggle('minimized', !!minimized);
  if (minimizeLaunchBtn) minimizeLaunchBtn.style.display = minimized ? 'none' : '';
  if (restoreLaunchBtn) restoreLaunchBtn.style.display = minimized ? '' : 'none';
  if (miniIndicator && !miniIndicatorDismissed) {
    miniIndicator.classList.toggle('visible', !!minimized);
  }
}
function setMiniText(text) {
  if (miniText) miniText.textContent = text;
}
if (minimizeLaunchBtn) minimizeLaunchBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  miniIndicatorDismissed = false;
  setLaunchMinimized(true);
});
if (restoreLaunchBtn) restoreLaunchBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setLaunchMinimized(false);
});
// Clicking the mini-indicator pill restores the full overlay.
if (miniIndicator) {
  miniIndicator.addEventListener('click', (e) => {
    if (e.target.closest('#btn-mini-close')) return;
    setLaunchMinimized(false);
  });
  miniIndicator.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setLaunchMinimized(false);
    }
  });
}
// X button on the mini-indicator: dismiss the indicator only
// (launch keeps running in the background, no visible UI).
if (miniClose) {
  miniClose.addEventListener('click', (e) => {
    e.stopPropagation();
    miniIndicatorDismissed = true;
    miniIndicator.classList.remove('visible');
  });
}

playBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  // Gate: launching requires an active account. If none, open the offline
  // account form on the current page (TLauncher style — stay on home page).
  if (!state.activeAccountId && !state.currentUser) {
    const { showConfirmDialog } = await import("../../components/confirm-dialog.js");
    const goLogin = await showConfirmDialog({
      title: "No account selected",
      message: "You need to add or select an account before launching the game.",
      confirmText: "Add Account",
      cancelText: "Cancel",
      variant: "neutral",
    });
    if (goLogin) {
      // Open the offline account form on the home page — do not switch views.
      const btnOfflineLogin = document.getElementById("btn-offline-login");
      if (btnOfflineLogin) btnOfflineLogin.click();
      setTimeout(() => document.getElementById("login-username")?.focus(), 100);
    }
    return;
  }
  if (overlay?.classList.contains('active') && !overlay.classList.contains('minimized')) {
    return;
  }
  localStorage.setItem('idk_last_played', JSON.stringify({ version: state.selectedVersion, loader: state.selectedLoader }));
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ lastPlayedVersion: state.selectedVersion, lastPlayedLoader: state.selectedLoader }).catch(console.error);
  }
  overlay.classList.remove('minimized');
  overlay.classList.add('active');
  gameStartTime = Date.now();
  launchFill.style.width = '0%';
  launchStatus.innerText = 'Initializing...';
  let authData = null;
  try {
    if (state.authMode === 'elyby' && window.electronAPI?.getElybyAuthData) {
      authData = await window.electronAPI.getElybyAuthData();
    } else if (state.authMode === 'microsoft' && window.electronAPI?.getMicrosoftAuthData) {
      authData = await window.electronAPI.getMicrosoftAuthData();
    }
  } catch (e) {
    console.warn('[Launch] Auth retrieval failed:', e);
  }

  if (!state.selectedIsModpack && state.selectedVersion && window.electronAPI?.ensureInstance) {
    try {
      await window.electronAPI.ensureInstance(state.selectedVersion);
    } catch (e) {
      console.warn('[Launch] Failed to ensure instance:', e);
    }
  }

  if (window.electronAPI) {
    const windowSize = {
      width: state.defaultWindowWidth,
      height: state.defaultWindowHeight,
      fullscreen: state.defaultFullscreen,
      enableOverlay: state.enableOverlay,
      hideLauncher: state.hideLauncher === true
    };

    if (state.selectedIsModpack && state.selectedModpackId) {
      const modpacks = state.modpacks;
      const mp = modpacks.find(m => m.id === state.selectedModpackId);
      if (mp) {
        const fallbackVersion = state.downloadedVersions?.[0] || state.selectedVersion || "1.20.1";
        const resolvedModpackVersion = mp.mcVersion ? mp.mcVersion : (state.versionSettings?.[mp.id]?.mcVersion || fallbackVersion);
        const versionSettings = state.versionSettings?.[mp.id] || {};
        
        window.electronAPI.launchModpack({
          username: state.currentUser,
          modpackId: mp.id,
          modpackName: mp.name,
          mcVersion: resolvedModpackVersion,
          loader: versionSettings.loader || mp.loader,
          loaderVersion: mp.loaderVersion || "",
          javaPath: state.javaPath,
          maxMemory: `${state.maxMemoryGB}G`,
          authData,
          windowSize,
          globalJavaArgs: state.globalJavaArgs,
          quickConnect: state.quickConnectTarget,
          forceUpdate: state.forceUpdate
        });
        state.quickConnectTarget = null;
        return;
      }
    }

    const hideRenderPopup = state.hideRenderPopup === true;
    if (!hideRenderPopup) {
      const selection = await showRenderEngineDialog();
      if (!selection) {
        // Cancelled launch
        overlay.classList.remove('active');
        playBtn.innerText = 'PLAY';
        playBtn.disabled = false;
        return;
      }
      
      state.performanceRenderer = selection.renderer;
      
      if (selection.dontShowAgain) {
        state.hideRenderPopup = true;
        localStorage.setItem('craftlaunch_hideRenderPopup', 'true');
      }
      
      // Persist to backend settings (including hideRenderPopup)
      if (window.electronAPI && window.electronAPI.saveSettings) {
        const settingsToSave = { performanceRenderer: selection.renderer };
        if (selection.dontShowAgain) {
          settingsToSave.hideRenderPopup = true;
        }
        window.electronAPI.saveSettings(settingsToSave).catch(() => {});
      }
      
      // Update the UI dropdown if it exists
      const classicRenderer = document.getElementById('performance-renderer');
      if (classicRenderer) classicRenderer.value = selection.renderer;
    }

    window.electronAPI.launchMinecraft(
      state.currentUser,
      state.selectedVersion,
      state.javaPath,
      state.selectedLoader,
      state.autoOptimization,
      state.performanceRenderer,
      `${state.maxMemoryGB}G`,
      authData,
      state.quickConnectTarget,
      windowSize,
      state.globalJavaArgs,
      state.forceUpdate
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
  const modal = document.getElementById('missing-deps-modal');
  const listEl = document.getElementById('missing-deps-list');
  if (!modal || !listEl) {
    console.warn('[launch] missing-deps-modal markup missing');
    return;
  }

  const mp = actions.modpacks?.mpGet?.();
  const modpackId = mp ? mp.id : null;

  listEl.replaceChildren();
  for (const d of missing) {
    const li = document.createElement('li');
    li.style.cssText =
      'padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;';
    const strong = document.createElement('strong');
    strong.style.color = 'var(--theme-accent)';
    strong.textContent = d.modId;
    const span = document.createElement('span');
    span.style.cssText = 'color:#888;font-size:11px;margin-left:8px;';
    span.textContent = `required by ${d.requiredBy}`;
    li.append(strong, span);
    listEl.append(li);
  }

  const status = document.getElementById('deps-install-status');
  if (status) status.innerText = '';
  modal.style.display = 'flex';

  document.getElementById('btn-dismiss-deps').onclick = () => {
    modal.style.display = 'none';
  };

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
  const el = document.getElementById('profile-stat-playtime');
  if (el) el.innerText = `${hours}h`;
}

async function updateAchievementsDisplay() {
  const el = document.getElementById('profile-stat-achievements');
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
      overlay.classList.remove('minimized');
      overlay.classList.add('active');
      gameStartTime = Date.now();
      launchFill.style.width = '0%';
      launchStatus.innerText = status;
      if (minimizeLaunchBtn) minimizeLaunchBtn.style.display = '';
      if (restoreLaunchBtn) restoreLaunchBtn.style.display = 'none';
    },
    playGame: () => playBtn.click(),
    getPlayButton: () => playBtn,
  });
}
