import './style.css';

document.querySelector('#app').innerHTML = `
  <div class="background-slider">
    <video autoplay muted loop playsinline class="bg-video">
      <source src="./background.mp4" type="video/mp4">
    </video>
  </div>
  <div class="bg-overlay"></div>

  <div class="top-bar">
    <div class="top-brand">IDK<span>.</span></div>
    <div class="window-controls">
      <div class="ctrl minimize">_</div>
      <div class="ctrl maximize">□</div>
      <div class="ctrl close">✕</div>
    </div>
  </div>

  <!-- LOGIN VIEW -->
  <div id="view-login" class="view active">
    <div class="login-box">
      <h2>Welcome Back</h2>
      <p style="color: var(--text-muted); margin-bottom: 10px;">Select your login method to enter the launcher.</p>
      
      <div class="login-btn microsoft" id="btn-elyby-login">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Ely.by Account
      </div>
      
      <div class="login-btn offline" id="btn-offline-login">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Offline Account
      </div>

      <div class="offline-form" id="offline-form">
        <input type="text" class="clean-input" id="login-username" placeholder="Enter username..." />
        <button class="submit-btn" id="btn-submit-login">Enter Launcher</button>
      </div>

      <div class="offline-form" id="elyby-form">
        <input type="text" class="clean-input" id="elyby-username" placeholder="Ely.by Username or Email" />
        <input type="password" class="clean-input" id="elyby-password" placeholder="Password" style="margin-top: 10px;" />
        <button class="submit-btn" id="btn-submit-elyby" style="margin-top: 10px;">Login via Ely.by</button>
      </div>
    </div>
  </div>

  <!-- MAIN VIEW -->
  <div id="view-main" class="view">
    <div class="main-center">
      <img src="./java.png" alt="Minecraft Java Edition" class="mc-logo" />
    </div>

    <div class="bottom-bar">
      <div class="controls-left">
        <div class="user-profile" id="user-profile-btn">
          <div class="user-avatar">
            <img src="https://crafatar.com/avatars/853c80ef3c3749fdaa49938b674adae6?size=64&overlay" id="avatar-img" />
          </div>
          <div class="user-details">
            <h4 id="display-username">PlayerOne</h4>
            <p>Offline Account</p>
          </div>
        </div>
      </div>

      <div class="controls-right">
        
        <div class="custom-select-wrapper">
          <div class="custom-select" id="version-dropdown">
            <div class="custom-select-trigger">
              <span id="selected-version-text">Loading versions...</span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5 5-5"/></svg>
            </div>
            <div class="custom-options">
              <div class="options-filters">
                <label class="toggle-switch">
                  <input type="checkbox" id="show-snapshots" />
                  <div class="switch"></div>
                  Snapshots
                </label>
                <label class="toggle-switch">
                  <input type="checkbox" id="show-historical" />
                  <div class="switch"></div>
                  Historical
                </label>
              </div>
              <div class="options-list" id="options-list">
                <!-- Injected via JS -->
              </div>
            </div>
          </div>
        </div>

        <div class="custom-select-wrapper" style="width: 200px;">
          <div class="custom-select" id="loader-dropdown">
            <div class="custom-select-trigger" id="loader-trigger">
              <span id="selected-loader-text" style="display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                Vanilla
              </span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5 5-5"/></svg>
            </div>
            <div class="custom-options">
              <div class="options-list">
                <div class="custom-option selected" data-loader="Vanilla">
                  <span style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> Vanilla</span>
                </div>
                <div class="custom-option" data-loader="Forge">
                  <span style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg> Forge</span>
                </div>
                <div class="custom-option" data-loader="Fabric">
                  <span style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg> Fabric</span>
                </div>
                <div class="custom-option" data-loader="NeoForge">
                  <span style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg> NeoForge</span>
                </div>
                <div class="custom-option" data-loader="Quilt">
                  <span style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> Quilt</span>
                </div>
              </div>
            </div>
          </div>
        </div>



        <div class="settings-btn" id="btn-open-mods" title="Manage Modpacks" style="width: auto; padding: 0 16px; font-family: var(--font-title); letter-spacing: 1px; font-size: 14px;">
          MODPACKS
        </div>
        <div class="settings-btn" id="btn-open-settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </div>
        <button class="play-button" id="play-btn">PLAY</button>
      </div>
    </div>
    
    <div class="details-section">
      <div class="details-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="stat-info">
              <h4>Time Played</h4>
              <h2 id="stat-playtime">0.0h</h2>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="color: #fbbf24; background: rgba(251, 191, 36, 0.1);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
            </div>
            <div class="stat-info">
              <h4>Achievements</h4>
              <h2>14 / 85</h2>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="color: #a855f7; background: rgba(168, 85, 247, 0.1);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <div class="stat-info">
              <h4>Rank</h4>
              <h2>Diamond II</h2>
            </div>
          </div>
        </div>

        <div class="news-section">
          <h2 class="section-title">Latest News</h2>
          <div class="news-grid" id="mojang-news-grid">
            <div style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">
              Loading Mojang news...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SETTINGS VIEW -->
  <div id="view-settings" class="view">
    <div class="settings-header">
      <div class="back-btn" id="btn-close-settings">←</div>
      <h2>Settings</h2>
    </div>
    
    <div class="settings-section">
      <h3>Memory Allocation</h3>
      <p>Set how much RAM Minecraft is allowed to use. More RAM = smoother gameplay, but don't exceed ~80% of your total system RAM.</p>
      <div class="memory-slider-row">
        <input type="range" id="memory-slider" min="1" max="16" step="1" value="4" class="memory-slider" />
        <span class="memory-value-label" id="memory-value-label">4 GB</span>
      </div>
      <div class="memory-presets">
        <button class="mem-preset-btn" data-gb="2">2 GB</button>
        <button class="mem-preset-btn" data-gb="4">4 GB</button>
        <button class="mem-preset-btn" data-gb="6">6 GB</button>
        <button class="mem-preset-btn" data-gb="8">8 GB</button>
        <button class="mem-preset-btn" data-gb="12">12 GB</button>
        <button class="mem-preset-btn" data-gb="16">16 GB</button>
      </div>
    </div>

    <div class="settings-section">
      <h3>Java Executable Path</h3>
      <p>Provide the absolute path to your javaw.exe file (e.g., C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe). If left blank, the launcher will use the system default Java.</p>
      <input type="text" class="clean-input" style="text-align: left;" id="java-path" placeholder="<Use System Default>" />
    </div>

    <div class="settings-section">
      <h3>Auto Optimization</h3>
      <p>Automatically download and install Sodium (a performance mod) when launching with Fabric loader.</p>
      <label class="toggle-switch" style="margin-top: 8px;">
        <input type="checkbox" id="auto-optimization" />
        <div class="switch"></div>
        <span style="color: var(--text-main); font-size: 14px; margin-left: 4px;">Auto-install Sodium with Fabric</span>
      </label>
    </div>

    <div class="settings-section">
      <h3>Game Directory</h3>
      <p>Open the folder where your Minecraft game files, mods, and resource packs are stored.</p>
      <button class="submit-btn" id="btn-open-folder" style="width: auto; padding: 10px 20px;">Open Minecraft Folder</button>
    </div>

    <div class="settings-section">
      <h3>Developer Options</h3>
      <p>Enable the debug console (DevTools) to troubleshoot issues. This is usually only needed for debugging.</p>
      <button class="submit-btn" id="btn-toggle-devtools" style="width: auto; padding: 10px 20px; background: #4b5563;">Open Debug Console</button>
    </div>
  </div>

  <!-- MODS VIEW -->
  <div id="view-mods" class="view">
    <div class="mods-page-header">
      <div class="back-btn" id="btn-close-mods">←</div>
      <h2>Modpack Manager</h2>
      <button class="create-modpack-btn" id="btn-new-modpack">+ New Modpack</button>
    </div>
    <div class="mods-container">
      <div class="modpacks-sidebar">
        <p class="sidebar-label">YOUR MODPACKS</p>
        <div class="modpacks-list" id="modpacks-list"></div>
      </div>
      <div class="modpack-detail" id="modpack-detail">
        <div class="no-modpack-msg" id="no-modpack-msg">
          <div style="text-align:center; padding: 40px 0;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            <p style="font-size:18px; font-family:var(--font-title);">Select or create a modpack to get started</p>
          </div>
          <div class="news-section" style="padding: 0 40px;">
            <h2 class="section-title">Trending on Modrinth</h2>
            <div class="news-grid" id="trending-mods-grid">
              <div style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">Loading marketplace...</div>
            </div>
          </div>
        </div>
        <div class="modpack-content" id="modpack-content">
          <div class="modpack-content-header">
            <div><h3 id="modpack-name-display">Modpack</h3><p id="modpack-meta-display">MC 1.20.4 · Fabric</p></div>
            <div style="display:flex;gap:10px;align-items:center;">
              <button class="mp-action-btn play" id="btn-play-modpack">▶ Play</button>
              <button class="mp-action-btn delete" id="btn-delete-modpack" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button>
            </div>
          </div>
          <div class="mp-tabs">
            <button class="mp-tab active" data-tab="mods">🧩 Mods <span class="mp-tab-count" id="mod-count">0</span></button>
            <button class="mp-tab" data-tab="resourcepacks">🎨 Resource Packs <span class="mp-tab-count" id="rp-count">0</span></button>
            <button class="mp-tab" data-tab="shaders">✨ Shaders <span class="mp-tab-count" id="shader-count">0</span></button>
          </div>
          <div class="mp-tab-content active" id="tab-mods">
            <div class="mp-tab-toolbar"><button class="mp-action-btn browse" id="btn-browse-mods">+ Add Mods</button></div>
            <div class="mods-grid" id="installed-mods-list"></div>
          </div>
          <div class="mp-tab-content" id="tab-resourcepacks">
            <div class="mp-tab-toolbar"><button class="mp-action-btn browse" id="btn-browse-rp">+ Add Resource Packs</button></div>
            <div class="mods-grid" id="installed-rp-list"></div>
          </div>
          <div class="mp-tab-content" id="tab-shaders">
            <div class="mp-tab-toolbar">
              <button class="mp-action-btn browse" id="btn-browse-shaders">+ Add Shaders</button>
              <span class="shader-note">⚠ Requires Fabric + Iris Shaders mod</span>
            </div>
            <div class="mods-grid" id="installed-shaders-list"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="mod-browser" id="mod-browser">
      <div class="mod-browser-header">
        <h3 id="browser-title">Browse on Modrinth</h3>
        <button class="mod-browser-close" id="btn-close-browser">✕</button>
      </div>
      <input type="text" class="clean-input" id="mod-search" placeholder="Search..." style="margin:0 24px 16px;width:calc(100% - 48px);" />
      <div class="mod-browser-results" id="mod-browser-results"></div>
    </div>
    <div class="mp-create-modal" id="mp-create-modal">
      <div class="mp-create-box">
        <h3>New Modpack</h3>
        <input class="clean-input" id="new-mp-name" placeholder="Modpack name..." style="text-align:left;" />
        <div style="display:flex;gap:12px;">
          <select class="clean-select" id="new-mp-version"></select>
          <select class="clean-select" id="new-mp-loader"><option value="Fabric">Fabric</option><option value="Forge">Forge</option><option value="NeoForge">NeoForge</option><option value="Quilt">Quilt</option><option value="Vanilla">Vanilla</option></select>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="submit-btn" id="btn-confirm-create-mp" style="flex:1;">Create</button>
          <button class="modal-btn" id="btn-cancel-create-mp" style="flex:1;">Cancel</button>
        </div>
      </div>
    </div>
  </div>



  <!-- LAUNCH OVERLAY -->
  <div class="launch-overlay" id="launch-overlay">
    <div class="launch-spinner"></div>
    <div class="launch-status" id="launch-status">Preparing game...</div>
    <div class="launch-bar">
      <div class="launch-fill" id="launch-fill"></div>
    </div>
  </div>

  <!-- ERROR MODAL -->
  <div class="custom-modal" id="error-modal">
    <div class="modal-content">
      <div class="modal-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <h3>Launch Error</h3>
      <p id="error-message">An error occurred.</p>
      <button class="modal-btn" id="btn-close-modal">Dismiss</button>
    </div>
  </div>

  <!-- WARNING TOAST -->
  <div class="warning-toast" id="warning-toast">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    <span id="warning-toast-msg"></span>
  </div>
`;

// --- STATE & DOM ---
let currentUser = localStorage.getItem('craftlaunch_username') || '';
let authMode = localStorage.getItem('craftlaunch_authmode') || 'offline';
let lastPlayed = JSON.parse(localStorage.getItem('idk_last_played') || '{"version": null, "loader": "Vanilla"}');
let selectedVersion = lastPlayed.version;
let selectedLoader = lastPlayed.loader;
let autoOptimization = false;
let javaPath = localStorage.getItem('craftlaunch_javaPath') || '';
let maxMemoryGB = parseInt(localStorage.getItem('craftlaunch_maxMemory') || '4');
let allVersions = [];

const views = {
  login: document.getElementById('view-login'),
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  mods: document.getElementById('view-mods')
};

function switchView(viewName) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[viewName].classList.add('active');
}

// --- WINDOW CONTROLS ---
if (window.electronAPI) {
  document.querySelector('.close').addEventListener('click', () => window.electronAPI.close());
  document.querySelector('.minimize').addEventListener('click', () => window.electronAPI.minimize());
  document.querySelector('.maximize').addEventListener('click', () => window.electronAPI.maximize());
}

// --- LOGIN LOGIC ---
const btnOfflineLogin = document.getElementById('btn-offline-login');
const offlineForm = document.getElementById('offline-form');
const loginInput = document.getElementById('login-username');
const btnSubmitLogin = document.getElementById('btn-submit-login');

const btnElybyLogin = document.getElementById('btn-elyby-login');
const elybyForm = document.getElementById('elyby-form');
const elybyUserInput = document.getElementById('elyby-username');
const elybyPassInput = document.getElementById('elyby-password');
const btnSubmitElyby = document.getElementById('btn-submit-elyby');

if (currentUser) {
  // Auto-login
  updateUserDisplay(currentUser);
  switchView('main');
}

btnOfflineLogin.addEventListener('click', () => {
  elybyForm.classList.remove('open');
  offlineForm.classList.add('open');
  loginInput.focus();
});

btnElybyLogin.addEventListener('click', () => {
  offlineForm.classList.remove('open');
  elybyForm.classList.add('open');
  elybyUserInput.focus();
});

loginInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
btnSubmitLogin.addEventListener('click', login);

function login() {
  const val = loginInput.value.trim();
  if (!val) return;
  currentUser = val;
  authMode = 'offline';
  localStorage.setItem('craftlaunch_username', currentUser);
  localStorage.setItem('craftlaunch_authmode', authMode);
  updateUserDisplay(currentUser);
  switchView('main');
}

btnSubmitElyby.addEventListener('click', async () => {
  const username = elybyUserInput.value.trim();
  const password = elybyPassInput.value;
  if(!username || !password) return;
  
  btnSubmitElyby.innerText = 'Logging in...';
  try {
    let ok = false;
    let data = {};
    if (window.electronAPI && window.electronAPI.elybyAuthenticate) {
      const res = await window.electronAPI.elybyAuthenticate({ username, password, clientToken: 'idklauncher-token-' + Date.now() });
      ok = res.ok;
      data = res.data;
    } else {
      const res = await fetch('https://authserver.ely.by/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: { name: 'Minecraft', version: 1 }, username, password, clientToken: 'idklauncher-token-' + Date.now() })
      });
      data = await res.json();
      ok = res.ok;
    }

    if(ok && data.accessToken) {
      currentUser = data.selectedProfile.name;
      authMode = 'elyby';
      localStorage.setItem('craftlaunch_username', currentUser);
      localStorage.setItem('craftlaunch_authmode', authMode);
      localStorage.setItem('craftlaunch_elybydata', JSON.stringify(data));
      updateUserDisplay(currentUser);
      switchView('main');
    } else {
      alert(data.errorMessage || 'Login failed');
    }
  } catch(e) {
    alert('Network error during login.');
  }
  btnSubmitElyby.innerText = 'Login via Ely.by';
});

function updateUserDisplay(name) {
  document.getElementById('display-username').innerText = name;
  document.getElementById('display-username').nextElementSibling.innerText = authMode === 'elyby' ? 'Ely.by Account' : 'Offline Account';
  
  // Use Minotar for the launcher avatar to ensure a clean 2D face (Ely.by raw skin URLs are full 64x64 maps and 404 if no custom skin exists).
  // The actual in-game skin will still use Ely.by because of authlib-injector!
  const avatarImg = document.getElementById('avatar-img');
  avatarImg.src = `https://minotar.net/helm/${name}/64.png`;
  avatarImg.onerror = () => { avatarImg.src = 'https://minotar.net/helm/Steve/64.png'; };
}

// Logout 
document.getElementById('user-profile-btn').addEventListener('click', () => {
  if(confirm("Log out?")) {
    currentUser = '';
    localStorage.removeItem('craftlaunch_username');
    switchView('login');
  }
});

// --- SETTINGS LOGIC ---
const javaPathInput = document.getElementById('java-path');
javaPathInput.value = javaPath;

javaPathInput.addEventListener('input', (e) => {
  javaPath = e.target.value;
  localStorage.setItem('craftlaunch_javaPath', javaPath);
});

// Memory slider
const memSlider = document.getElementById('memory-slider');
const memLabel  = document.getElementById('memory-value-label');

function setMemory(gb) {
  maxMemoryGB = gb;
  memSlider.value = gb;
  memLabel.innerText = `${gb} GB`;
  localStorage.setItem('craftlaunch_maxMemory', gb);
  // Highlight active preset button
  document.querySelectorAll('.mem-preset-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.gb) === gb);
  });
}
setMemory(maxMemoryGB); // init from saved value

memSlider.addEventListener('input', () => setMemory(parseInt(memSlider.value)));
document.querySelectorAll('.mem-preset-btn').forEach(b => {
  b.addEventListener('click', () => setMemory(parseInt(b.dataset.gb)));
});

document.getElementById('btn-open-settings').addEventListener('click', () => switchView('settings'));
document.getElementById('btn-close-settings').addEventListener('click', () => switchView('main'));
document.getElementById('btn-open-mods').addEventListener('click', () => { switchView('mods'); mpRenderList(); });
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
optimizationCheckbox.addEventListener('change', (e) => { autoOptimization = e.target.checked; });

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
    selectedLoader = opt.getAttribute('data-loader');
    updateLoaderUI(selectedLoader);
    loaderDropdown.classList.remove('open');
  });
});

updateLoaderUI(selectedLoader);

let sodiumSupportedVersions = new Set();

async function fetchSodiumVersions() {
  try {
    const loaders = encodeURIComponent(JSON.stringify(['fabric']));
    const res = await fetch(`https://api.modrinth.com/v2/project/sodium/version?loaders=${loaders}`);
    const data = await res.json();
    data.forEach(entry => {
      entry.game_versions.forEach(gv => sodiumSupportedVersions.add(gv));
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
    allVersions = data.versions;
    if (!selectedVersion) selectedVersion = data.latest.release;
    renderVersions();
  } catch (err) {
    selectedText.innerText = "1.20.4 (Offline)";
  }
}

function renderVersions() {
  const allowSnap = showSnapshots.checked;
  const allowHist = showHistorical.checked;
  
  optionsList.innerHTML = '';
  
  const filtered = allVersions.filter(v => {
    if (v.type === 'release') return true;
    if (v.type === 'snapshot' && allowSnap) return true;
    if ((v.type === 'old_beta' || v.type === 'old_alpha') && allowHist) return true;
    return false;
  });
  
  filtered.forEach(v => {
    const el = document.createElement('div');
    el.className = 'custom-option';
    if (v.id === selectedVersion) el.classList.add('selected');
    
    let label = 'Release';
    if (v.type === 'snapshot') label = 'Snapshot';
    else if (v.type !== 'release') label = 'Old';

    const hasSodium = sodiumSupportedVersions.has(v.id);
    const sodiumBadge = hasSodium
      ? `<span class="sodium-badge">
           <img src="./sodium.png" alt="Sodium" />
           <span class="sodium-label">Sodium</span>
         </span>`
      : '';

    el.innerHTML = `
      <span>${v.id}</span>
      <span style="display:flex;align-items:center;gap:6px;">
        ${sodiumBadge}
        <span class="option-type">${label}</span>
      </span>
    `;
    
    el.addEventListener('click', () => {
      selectedVersion = v.id;
      selectedText.innerText = `Version: ${v.id}`;
      versionDropdown.classList.remove('open');
      renderVersions(); // Re-render to update 'selected' class
    });
    
    optionsList.appendChild(el);
  });
  
  selectedText.innerText = `Version: ${selectedVersion}`;
}

showSnapshots.addEventListener('change', renderVersions);
showHistorical.addEventListener('change', renderVersions);

fetchVersions();

// --- PLAY LOGIC ---
const playBtn = document.getElementById('play-btn');
const overlay = document.getElementById('launch-overlay');
const launchStatus = document.getElementById('launch-status');
const launchFill = document.getElementById('launch-fill');

// Register ALL IPC listeners ONCE at startup — NOT inside click handlers.
// This is the fix for modpack play getting stuck: the listeners exist for both
// regular play AND modpack play without needing to be re-registered each time.
if (window.electronAPI) {
  window.electronAPI.onLaunchProgress((data) => {
    if (data.percent !== undefined) launchFill.style.width = `${data.percent}%`;
    if (data.status) launchStatus.innerText = data.status;
  });
  window.electronAPI.onGameLaunched(() => {
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
    playBtn.innerText = 'PLAY';
    playBtn.classList.remove('running');
    playBtn.disabled = false;
    updatePlaytime();
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
  window.electronAPI.onClearJavaPath(() => {
    localStorage.removeItem('craftlaunch_javaPath');
    javaPath = '';
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
  localStorage.setItem('idk_last_played', JSON.stringify({ version: selectedVersion, loader: selectedLoader }));
  overlay.classList.add('active');
  gameStartTime = Date.now();
  launchFill.style.width = '0%';
  launchStatus.innerText = 'Initializing...';
  const authData = authMode === 'elyby' ? JSON.parse(localStorage.getItem('craftlaunch_elybydata') || '{}') : null;

  if (window.electronAPI) {
    window.electronAPI.launchMinecraft(currentUser, selectedVersion, javaPath, selectedLoader, autoOptimization, `${maxMemoryGB}G`, authData);
  } else {
    let progress = 0;
    const statuses = ['Fetching manifest...', 'Downloading assets...', 'Finalizing...'];
    let statusIdx = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) progress = 100;
      launchFill.style.width = `${progress}%`;
      if (progress > (statusIdx + 1) * 33 && statusIdx < statuses.length - 1) {
        statusIdx++; launchStatus.innerText = statuses[statusIdx];
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

// Make updatePlaytime global so it can be called inside the event listeners
window.updatePlaytime = function() {
  if (gameStartTime > 0) {
    const playedMs = Date.now() - gameStartTime;
    const totalMs = parseInt(localStorage.getItem('idk_playtime') || '0');
    localStorage.setItem('idk_playtime', totalMs + playedMs);
    gameStartTime = 0;
    updatePlaytimeDisplay();
  }
};

// Initial display
updatePlaytimeDisplay();

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

// =========================================================
// === MODPACK MANAGER =====================================
// =========================================================
let modpacks = JSON.parse(localStorage.getItem('idk_modpacks') || '[]');
// Migrate old modpacks and remove any "Default Modpack" or generic "Modpack" placeholders
const originalCount = modpacks.length;
modpacks = modpacks.filter(mp => {
  const n = (mp.name || "").trim().toLowerCase();
  return n !== 'default modpack' && n !== 'modpack' && n !== 'new modpack';
});
modpacks = modpacks.map(mp => ({ mods: [], resourcepacks: [], shaders: [], ...mp }));
// Save immediately if we filtered anything out to prevent it from coming back
if (modpacks.length !== originalCount) {
  localStorage.setItem('idk_modpacks', JSON.stringify(modpacks));
}
let activeModpackId = null;
let browserMode = 'mod'; // 'mod' | 'resourcepack' | 'shader'

function mpSave() { localStorage.setItem('idk_modpacks', JSON.stringify(modpacks)); }
function mpGet() { return modpacks.find(m => m.id === activeModpackId) || null; }

function mpRenderList() {
  const list = document.getElementById('modpacks-list');
  if (!list) return; // Guard for startup
  list.innerHTML = '';
  if (modpacks.length === 0) {
    list.innerHTML = `<div class="mp-empty">No modpacks yet.<br>Click <strong>+ New Modpack</strong> to create one.</div>`;
    return;
  }
  modpacks.forEach(mp => {
    const el = document.createElement('div');
    el.className = 'modpack-item' + (mp.id === activeModpackId ? ' active' : '');
    const total = (mp.mods?.length || 0) + (mp.resourcepacks?.length || 0) + (mp.shaders?.length || 0);
    el.innerHTML = `
      <div class="mp-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>
      <div class="mp-item-info"><strong>${mp.name}</strong><span>${mp.mcVersion} · ${mp.loader}</span></div>
      <span class="mp-item-count">${total}</span>`;
    el.addEventListener('click', () => { activeModpackId = mp.id; mpRenderList(); mpRenderDetail(); });
    list.appendChild(el);
  });
}

// Initial Render
setTimeout(() => { mpRenderList(); mpRenderDetail(); }, 100);

function mpRenderInstalledList(type) {
  const mp = mpGet(); if (!mp) return;
  const items = mp[type] || [];
  const gridId = type === 'mods' ? 'installed-mods-list' : type === 'resourcepacks' ? 'installed-rp-list' : 'installed-shaders-list';
  const grid = document.getElementById(gridId);
  const emptyMsgs = {
    mods: 'No mods installed. Click <strong>+ Add Mods</strong> to browse Modrinth.',
    resourcepacks: 'No resource packs installed. Click <strong>+ Add Resource Packs</strong>.',
    shaders: 'No shaders installed. Click <strong>+ Add Shaders</strong>.'
  };
  grid.innerHTML = '';
  if (items.length === 0) { grid.innerHTML = `<div class="mp-empty" style="padding:40px 0;">${emptyMsgs[type]}</div>`; return; }
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'installed-mod-card';
    el.innerHTML = `
      ${item.iconUrl ? `<img src="${item.iconUrl}" onerror="this.style.display='none'" />` : `<div class="mod-icon-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>`}
      <div class="installed-mod-info"><strong>${item.name}</strong><span>${item.version}</span></div>
      <button class="remove-mod-btn" title="Remove">✕</button>`;
    el.querySelector('.remove-mod-btn').addEventListener('click', () => {
      if (type === 'mods') mpRemoveItem(item, 'mods', 'removeMod');
      else if (type === 'resourcepacks') mpRemoveItem(item, 'resourcepacks', 'removeResourcepack');
      else mpRemoveItem(item, 'shaders', 'removeShader');
    });
    grid.appendChild(el);
  });
}

function mpRenderDetail() {
  const mp = mpGet();
  const noMpMsg = document.getElementById('no-modpack-msg');
  const mpContent = document.getElementById('modpack-content');
  
  if (noMpMsg) noMpMsg.style.setProperty('display', mp ? 'none' : 'block', 'important');
  if (mpContent) mpContent.style.setProperty('display', mp ? 'block' : 'none', 'important');
  
  if (!mp) return;
  document.getElementById('modpack-name-display').innerText = mp.name;
  document.getElementById('modpack-meta-display').innerText = `MC ${mp.mcVersion} · ${mp.loader}`;
  document.getElementById('mod-count').innerText = mp.mods?.length || 0;
  document.getElementById('rp-count').innerText = mp.resourcepacks?.length || 0;
  document.getElementById('shader-count').innerText = mp.shaders?.length || 0;
  mpRenderInstalledList('mods');
  mpRenderInstalledList('resourcepacks');
  mpRenderInstalledList('shaders');
}

// Tab switching
document.querySelectorAll('.mp-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

async function mpRemoveItem(item, type, apiMethod) {
  const mp = mpGet(); if (!mp) return;
  mp[type] = mp[type].filter(i => i.modrinthId !== item.modrinthId);
  mpSave();
  if (window.electronAPI) await window.electronAPI[apiMethod]({ modpackId: mp.id, filename: item.filename });
  mpRenderDetail(); mpRenderList();
}

// --- Create Modpack ---
document.getElementById('btn-new-modpack').addEventListener('click', () => {
  const sel = document.getElementById('new-mp-version');
  if (sel.options.length === 0 && allVersions.length > 0) {
    allVersions.filter(v => v.type === 'release').slice(0, 30).forEach(v => {
      const o = document.createElement('option'); o.value = v.id; o.textContent = v.id; sel.appendChild(o);
    });
  }
  document.getElementById('mp-create-modal').classList.add('active');
  document.getElementById('new-mp-name').focus();
});
document.getElementById('btn-cancel-create-mp').addEventListener('click', () => document.getElementById('mp-create-modal').classList.remove('active'));
document.getElementById('btn-confirm-create-mp').addEventListener('click', () => {
  const name = document.getElementById('new-mp-name').value.trim();
  const mcVersion = document.getElementById('new-mp-version').value;
  const loader = document.getElementById('new-mp-loader').value;
  if (!name || !mcVersion) return;
  const newMp = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), name, mcVersion, loader, mods: [], resourcepacks: [], shaders: [] };
  modpacks.push(newMp); mpSave();
  document.getElementById('mp-create-modal').classList.remove('active');
  document.getElementById('new-mp-name').value = '';
  activeModpackId = newMp.id;
  mpRenderList(); mpRenderDetail();
});

// --- Delete Modpack ---
document.getElementById('btn-delete-modpack').addEventListener('click', () => {
  const mp = mpGet(); if (!mp) return;
  if (confirm(`Delete "${mp.name}"? Files on disk are kept.`)) {
    modpacks = modpacks.filter(m => m.id !== activeModpackId);
    activeModpackId = null; mpSave(); mpRenderList(); mpRenderDetail();
  }
});

// --- Unified Browser ---
function openBrowser(mode) {
  browserMode = mode;
  const titles = { mod: 'Browse Mods on Modrinth', resourcepack: 'Browse Resource Packs', shader: 'Browse Shaders' };
  const placeholders = { mod: 'Search mods...', resourcepack: 'Search resource packs...', shader: 'Search shaders...' };
  document.getElementById('browser-title').innerText = titles[mode];
  document.getElementById('mod-search').placeholder = placeholders[mode];
  document.getElementById('mod-browser').classList.add('active');
  document.getElementById('mod-search').value = '';
  mpBrowse('');
}
document.getElementById('btn-browse-mods').addEventListener('click', () => openBrowser('mod'));
document.getElementById('btn-browse-rp').addEventListener('click', () => openBrowser('resourcepack'));
document.getElementById('btn-browse-shaders').addEventListener('click', () => openBrowser('shader'));
document.getElementById('btn-close-browser').addEventListener('click', () => document.getElementById('mod-browser').classList.remove('active'));

let mpSearchTimeout;
document.getElementById('mod-search').addEventListener('input', e => {
  clearTimeout(mpSearchTimeout);
  mpSearchTimeout = setTimeout(() => mpBrowse(e.target.value), 400);
});

async function mpBrowse(query) {
  const mp = mpGet(); if (!mp) return;
  const results = document.getElementById('mod-browser-results');
  results.innerHTML = `<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching Modrinth...</div>`;
  try {
    let facets;
    if (browserMode === 'mod') {
      facets = encodeURIComponent(JSON.stringify([[`categories:${mp.loader.toLowerCase()}`],[`versions:${mp.mcVersion}`],[`project_type:mod`]]));
    } else if (browserMode === 'resourcepack') {
      facets = encodeURIComponent(JSON.stringify([[`versions:${mp.mcVersion}`],[`project_type:resourcepack`]]));
    } else {
      facets = encodeURIComponent(JSON.stringify([[`project_type:shader`]]));
    }
    const res = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${facets}&limit=20`);
    const data = await res.json();
    results.innerHTML = '';
    if (!data.hits || data.hits.length === 0) {
      results.innerHTML = `<div class="mp-loading">No results found for "${query}"</div>`; return;
    }
    const installedIds = browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId)
      : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId)
      : (mp.shaders||[]).map(s=>s.modrinthId);
    data.hits.forEach(mod => {
      const installed = installedIds.includes(mod.project_id);
      const el = document.createElement('div');
      el.className = 'mod-result-card';
      el.innerHTML = `
        ${mod.icon_url ? `<img class="mod-result-icon" src="${mod.icon_url}" onerror="this.style.display='none'" />` : `<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;"></div>`}
        <div class="mod-result-info">
          <strong>${mod.title}</strong><span>${mod.description}</span>
          <div class="mod-result-meta"><span>⬇ ${mod.downloads>=1000?(mod.downloads/1000).toFixed(0)+'K':mod.downloads}</span><span>👥 ${mod.follows}</span></div>
        </div>
        <button class="add-mod-btn ${installed?'installed':''}" ${installed?'disabled':''}>${installed?'✓ Added':'+ Add'}</button>`;
      if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(mod, el.querySelector('.add-mod-btn')));
      results.appendChild(el);
    });
  } catch(e) {
    results.innerHTML = `<div class="mp-loading">Failed to fetch. Check your internet.</div>`;
  }
}

async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  const mp = passedMp || mpGet(); if (!mp) return;
  if (btn) { btn.textContent = '⬇ Fetching...'; btn.disabled = true; }
  try {
    let versions, fileObj, entry;
    
    const projectId = typeof mod === 'string' ? mod : mod.project_id;
    const modTitle = typeof mod === 'string' ? 'Dependency' : mod.title;
    const modIcon = typeof mod === 'string' ? '' : (mod.icon_url || '');

    if (browserMode === 'mod' || isDependency) {
      if (mp.mods.find(m => m.modrinthId === projectId)) {
        if(btn) { btn.textContent = '✓ Added'; btn.classList.add('installed'); }
        return;
      }
      
      const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version?loaders=${encodeURIComponent(JSON.stringify([mp.loader.toLowerCase()]))}&game_versions=${encodeURIComponent(JSON.stringify([mp.mcVersion]))}`);
      versions = await res.json();
      if (!versions.length) { 
        if(btn) { showWarningToast(`${modTitle} has no version for MC ${mp.mcVersion} + ${mp.loader}`); btn.textContent='+ Add'; btn.disabled=false; }
        return; 
      }
      const versionObj = versions[0];
      fileObj = versionObj.files.find(f=>f.primary)||versionObj.files[0];
      entry = { modrinthId: projectId, name: modTitle === 'Dependency' ? fileObj.filename.split('-')[0] : modTitle, version: versionObj.version_number, filename: fileObj.filename, downloadUrl: fileObj.url, iconUrl: modIcon };
      mp.mods.push(entry); mpSave(); 
      if (btn) btn.textContent='⬇ Installing...';
      if (window.electronAPI) await window.electronAPI.installMod({ modpackId: mp.id, downloadUrl: fileObj.url, filename: fileObj.filename });
      
      if (versionObj.dependencies) {
        for (const dep of versionObj.dependencies) {
          if (dep.dependency_type === 'required' && dep.project_id) {
            await mpAddItem(dep.project_id, null, true, mp);
          }
        }
      }
    } else if (browserMode === 'resourcepack') {
      const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version?game_versions=${encodeURIComponent(JSON.stringify([mp.mcVersion]))}`);
      versions = await res.json();
      if (!versions.length) { showWarningToast(`${modTitle} has no version for MC ${mp.mcVersion}`); if(btn){btn.textContent='+ Add'; btn.disabled=false;} return; }
      const versionObj = versions[0];
      fileObj = versionObj.files.find(f=>f.primary)||versionObj.files[0];
      entry = { modrinthId: projectId, name: modTitle, version: versionObj.version_number, filename: fileObj.filename, downloadUrl: fileObj.url, iconUrl: modIcon };
      mp.resourcepacks.push(entry); mpSave(); 
      if(btn) btn.textContent='⬇ Installing...';
      if (window.electronAPI) await window.electronAPI.installResourcepack({ modpackId: mp.id, downloadUrl: fileObj.url, filename: fileObj.filename });
    } else {
      const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`);
      versions = await res.json();
      if (!versions.length) { showWarningToast(`${modTitle} has no downloadable version.`); if(btn){btn.textContent='+ Add'; btn.disabled=false;} return; }
      const versionObj = versions[0];
      fileObj = versionObj.files.find(f=>f.primary)||versionObj.files[0];
      entry = { modrinthId: projectId, name: modTitle, version: versionObj.version_number, filename: fileObj.filename, downloadUrl: fileObj.url, iconUrl: modIcon };
      mp.shaders.push(entry); mpSave(); 
      if(btn) btn.textContent='⬇ Installing...';
      if (window.electronAPI) await window.electronAPI.installShader({ modpackId: mp.id, downloadUrl: fileObj.url, filename: fileObj.filename });
    }
    if (btn) { btn.textContent = '✓ Added'; btn.classList.add('installed'); }
    mpRenderDetail(); mpRenderList();
  } catch(e) {
    if (btn && !isDependency) {
      showWarningToast(`Failed to add ${typeof mod === 'string' ? mod : mod.title}: ${e.message}`);
      btn.textContent = '+ Add'; btn.disabled = false;
    }
  }
}

// --- Play Modpack ---
// IPC listeners are already registered globally above — no setup needed here.
document.getElementById('btn-play-modpack').addEventListener('click', () => {
  const mp = mpGet(); if (!mp) return;
  switchView('main');
  overlay.classList.add('active');
  gameStartTime = Date.now();
  launchFill.style.width = '0%';
  launchStatus.innerText = 'Launching modpack...';
  const authData = authMode === 'elyby' ? JSON.parse(localStorage.getItem('craftlaunch_elybydata') || '{}') : null;

  if (window.electronAPI) {
    window.electronAPI.launchModpack({ username: currentUser, modpackId: mp.id, mcVersion: mp.mcVersion, loader: mp.loader, javaPath, maxMemory: `${maxMemoryGB}G`, authData });
  }
});

// =========================================================
// === MOJANG NEWS FETCHING ================================
// =========================================================
async function fetchMojangNews() {
  const grid = document.getElementById('mojang-news-grid');
  if (!grid) return;
  try {
    const res = await fetch('https://launchercontent.mojang.com/news.json');
    const data = await res.json();
    grid.innerHTML = '';
    
    const latestNews = data.entries.slice(0, 4); // Show latest 4
    
    latestNews.forEach(news => {
      const imageUrl = news.newsPageImage?.url 
        ? 'https://launchercontent.mojang.com' + news.newsPageImage.url 
        : (news.playPageImage?.url ? 'https://launchercontent.mojang.com' + news.playPageImage.url : '');
      
      const dateObj = new Date(news.date);
      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : news.date;
      
      grid.innerHTML += `
        <div class="news-card" onclick="window.electronAPI ? window.electronAPI.openExternal('${news.readMoreLink}') : window.open('${news.readMoreLink}', '_blank')" style="cursor:pointer;">
          <div class="news-img" style="background-image: url('${imageUrl}')"></div>
          <div class="news-content">
            <span class="news-date" style="display: block; margin-bottom: 6px;">${dateStr} &bull; ${news.category}</span>
            <h3 style="font-size: 15px; margin-bottom: 6px;">${news.title}</h3>
            <p style="font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${news.text}</p>
          </div>
        </div>
      `;
    });
  } catch (err) {
    grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted); width: 100%; text-align: center;">Failed to load news.</div>';
    console.error('Failed to fetch Mojang news:', err);
  }
}

async function fetchTrendingMods() {
  const grid = document.getElementById('trending-mods-grid');
  if (!grid) return;
  try {
    const facets = encodeURIComponent(JSON.stringify([["project_type:mod"]]));
    const res = await fetch(`https://api.modrinth.com/v2/search?limit=4&facets=${facets}`);
    const data = await res.json();
    grid.innerHTML = '';
    data.hits.forEach(mod => {
      grid.innerHTML += `
        <div class="news-card" onclick="alert('Select a modpack from the left sidebar to install mods!')" style="cursor:pointer;">
          <div class="news-img" style="background-image: url('${mod.icon_url || ''}'); background-size: cover; background-position: center; border-bottom: 1px solid var(--border-color); height: 160px;"></div>
          <div class="news-content">
            <h3 style="font-size: 15px; margin-bottom: 6px;">${mod.title}</h3>
            <p style="font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-muted);">${mod.description}</p>
          </div>
        </div>
      `;
    });
  } catch(e) {
    grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted); width: 100%; text-align: center;">Failed to load marketplace.</div>';
  }
}

// Initialize on load
fetchMojangNews();
fetchTrendingMods();
