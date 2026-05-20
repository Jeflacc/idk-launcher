import { state, actions } from '../../core/app-state.js';

export function initVersionsFeature() {
// --- VERSION DROPDOWN LOGIC ---
const versionDropdown = document.getElementById('version-dropdown');
const trigger = document.querySelector('.custom-select-trigger');
const optionsList = document.getElementById('options-list');
const selectedText = document.getElementById('selected-version-text');

const showSnapshots = document.getElementById('show-snapshots');
const showHistorical = document.getElementById('show-historical');

trigger.addEventListener('click', () => {
  versionDropdown.classList.toggle('open');
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!versionDropdown.contains(e.target)) {
    versionDropdown.classList.remove('open');
  }
  if (!loaderDropdown.contains(e.target)) {
    loaderDropdown.classList.remove('open');
  }
});

// --- LOADER DROPDOWN LOGIC ---
const loaderDropdown = document.getElementById('loader-dropdown');
const loaderTrigger = document.getElementById('loader-trigger');
const loaderText = document.getElementById('selected-loader-text');
const loaderOptions = loaderDropdown.querySelectorAll('.custom-option');

const optimizationCheckbox = document.getElementById('auto-optimization');
optimizationCheckbox.checked = state.autoOptimization;
optimizationCheckbox.addEventListener('change', (e) => {
  state.autoOptimization = e.target.checked;
  localStorage.setItem('craftlaunch_autoOptimization', String(state.autoOptimization));
});

loaderTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  loaderDropdown.classList.toggle('open');
});

function updateLoaderUI(loaderName) {
  loaderOptions.forEach(opt => {
    if (opt.getAttribute('data-loader') === loaderName) {
      opt.classList.add('selected');
      loaderText.innerHTML = opt.querySelector('span').innerHTML;
    } else {
      opt.classList.remove('selected');
    }
  });
}

loaderOptions.forEach(opt => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    state.selectedLoader = opt.getAttribute('data-loader');
    localStorage.setItem('idk_selected_loader', state.selectedLoader);
    updateLoaderUI(state.selectedLoader);
    loaderDropdown.classList.remove('open');
  });
});

// Restore loader from localStorage on startup
const savedLoader = localStorage.getItem('idk_selected_loader');
if (savedLoader) {
  state.selectedLoader = savedLoader;
}

updateLoaderUI(state.selectedLoader);

state.sodiumSupportedVersions = new Set();
state.downloadedVersions = [];
let currentVersionTab = 'all'; // 'all' or 'downloaded'

// Scan the versions directory to detect downloaded versions
async function scanDownloadedVersions() {
  try {
    console.log('[Versions] Starting scan for downloaded versions...');
    
    const result = await window.electronAPI?.scanDownloadedVersions?.();
    if (!result || !result.success) {
      console.warn('[Versions] Failed to scan downloaded versions:', result?.error);
      return;
    }
    
    state.downloadedVersions = result.versions || [];
    console.log(`[Versions] Scanned ${state.downloadedVersions.length} downloaded versions:`, state.downloadedVersions);
    
    // Re-render versions if they're already loaded
    if (state.allVersions && state.allVersions.length > 0) {
      renderVersions();
    }
  } catch (e) {
    console.warn('[Versions] Failed to scan downloaded versions:', e);
  }
}

// Scan on startup
scanDownloadedVersions();

async function fetchSodiumVersions() {
  try {
    const loaders = encodeURIComponent(JSON.stringify(['fabric']));
    const res = await fetch(`https://api.modrinth.com/v2/project/sodium/version?loaders=${loaders}`);
    const data = await res.json();
    data.forEach(entry => {
      entry.game_versions.forEach(gv => state.sodiumSupportedVersions.add(gv));
    });
  } catch (e) {
    console.warn('Could not fetch Sodium version list:', e);
  }
}

async function fetchVersions() {
  try {
    const [mojangRes] = await Promise.all([
      fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json'),
      fetchSodiumVersions()
    ]);
    const data = await mojangRes.json();
    state.allVersions = data.versions;
    if (!state.selectedVersion) state.selectedVersion = data.latest.release;
    renderVersions();
  } catch (err) {
    selectedText.innerText = "1.20.4 (Offline)";
  }
}

function renderVersions() {
  const allowSnap = showSnapshots.checked;
  const allowHist = showHistorical.checked;
  
  optionsList.innerHTML = '';
  
  let filtered = state.allVersions.filter(v => {
    if (v.type === 'release') return true;
    if (v.type === 'snapshot' && allowSnap) return true;
    if ((v.type === 'old_beta' || v.type === 'old_alpha') && allowHist) return true;
    return false;
  });
  
  // Filter to downloaded versions if that tab is active
  if (currentVersionTab === 'downloaded') {
    filtered = filtered.filter(v => state.downloadedVersions.includes(v.id));
  }
  
  filtered.forEach(v => {
    const el = document.createElement('div');
    el.className = 'custom-option';
    if (v.id === state.selectedVersion) el.classList.add('selected');
    
    // Add downloaded class if version is downloaded
    if (state.downloadedVersions.includes(v.id)) {
      el.classList.add('version-downloaded');
    }
    
    let label = 'Release';
    if (v.type === 'snapshot') label = 'Snapshot';
    else if (v.type !== 'release') label = 'Old';

    const hasSodium = state.sodiumSupportedVersions.has(v.id);
    const sodiumBadge = hasSodium
      ? `<span class="sodium-badge">
           <img src="./sodium.png" alt="Sodium" />
           <span class="sodium-label">Sodium</span>
         </span>`
      : '';
    
    // Add downloaded badge if version is downloaded
    const downloadedBadge = state.downloadedVersions.includes(v.id)
      ? `<span class="downloaded-badge" title="Downloaded">✓</span>`
      : '';

    el.innerHTML = `
      <span>${v.id}</span>
      <span style="display:flex;align-items:center;gap:6px;">
        ${downloadedBadge}
        ${sodiumBadge}
        <span class="option-type">${label}</span>
      </span>
    `;
    
    el.addEventListener('click', () => {
      state.selectedVersion = v.id;
      selectedText.innerText = `Version: ${v.id}`;
      versionDropdown.classList.remove('open');
      renderVersions(); // Re-render to update 'selected' class
    });
    
    optionsList.appendChild(el);
  });
  
  selectedText.innerText = `Version: ${state.selectedVersion}`;
}

showSnapshots.addEventListener('change', renderVersions);
showHistorical.addEventListener('change', renderVersions);

// Version tab switching
const versionTabs = document.querySelectorAll('.version-tab');
versionTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.stopPropagation();
    versionTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentVersionTab = tab.getAttribute('data-tab');
    renderVersions();
  });
});

fetchVersions();

// Refresh versions button handler - use setTimeout to ensure DOM is ready
setTimeout(() => {
  const refreshBtn = document.getElementById('btn-refresh-versions');
  if (refreshBtn) {
    console.log('[Versions] Refresh button found, attaching handler');
    refreshBtn.addEventListener('click', async () => {
      console.log('[Versions] Refresh button clicked');
      refreshBtn.classList.add('loading');
      await scanDownloadedVersions();
      refreshBtn.classList.remove('loading');
    });
  } else {
    console.warn('[Versions] Refresh button not found in DOM');
  }
}, 100);


  Object.assign(actions, { renderVersions, updateLoaderUI });
}
