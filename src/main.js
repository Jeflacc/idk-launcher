import './style.css';

document.querySelector('#app').innerHTML = `
  <div class="background-slider">
    <video autoplay muted loop playsinline class="bg-video">
      <source src="./background.mp4" type="video/mp4">
    </video>
  </div>
  <div class="bg-overlay"></div>

  <!-- TOP TITLE BAR & NAVIGATION -->
  <div class="top-bar">
    <div class="top-bar-left">
      <div class="top-brand">IDK<span>.</span></div>
      <div class="header-nav">
        <div class="brand-title">MINECRAFT: JAVA EDITION</div>
        <div class="nav-tabs">
          <div class="nav-tab" data-target="main">Play</div>
          <div class="nav-tab" data-target="mods">Modpacks</div>
          <div class="nav-tab" data-target="settings">Settings</div>
        </div>
      </div>
    </div>
    
    <div class="top-bar-right">
      <!-- FRIENDS TOGGLE BUTTON -->
      <button class="friends-toggle-btn" id="btn-friends-toggle" title="Friends List" style="margin-right: 4px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span class="friends-badge" id="friends-pending-badge" style="display:none;">0</span>
      </button>

      <div class="user-profile-wrapper">
        <div class="user-profile" id="user-profile-btn">
          <div class="user-avatar">
            <canvas id="avatar-canvas" width="28" height="28" style="width:100%;height:100%;image-rendering:pixelated;"></canvas>
          </div>
          <div class="user-details">
            <h4 id="display-username">PlayerOne</h4>
            <p>Offline Account</p>
          </div>
        </div>
        
        <div class="profile-dropdown" id="profile-dropdown">
          <div class="profile-dropdown-item" id="btn-dropdown-skin" style="display:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 8a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z"></path></svg>
            Change Skin (Ely.by)
          </div>
          <div class="profile-dropdown-item logout" id="btn-dropdown-logout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log Out
          </div>
        </div>
      </div>
      <div class="window-controls">
        <div class="ctrl minimize">_</div>
        <div class="ctrl maximize">□</div>
        <div class="ctrl close">✕</div>
      </div>
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
    <div class="main-hero-banner">
      <video autoplay muted loop playsinline class="hero-video">
        <source src="./background.mp4" type="video/mp4">
      </video>
      <div class="hero-overlay"></div>
      
      <!-- Integrated invisible navigation trigger links to keep original JS functional -->
      <div id="btn-open-mods" style="display:none;"></div>
      <div id="btn-open-settings" style="display:none;"></div>

      <div class="main-center">
        <img src="./java.png" alt="Minecraft Java Edition" class="mc-logo" />
      </div>

      <div class="bottom-bar">
        <div class="controls-left">
          <div class="custom-select-wrapper">
            <div class="custom-select" id="version-dropdown">
              <div class="custom-select-trigger">
                <span style="display: flex; align-items: center; gap: 8px;">
                  <svg class="grass-icon" viewBox="0 0 24 24" width="16" height="16"><path d="M2 2h20v4H2z" fill="#5c8e32"/><path d="M2 6h20v16H2z" fill="#866043"/><path d="M2 6l3 3 3-3 3 3 3-3 3 3 3-3 3 3v2l-3-3-3 3-3-3-3 3-3-3-3 3-3-3z" fill="#4d7729"/></svg>
                  <span id="selected-version-text">Loading versions...</span>
                </span>
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
        </div>

        <div class="controls-right">
          <button class="play-button" id="play-btn">PLAY</button>
        </div>
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
    <div id="btn-close-settings" style="display:none;"></div>
    
    <div class="settings-content-wrapper">
      <h2 class="view-title">Settings</h2>
      
      <div class="settings-grid">
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
          <p>Provide the absolute path to your javaw.exe file (e.g., C:\\\Program Files\\\Java\\\jdk-17\\\bin\\\javaw.exe). If left blank, the launcher will use the system default Java.</p>
          <input type="text" class="clean-input" style="text-align: left;" id="java-path" placeholder="&lt;Use System Default&gt;" />
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
    </div>
  </div>

  <!-- MODS VIEW -->
  <div id="view-mods" class="view">
    <div id="btn-close-mods" style="display:none;"></div>
    
    <div class="mods-content-wrapper">
      <div class="mods-page-header">
        <h2 class="view-title">Modpack Manager</h2>
        <div style="display:flex; gap:10px;">
          <button class="create-modpack-btn" id="btn-browse-modpacks" style="background:#4b5563;">Browse Modpacks</button>
          <button class="create-modpack-btn" id="btn-new-modpack">+ New Modpack</button>
        </div>
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
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <h2 class="section-title" style="margin-bottom:0;">Trending Modpacks</h2>
                <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.489 0H0l2.286 4.5H8.48L6.49 0h-.001zM17.51 0H11.02l1.99 4.5h6.494L17.51 0zM0 6.75l5.614 12.5H9.64L4.025 6.75H0zm19.975 0H15.95L10.337 19.25h4.025L19.975 6.75zm-9.988 0l5.613 12.5H9.988L4.374 6.75h5.613z"/></svg>
                  CurseForge
                </span>
              </div>
              <div class="trending-modpacks-grid" id="trending-mods-grid">
                <div style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">Loading modpacks...</div>
              </div>
            </div>
          </div>
          <div class="modpack-content" id="modpack-content">
            <div class="modpack-content-header">
              <div style="display:flex;align-items:center;gap:16px;">
                <div id="modpack-icon-display" title="Click to change icon" style="width:64px;height:64px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;border:1px solid rgba(255,255,255,0.1);transition:border 0.2s;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                </div>
                <div><h3 id="modpack-name-display">Modpack</h3><p id="modpack-meta-display">MC 1.20.4 · Fabric</p></div>
              </div>
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
          <h3 id="browser-title">Browse Mods</h3>
          <button class="mod-browser-close" id="btn-close-browser">✕</button>
        </div>
        <div style="padding: 0 24px 12px; display:flex; align-items:center; gap:10px;">
          <div class="provider-pill-group" id="provider-pill-group">
            <button class="provider-pill active" data-provider="modrinth" id="pill-modrinth">Modrinth</button>
            <button class="provider-pill" data-provider="curseforge" id="pill-curseforge">CurseForge</button>
          </div>
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
  </div>

  <!-- LAUNCH OVERLAY -->
  <div class="launch-overlay" id="launch-overlay">
    <img src="./loading.gif" class="launch-spinner-gif" alt="Loading...">
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

  <!-- UPDATE MODAL -->
  <div class="custom-modal" id="update-modal">
    <div class="modal-content update-box">
      <div class="modal-icon update-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
      </div>
      <h3>New Update Available!</h3>
      <p id="update-version-info">A new update is available.</p>
      <div class="update-notes-container" id="update-notes">
        <!-- Injected release notes -->
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;width:100%;">
        <button class="submit-btn" id="btn-download-update" style="flex:1;">Get Update</button>
        <button class="modal-btn" id="btn-ignore-update" style="flex:1;">Later</button>
      </div>
    </div>
  </div>

  <!-- FRIENDS SIDEBAR -->
  <div class="friends-sidebar" id="friends-sidebar">
    <div class="friends-sidebar-header">
      <h3>IDK CONNECT</h3>
      <button class="friends-sidebar-close" id="btn-friends-sidebar-close">✕</button>
    </div>
    
    <div class="friends-sidebar-content">
      <!-- PORTAL PANEL (WHEN NOT AUTHENTICATED WITH IDK SYSTEM) -->
      <div id="friends-auth-panel" class="friends-auth-panel">
        <p class="friends-auth-welcome">
          Connect to <strong>IDK Network</strong> to add friends, sync presence, and join multiplayer worlds with a single click!
        </p>
        
        <div class="friends-auth-tabs">
          <button class="friends-auth-tab active" id="tab-friends-login">LOGIN</button>
          <button class="friends-auth-tab" id="tab-friends-register">REGISTER</button>
        </div>
        
        <div class="friends-auth-form">
          <div class="friends-auth-error" id="friends-auth-error">Error message here</div>
          <input type="text" class="clean-input" id="friends-auth-username" placeholder="IDK Username..." />
          <input type="password" class="clean-input" id="friends-auth-password" placeholder="Password..." />
          <button class="submit-btn" id="btn-friends-auth-submit" style="margin-top: 10px;">Connect Account</button>
        </div>
      </div>
      
      <!-- MAIN PANEL (WHEN AUTHENTICATED WITH IDK SYSTEM) -->
      <div id="friends-main-panel" class="friends-auth-panel" style="display:none;">
        <!-- Identity Card -->
        <div class="friends-identity-card">
          <div class="friends-identity-info">
            <div class="friends-identity-avatar">
              <canvas id="friends-my-avatar" width="28" height="28" style="image-rendering:pixelated;width:100%;height:100%;"></canvas>
            </div>
            <div class="friends-identity-name">
              <h4 id="friends-my-username">Username</h4>
              <span>● Connected</span>
            </div>
          </div>
          <button class="friends-identity-disconnect" id="btn-friends-disconnect" title="Disconnect Account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
        
        <!-- Share LAN World Card -->
        <div class="friends-share-card" id="friends-share-card">
          <h4>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            Host LAN World
          </h4>
          <p id="friends-share-instructions">Open your Minecraft singleplayer world, click "Open to LAN", then enter the port below to invite your friends!</p>
          
          <div class="friends-share-input-row" id="friends-share-input-row">
            <input type="number" class="clean-input" id="friends-share-port" placeholder="LAN Port (e.g. 54321)" min="1024" max="65535" />
            <button class="friends-share-btn" id="btn-friends-share">Share</button>
          </div>
          
          <div class="friends-share-tunnel-link" id="friends-share-tunnel-link" style="display:none;" title="Click to copy IP address">
            tcp://...
          </div>
          
          <!-- Cloudflared Downloader Progress Panel -->
          <div id="cloudflared-progress-panel" style="display:none;">
            <div style="font-size:10px;color:var(--text-muted);display:flex;justify-content:space-between;margin-bottom:2px;">
              <span id="cloudflared-status-text">Downloading Cloudflared...</span>
              <span id="cloudflared-percent-text">0%</span>
            </div>
            <div class="cloudflared-progress-bar">
              <div class="cloudflared-progress-fill" id="cloudflared-progress-fill"></div>
            </div>
          </div>
        </div>
        
        <!-- Pending Friend Requests -->
        <div class="friends-requests-section" id="friends-requests-section" style="display:none;">
          <span class="friends-requests-title">Friend Requests</span>
          <div id="friends-requests-list" class="friends-list-container">
            <!-- Dynamic requests -->
          </div>
        </div>
        
        <!-- Add Friend -->
        <div class="friends-requests-section">
          <span class="friends-requests-title">Add Friend</span>
          <div class="friends-add-row">
            <input type="text" class="clean-input" id="friends-add-username" placeholder="Friend's username..." />
            <button class="friends-add-btn" id="btn-friends-add" title="Send Friend Request">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
            </button>
          </div>
        </div>
        
        <!-- Friends List -->
        <div class="friends-list-section">
          <span class="friends-list-header">My Friends</span>
          <div id="friends-list" class="friends-list-container">
            <div class="friends-list-empty">Your friends list is empty.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;


// --- STATE & DOM ---
let quickConnectTarget = null;
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

function renderSkinFaceOnCanvas(skinUrl, fallbackUrl) {
  const canvas = document.getElementById('avatar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  // No crossOrigin here — we only draw TO the canvas, never read pixels back,
  // so taint protection isn't needed. crossOrigin='anonymous' silently blocks
  // loading when the remote server doesn't send CORS headers.
  img.onload = () => {
    const scale = img.naturalWidth / 64; // handles both 64x64 and 64x32 skins
    ctx.clearRect(0, 0, 28, 28);
    ctx.imageSmoothingEnabled = false;
    // Face layer: x=8,y=8,w=8,h=8 on the skin sheet
    ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, 28, 28);
    // Hat/outer layer: x=40,y=8,w=8,h=8 on the skin sheet
    ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, 28, 28);
  };
  img.onerror = () => {
    if (fallbackUrl && img.src !== fallbackUrl) {
      img.src = fallbackUrl;
    } else if (img.src !== 'https://minotar.net/skin/Steve') {
      img.src = 'https://minotar.net/skin/Steve';
    } else {
      ctx.fillStyle = '#3c3c3d';
      ctx.fillRect(0, 0, 28, 28);
    }
  };
  img.src = skinUrl;
}

async function loadElybyAvatar(name) {
  // Try IPC route first (Node.js, no CORS)
  if (window.electronAPI && window.electronAPI.fetchElybyProfile) {
    try {
      const res = await window.electronAPI.fetchElybyProfile(name);
      if (res.ok && res.data) {
        const textureProp = res.data?.properties?.find(p => p.name === 'textures');
        if (textureProp) {
          const decoded = JSON.parse(atob(textureProp.value));
          const skinUrl = decoded?.textures?.SKIN?.url;
          if (skinUrl) {
            renderSkinFaceOnCanvas(skinUrl, `https://skinsystem.ely.by/skins/${name}.png`);
            return;
          } else {
            // The profile returned successfully, but textures are empty (user has no skin on Ely.by).
            // Fall back directly to premium Mojang or Steve to avoid querying skinsystem and throwing a 404!
            renderSkinFaceOnCanvas(
              `https://minotar.net/skin/${name}`,
              `https://minotar.net/skin/Steve`
            );
            return;
          }
        }
      }
    } catch(_) {}
  }

  // Fallback: render Ely.by skin directly, with Minotar and Steve as progressive fallbacks
  renderSkinFaceOnCanvas(
    `https://skinsystem.ely.by/skins/${name}.png`,
    `https://minotar.net/skin/${name}`
  );
}

function updateUserDisplay(name) {
  document.getElementById('display-username').innerText = name;
  document.getElementById('display-username').nextElementSibling.innerText = authMode === 'elyby' ? 'Ely.by Account' : 'Offline Account';
  
  const skinBtn = document.getElementById('btn-dropdown-skin');
  if (skinBtn) {
    skinBtn.style.display = authMode === 'elyby' ? 'flex' : 'none';
  }

  if (authMode === 'elyby') {
    // Show a placeholder immediately, then replace once the real skin loads
    const canvas = document.getElementById('avatar-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2d2d2e';
      ctx.fillRect(0, 0, 28, 28);
    }
    loadElybyAvatar(name);
  } else {
    renderSkinFaceOnCanvas(
      `https://minotar.net/skin/${name}`,
      `https://minotar.net/skin/Steve`
    );
  }
}

// User Profile Dropdown Triggers
const userProfileBtn = document.getElementById('user-profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const btnDropdownSkin = document.getElementById('btn-dropdown-skin');
const btnDropdownLogout = document.getElementById('btn-dropdown-logout');

// Toggle dropdown menu on click
userProfileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  profileDropdown.classList.remove('active');
});

// "Change Skin" behavior: forwards user to Ely.by profile dashboard in their system browser!
btnDropdownSkin.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  const targetUrl = 'https://ely.by/profile';
  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(targetUrl);
  } else {
    window.open(targetUrl, '_blank');
  }
});

// Logout click behavior
btnDropdownLogout.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  if (confirm("Log out?")) {
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
    window.electronAPI.launchMinecraft(currentUser, selectedVersion, javaPath, selectedLoader, autoOptimization, `${maxMemoryGB}G`, authData, quickConnectTarget);
    quickConnectTarget = null; // Reset after launch
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
let browserMode = 'mod'; // 'mod' | 'resourcepack' | 'shader' | 'modpack'
let currentProvider = 'modrinth';

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
  const titles = { mod: 'Browse Mods', resourcepack: 'Browse Resource Packs', shader: 'Browse Shaders', modpack: 'Browse Modpacks' };
  const placeholders = { mod: 'Search mods...', resourcepack: 'Search resource packs...', shader: 'Search shaders...', modpack: 'Search modpacks...' };
  document.getElementById('browser-title').innerText = titles[mode];
  document.getElementById('mod-search').placeholder = placeholders[mode] || 'Search...';
  
  if (mode === 'modpack') {
    currentProvider = 'curseforge';
    document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('pill-curseforge').classList.add('active');
    document.getElementById('pill-modrinth').style.display = 'none';
  } else {
    document.getElementById('pill-modrinth').style.display = 'inline-block';
  }

  document.getElementById('mod-browser').classList.add('active');
  document.getElementById('mod-search').value = '';
  mpBrowse('');
}
document.getElementById('btn-browse-mods').addEventListener('click', () => openBrowser('mod'));
document.getElementById('btn-browse-rp').addEventListener('click', () => openBrowser('resourcepack'));
document.getElementById('btn-browse-shaders').addEventListener('click', () => openBrowser('shader'));
document.getElementById('btn-browse-modpacks').addEventListener('click', () => openBrowser('modpack'));
document.getElementById('btn-close-browser').addEventListener('click', () => document.getElementById('mod-browser').classList.remove('active'));

// Provider pill switching
document.querySelectorAll('.provider-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentProvider = pill.getAttribute('data-provider');
    mpBrowse(document.getElementById('mod-search').value);
  });
});

let mpSearchTimeout;
document.getElementById('mod-search').addEventListener('input', e => {
  clearTimeout(mpSearchTimeout);
  mpSearchTimeout = setTimeout(() => mpBrowse(e.target.value), 400);
});

async function mpBrowse(query) {
  const mp = mpGet();
  if (!mp && browserMode !== 'modpack') return;
  const results = document.getElementById('mod-browser-results');
  results.innerHTML = `<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching ${currentProvider === 'modrinth' ? 'Modrinth' : 'CurseForge'}...</div>`;
  try {
    let hits = [];
    if (currentProvider === 'modrinth') {
      let facets;
      if (browserMode === 'mod') facets = encodeURIComponent(JSON.stringify([[`categories:${mp.loader.toLowerCase()}`],[`versions:${mp.mcVersion}`],[`project_type:mod`]]));
      else if (browserMode === 'resourcepack') facets = encodeURIComponent(JSON.stringify([[`versions:${mp.mcVersion}`],[`project_type:resourcepack`]]));
      else facets = encodeURIComponent(JSON.stringify([[`project_type:shader`]]));
      const res = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${facets}&limit=20`);
      const data = await res.json();
      hits = (data.hits || []).map(m => ({ project_id: m.project_id, title: m.title, description: m.description, icon_url: m.icon_url, downloads: m.downloads, follows: m.follows, provider: 'modrinth' }));
    } else {
      let classId = 6;
      if (browserMode === 'resourcepack') classId = 12;
      else if (browserMode === 'shader') classId = 6552;
      else if (browserMode === 'modpack') classId = 4471;
      const gameVerStr = (mp && browserMode !== 'modpack') ? `&gameVersion=${mp.mcVersion}` : '';
      const res = await fetch(`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=${classId}&searchFilter=${encodeURIComponent(query)}${gameVerStr}&sortField=2&sortOrder=desc&pageSize=20`);
      const data = await res.json();
      hits = (data.data || []).map(m => ({ project_id: m.id.toString(), title: m.name, description: m.summary, icon_url: m.logo ? m.logo.thumbnailUrl : '', downloads: m.downloadCount, follows: 0, provider: 'curseforge' }));
    }
    results.innerHTML = '';
    if (!hits.length) { results.innerHTML = `<div class="mp-loading">No results found for "${query}" | Debug: classId ${classId}, provider ${currentProvider}</div>`; return; }
    const installedIds = browserMode === 'modpack' ? [] : (browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId) : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId) : (mp.shaders||[]).map(s=>s.modrinthId));
    hits.forEach(mod => {
      const installed = installedIds.includes(mod.project_id);
      const el = document.createElement('div');
      el.className = 'mod-result-card';
      el.innerHTML = `
        ${mod.icon_url ? `<img class="mod-result-icon" src="${mod.icon_url}" onerror="this.style.display='none'" />` : `<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;"></div>`}
        <div class="mod-result-info">
          <strong>${mod.title}</strong><span>${mod.description}</span>
          <div class="mod-result-meta"><span>⬇ ${mod.downloads>=1000?(mod.downloads/1000).toFixed(0)+'K':mod.downloads}</span></div>
        </div>
        <button class="add-mod-btn ${installed?'installed':''}" ${installed?'disabled':''}>${installed?'✓ Added':(browserMode==='modpack'?'+ Import':'+ Add')}</button>`;
      if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(mod, el.querySelector('.add-mod-btn')));
      results.appendChild(el);
    });
  } catch(e) {
    results.innerHTML = `<div class="mp-loading" style="color:red;font-size:12px;">Error: ${e.message} <br/> ${e.stack}</div>`;
  }
}

async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  // ---- MODPACK IMPORT FLOW ----
  if (browserMode === 'modpack' && !isDependency) {
    if (btn) { btn.textContent = 'Fetching...'; btn.disabled = true; }
    try {
      const projectId = typeof mod === 'string' ? mod : mod.project_id;
      const modName = typeof mod === 'string' ? 'Modpack' : mod.title;
      const filesRes = await fetch(`https://api.curse.tools/v1/cf/mods/${projectId}/files`);
      const filesData = await filesRes.json();
      let files = filesData.data || [];
      files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate));
      if (!files.length) { showWarningToast('No downloadable files found.'); if(btn){btn.textContent='+ Import';btn.disabled=false;} return; }
      const fileObj = files[0];
      let dlUrl = fileObj.downloadUrl;
      if (!dlUrl) {
        const p1 = Math.floor(fileObj.id / 1000);
        const p2 = (fileObj.id % 1000).toString().padStart(3, '0');
        dlUrl = `https://edge.forgecdn.net/files/${p1}/${p2}/${encodeURIComponent(fileObj.fileName)}`;
      }
      document.getElementById('mod-browser').classList.remove('active');
      overlay.classList.add('active');
      launchStatus.innerText = 'Downloading modpack archive...';
      launchFill.style.width = '5%';
      if (!window.electronAPI) { overlay.classList.remove('active'); showWarningToast('Only available in the desktop app.'); return; }
      const importRes = await window.electronAPI.downloadCurseforgeModpack({ downloadUrl: dlUrl });
      if (!importRes.success) throw new Error(importRes.error || 'Import failed');
      const manifest = importRes.manifest;
      const rawLoaderId = manifest.minecraft?.modLoaders?.[0]?.id || '';
      const loaderStr = rawLoaderId.toLowerCase();
      const loader = loaderStr.includes('fabric') ? 'Fabric' : loaderStr.includes('forge') ? 'Forge' : loaderStr.includes('neoforge') ? 'NeoForge' : 'Vanilla';
      // Extract pinned version: 'forge-14.23.5.2860' → '14.23.5.2860', 'fabric-0.15.11' → '0.15.11'
      const loaderVerMatch = rawLoaderId.match(/^[a-z]+-(.+)$/i);
      const loaderVersion = loaderVerMatch ? loaderVerMatch[1] : '';
      const mcVersion = manifest.minecraft?.version || '1.20.4';
      const newMp = { id: importRes.modpackId, name: manifest.name || modName, iconUrl: mod.icon_url || '', mcVersion, loader, loaderVersion, mods: [], resourcepacks: [], shaders: [] };
      const mpData = JSON.parse(localStorage.getItem('idk_modpacks') || '[]');
      mpData.push(newMp);
      localStorage.setItem('idk_modpacks', JSON.stringify(mpData));
      modpacks.push(newMp);
      activeModpackId = newMp.id;
      mpRenderList(); mpRenderDetail();
      const manifestFiles = manifest.files || [];
      for (let i = 0; i < manifestFiles.length; i++) {
        const f = manifestFiles[i];
        launchStatus.innerText = `Downloading file ${i+1} / ${manifestFiles.length}...`;
        launchFill.style.width = `${5 + (i / manifestFiles.length) * 90}`;
        try {
          // Fetch file metadata + project category in parallel
          const [fRes, projRes] = await Promise.all([
            fetch(`https://api.curse.tools/v1/cf/mods/${f.projectID}/files/${f.fileID}`),
            fetch(`https://api.curse.tools/v1/cf/mods/${f.projectID}`)
          ]);
          const fData = await fRes.json();
          if (!fData.data) continue;
          const mf = fData.data;
          let mUrl = mf.downloadUrl;
          if (!mUrl) {
            const mp1 = Math.floor(mf.id/1000), mp2 = (mf.id%1000).toString().padStart(3,'0');
            mUrl = `https://edge.forgecdn.net/files/${mp1}/${mp2}/${encodeURIComponent(mf.fileName)}`;
          }
          // Determine type from classId: 6=Mod, 12=ResourcePack, 6552=Shader
          let classId = 6;
          try { const pj = await projRes.json(); classId = pj.data?.classId ?? 6; } catch(_) {}

          if (classId === 12) {
            // Resource Pack
            newMp.resourcepacks.push({ modrinthId: f.projectID.toString(), name: mf.fileName.replace(/\.(zip|jar)$/, ''), version: mf.displayName, filename: mf.fileName, downloadUrl: mUrl, iconUrl: '' });
            await window.electronAPI.installResourcepack({ modpackId: newMp.id, downloadUrl: mUrl, filename: mf.fileName });
          } else if (classId === 6552) {
            // Shader Pack
            newMp.shaders.push({ modrinthId: f.projectID.toString(), name: mf.fileName.replace(/\.(zip|jar)$/, ''), version: mf.displayName, filename: mf.fileName, downloadUrl: mUrl, iconUrl: '' });
            await window.electronAPI.installShader({ modpackId: newMp.id, downloadUrl: mUrl, filename: mf.fileName });
          } else {
            // Default: Mod
            newMp.mods.push({ modrinthId: f.projectID.toString(), name: mf.fileName.replace(/\.jar$/, ''), version: mf.displayName, filename: mf.fileName, downloadUrl: mUrl, iconUrl: '' });
            await window.electronAPI.installMod({ modpackId: newMp.id, downloadUrl: mUrl, filename: mf.fileName });
          }
        } catch(me) { console.warn('Failed file', f.projectID, me); }
      }
      // --- Catalog resource packs / shaders / extra mods from overrides -----
      launchStatus.innerText = 'Cataloging overrides...';
      (importRes.resourcepackFiles || []).forEach(rp => {
        newMp.resourcepacks.push({ modrinthId: 'override-' + rp.filename, name: rp.name, version: 'bundled', filename: rp.filename, iconUrl: '' });
      });
      (importRes.shaderpackFiles || []).forEach(sp => {
        newMp.shaders.push({ modrinthId: 'override-' + sp.filename, name: sp.name, version: 'bundled', filename: sp.filename, iconUrl: '' });
      });
      (importRes.extraModFiles || []).forEach(em => {
        if (!newMp.mods.find(m => m.filename === em.filename)) {
          newMp.mods.push({ modrinthId: 'override-' + em.filename, name: em.name, version: 'bundled', filename: em.filename, downloadUrl: '', iconUrl: '' });
        }
      });
      // -----------------------------------------------------------------------
      const mpData2 = JSON.parse(localStorage.getItem('idk_modpacks') || '[]');
      const idx = mpData2.findIndex(m => m.id === newMp.id);
      if (idx >= 0) mpData2[idx] = newMp; else mpData2.push(newMp);
      localStorage.setItem('idk_modpacks', JSON.stringify(mpData2));
      mpRenderDetail();
      launchFill.style.width = '100%';
      overlay.classList.remove('active');
      showWarningToast(`"${newMp.name}" imported successfully!`);
    } catch(e) {
      overlay.classList.remove('active');
      showWarningToast('Import failed: ' + e.message);
      if (btn) { btn.textContent = '+ Import'; btn.disabled = false; }
    }
    return;
  }
  // ---- NORMAL MOD/RP/SHADER FLOW ----
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
    window.electronAPI.launchModpack({ username: currentUser, modpackId: mp.id, mcVersion: mp.mcVersion, loader: mp.loader, loaderVersion: mp.loaderVersion || '', javaPath, maxMemory: `${maxMemoryGB}G`, authData });
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

async function fetchTrendingModpacks() {
  const grid = document.getElementById('trending-mods-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading modpacks...</div>';
  const FALLBACK = [
    { id: '389615', name: 'RLCraft',       summary: 'A modpack designed to make Minecraft as hard as possible.',                      thumb: 'https://media.forgecdn.net/avatars/255/644/637285881806441891.png', dl: '12M',  loader: 'Forge'   },
    { id: '35539',  name: 'SkyFactory 4',  summary: 'SkyFactory 4 is a new Skyblock-inspired modpack.',                              thumb: 'https://media.forgecdn.net/avatars/145/866/636730709659626580.png', dl: '20M',  loader: 'Forge'   },
    { id: '497279', name: 'All the Mods 9',summary: 'All the Mods started as a private pack for a friend group.',                    thumb: 'https://media.forgecdn.net/avatars/740/633/638163849529059464.png', dl: '8M',   loader: 'Forge'   },
    { id: '641528', name: 'Better MC [FABRIC]', summary: 'The Better Minecraft modpack series — now for Fabric.',                   thumb: 'https://media.forgecdn.net/avatars/524/491/637880462219327988.png', dl: '6M',   loader: 'Fabric'  }
  ];
  let packs = null;
  try {
    const res = await fetch('https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=4471&sortField=2&sortOrder=desc&pageSize=4');
    const json = await res.json();
    if (json.data && json.data.length > 0) packs = json.data;
  } catch(e) { console.warn('CurseForge trending fetch failed:', e); }

  grid.innerHTML = '';
  if (packs) {
    packs.forEach(mp => {
      const thumb = mp.logo ? mp.logo.thumbnailUrl : '';
      const dl = mp.downloadCount >= 1e6 ? (mp.downloadCount/1e6).toFixed(1)+'M' : mp.downloadCount >= 1000 ? (mp.downloadCount/1000).toFixed(0)+'K' : mp.downloadCount;
      const loader = (mp.categories||[]).find(c => ['Forge','Fabric','NeoForge','Quilt'].includes(c.name))?.name || '';
      const modObj = JSON.stringify({ project_id: mp.id.toString(), title: mp.name, provider: 'curseforge' }).replace(/"/g,'&quot;');
      grid.innerHTML += `<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('${modObj}'), this);" style="cursor:pointer;">
        <div class="trending-mp-thumb" style="background-image:url('${thumb}');background-size:cover;background-position:center;"></div>
        <div class="trending-mp-info"><strong>${mp.name}</strong><p>${mp.summary}</p>
          <div class="trending-mp-meta"><span>⬇ ${dl}</span>${loader?'<span class="trending-mp-tag">'+loader+'</span>':''}</div>
        </div></div>`;
    });
  } else {
    FALLBACK.forEach(mp => {
      const modObj = JSON.stringify({ project_id: mp.id, title: mp.name, provider: 'curseforge' }).replace(/"/g,'&quot;');
      grid.innerHTML += `<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('${modObj}'), this);" style="cursor:pointer;">
        <div class="trending-mp-thumb" style="background-image:url('${mp.thumb}');background-size:cover;background-position:center;"></div>
        <div class="trending-mp-info"><strong>${mp.name}</strong><p>${mp.summary}</p>
          <div class="trending-mp-meta"><span>⬇ ${mp.dl}</span><span class="trending-mp-tag">${mp.loader}</span></div>
        </div></div>`;
    });
  }
}

// Check for Updates
async function initUpdateChecker() {
  if (window.electronAPI && window.electronAPI.checkForUpdates) {
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res && res.updateAvailable) {
        const modal = document.getElementById('update-modal');
        const verInfo = document.getElementById('update-version-info');
        const notesContainer = document.getElementById('update-notes');
        
        verInfo.textContent = `Version v${res.latestVersion} is now available (you have v${res.currentVersion}).`;
        
        // Escape HTML to prevent XSS and convert markdown elements to stylized HTML
        const htmlNotes = res.releaseNotes
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/## (.*?)(<br>|$)/g, '<h4 style="margin:10px 0 5px;color:white;font-family:var(--font-title);">$1</h4>')
          .replace(/- (.*?)(<br>|$)/g, '<div style="margin-left:8px;display:flex;gap:6px;margin-bottom:4px;"><span style="color:#60a5fa;">•</span><span>$1</span></div>');
          
        notesContainer.innerHTML = htmlNotes || '<p style="color:var(--text-muted);">No release notes provided.</p>';
        modal.classList.add('active');
        
        document.getElementById('btn-download-update').onclick = () => {
          window.electronAPI.openExternal(res.releaseUrl);
          modal.classList.remove('active');
        };
        
        document.getElementById('btn-ignore-update').onclick = () => {
          modal.classList.remove('active');
        };
      }
    } catch(e) {
      console.warn('Update check failed:', e);
    }
  }
}

// Initialize on load
fetchMojangNews();
fetchTrendingModpacks();
initUpdateChecker();

// Seamless tab transitions helper
document.querySelectorAll('.nav-tab[data-target]').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.target;
    if (target === 'main') {
      const closeMods = document.getElementById('btn-close-mods');
      const closeSettings = document.getElementById('btn-close-settings');
      if (document.getElementById('view-mods').classList.contains('active') && closeMods) closeMods.click();
      else if (document.getElementById('view-settings').classList.contains('active') && closeSettings) closeSettings.click();
    } else if (target === 'mods') {
      const openMods = document.getElementById('btn-open-mods');
      const closeSettings = document.getElementById('btn-close-settings');
      if (document.getElementById('view-settings').classList.contains('active') && closeSettings) {
        closeSettings.click();
        setTimeout(() => { if (openMods) openMods.click(); }, 50);
      } else if (openMods) {
        openMods.click();
      }
    } else if (target === 'settings') {
      const openSettings = document.getElementById('btn-open-settings');
      const closeMods = document.getElementById('btn-close-mods');
      if (document.getElementById('view-mods').classList.contains('active') && closeMods) {
        closeMods.click();
        setTimeout(() => { if (openSettings) openSettings.click(); }, 50);
      } else if (openSettings) {
        openSettings.click();
      }
    }
  });
});

// ==========================================
// Electron Click-Through & Focus Healer
// ==========================================
// Instantly restores input focus and typing capability when switching back to the app,
// bypassing the native Chromium click-through activation limits on frameless windows.
window.addEventListener('focus', () => {
  const hoveredInput = document.querySelector('input:hover, textarea:hover');
  if (hoveredInput) {
    hoveredInput.focus();
  }
});

document.addEventListener('pointerdown', (e) => {
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    target.focus();
  }
}, true);


// ============================================================================
// === IDK CONNECT - PREMIUM FRIENDS & CLOUDFLARED LAN SHARING CLIENT ENGINE ===
// ============================================================================
(function initFriendsSystem() {
  let IDK_BACKEND_URL = 'https://api.somniac.me';
  let idkToken = localStorage.getItem('idk_connect_token') || '';
  let idkUser = JSON.parse(localStorage.getItem('idk_connect_user') || 'null');
  let idkAuthTab = 'login';
  let activeTunnelUrl = null;
  let activeSharePort = null;
  let presenceInterval = null;
  let refreshInterval = null;
  let cloudflaredInstallInProgress = false;

  // DOM Elements
  const btnToggleSidebar = document.getElementById('btn-friends-toggle');
  const sidebar = document.getElementById('friends-sidebar');
  const btnCloseSidebar = document.getElementById('btn-friends-sidebar-close');
  const badgePending = document.getElementById('friends-pending-badge');
  
  const authPanel = document.getElementById('friends-auth-panel');
  const mainPanel = document.getElementById('friends-main-panel');
  
  const tabLogin = document.getElementById('tab-friends-login');
  const tabRegister = document.getElementById('tab-friends-register');
  const authError = document.getElementById('friends-auth-error');
  const inputUsername = document.getElementById('friends-auth-username');
  const inputPassword = document.getElementById('friends-auth-password');
  const btnAuthSubmit = document.getElementById('btn-friends-auth-submit');
  
  const myUsernameLabel = document.getElementById('friends-my-username');
  const myAvatarCanvas = document.getElementById('friends-my-avatar');
  const btnDisconnect = document.getElementById('btn-friends-disconnect');
  
  const shareCard = document.getElementById('friends-share-card');
  const shareInstructions = document.getElementById('friends-share-instructions');
  const shareInputRow = document.getElementById('friends-share-input-row');
  const inputSharePort = document.getElementById('friends-share-port');
  const btnShare = document.getElementById('btn-friends-share');
  const tunnelLink = document.getElementById('friends-share-tunnel-link');
  
  const progressPanel = document.getElementById('cloudflared-progress-panel');
  const statusText = document.getElementById('cloudflared-status-text');
  const percentText = document.getElementById('cloudflared-percent-text');
  const progressFill = document.getElementById('cloudflared-progress-fill');
  
  const requestsSection = document.getElementById('friends-requests-section');
  const requestsList = document.getElementById('friends-requests-list');
  const inputAddFriend = document.getElementById('friends-add-username');
  const btnAddFriend = document.getElementById('btn-friends-add');
  const friendsList = document.getElementById('friends-list');

  // --- SIDEBAR TOGGLE ---
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
      btnToggleSidebar.classList.toggle('active', sidebar.classList.contains('active'));
      if (sidebar.classList.contains('active')) {
        refreshFriendsData();
      }
    });
  }

  if (btnCloseSidebar) {
    btnCloseSidebar.addEventListener('click', () => {
      sidebar.classList.remove('active');
      btnToggleSidebar.classList.remove('active');
    });
  }

  // Close sidebar on outer click
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== btnToggleSidebar && !btnToggleSidebar.contains(e.target)) {
      sidebar.classList.remove('active');
      btnToggleSidebar.classList.remove('active');
    }
  });

  // --- AVATAR RENDERING HELPERS ---
  function drawSteveFace(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3c3c3d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function renderSkinFaceOnFriendsCanvas(canvas, username) {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const scale = img.naturalWidth / 64;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      // Head face layer
      ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, canvas.width, canvas.height);
      // Outer accessory layer (hats/masks)
      ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, canvas.width, canvas.height);
    };

    let fallbackStage = 0;
    img.onerror = () => {
      fallbackStage++;
      if (fallbackStage === 1) {
        // Try official Mojang/Minotar skins next
        img.src = `https://minotar.net/skin/${username}`;
      } else {
        // Draw standard letter avatar
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.substring(0, 2).toUpperCase(), canvas.width / 2, canvas.height / 2);
      }
    };

    // Start by checking Ely.by skins
    img.src = `https://skinsystem.ely.by/skins/${username}.png`;
  }

  // --- HTTP BACKEND REQUEST WRAPPER ---
  async function idkRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (idkToken) headers['Authorization'] = `Bearer ${idkToken}`;

    const res = await fetch(`${IDK_BACKEND_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Server request failed');
    return json;
  }

  // --- UI CONTROLLERS ---
  function updateFriendsAuthUI() {
    if (idkToken && idkUser) {
      authPanel.style.display = 'none';
      mainPanel.style.display = 'block';
      myUsernameLabel.innerText = idkUser.username;
      
      // Draw client avatar
      renderSkinFaceOnFriendsCanvas(myAvatarCanvas, idkUser.username);
      
      // Initialize intervals
      startHeartbeats();
      refreshFriendsData();
    } else {
      authPanel.style.display = 'block';
      mainPanel.style.display = 'none';
      stopHeartbeats();
    }
  }

  // --- AUTH PORTAL ACTIONS ---
  tabLogin.addEventListener('click', () => {
    idkAuthTab = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    btnAuthSubmit.innerText = 'Connect Account';
    authError.style.display = 'none';
  });

  tabRegister.addEventListener('click', () => {
    idkAuthTab = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    btnAuthSubmit.innerText = 'Create Account';
    authError.style.display = 'none';
  });

  btnAuthSubmit.addEventListener('click', handleAuth);
  [inputUsername, inputPassword].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuth();
    });
  });

  async function handleAuth() {
    const username = inputUsername.value.trim();
    const password = inputPassword.value;

    if (!username || !password) {
      showAuthError("Please fill out all fields.");
      return;
    }

    btnAuthSubmit.disabled = true;
    btnAuthSubmit.innerText = idkAuthTab === 'login' ? 'Connecting...' : 'Registering...';
    authError.style.display = 'none';

    try {
      const endpoint = idkAuthTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const data = await idkRequest(endpoint, 'POST', { username, password });
      
      idkToken = data.token;
      idkUser = data.user;
      localStorage.setItem('idk_connect_token', idkToken);
      localStorage.setItem('idk_connect_user', JSON.stringify(idkUser));
      
      inputUsername.value = '';
      inputPassword.value = '';
      
      updateFriendsAuthUI();
      showWarningToast(`Connected to IDK Network as ${idkUser.username}!`);
    } catch (err) {
      showAuthError(err.message);
    } finally {
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = idkAuthTab === 'login' ? 'Connect Account' : 'Create Account';
    }
  }

  function showAuthError(msg) {
    authError.innerText = msg;
    authError.style.display = 'block';
  }

  btnDisconnect.addEventListener('click', () => {
    if (activeTunnelUrl) {
      btnShare.click(); // Stop sharing first
    }
    if (window.electronAPI) {
      window.electronAPI.stopCloudflaredAccess();
    }
    
    idkToken = '';
    idkUser = null;
    localStorage.removeItem('idk_connect_token');
    localStorage.removeItem('idk_connect_user');
    
    updateFriendsAuthUI();
    showWarningToast("Disconnected from IDK Network.");
  });

  // --- CLOUDFLARED MULTIPLAYER SHARING ---
  btnShare.addEventListener('click', async () => {
    if (activeTunnelUrl) {
      // STOP SHARING TUNNEL
      btnShare.disabled = true;
      btnShare.innerText = 'Stopping...';
      try {
        if (window.electronAPI) {
          await window.electronAPI.stopCloudflaredTunnel();
        }
        activeTunnelUrl = null;
        activeSharePort = null;
        
        // Restore sharing Card elements
        shareCard.classList.remove('active');
        shareInstructions.innerText = 'Open your Minecraft singleplayer world, click "Open to LAN", then enter the port below to invite your friends!';
        shareInputRow.style.display = 'flex';
        tunnelLink.style.display = 'none';
        
        btnShare.innerText = 'Share';
        btnShare.classList.remove('stop-sharing');
        
        // Update presence immediately
        await sendPresenceHeartbeat();
        showWarningToast("Multi-player tunnel closed. World is private again.");
      } catch (err) {
        showWarningToast("Failed to stop tunnel cleanly.");
      } finally {
        btnShare.disabled = false;
      }
      return;
    }

    // START SHARING TUNNEL
    const portVal = parseInt(inputSharePort.value);
    if (isNaN(portVal) || portVal < 1024 || portVal > 65535) {
      showWarningToast("Please enter a valid LAN port (1024-65535)");
      return;
    }

    btnShare.disabled = true;
    btnShare.innerText = 'Starting...';
    
    if (!window.electronAPI) {
      // Fallback/Mock for Web Browsers
      setTimeout(() => {
        activeTunnelUrl = `tcp://mock-tunnel-${Math.random().toString(36).substring(3, 8)}.trycloudflare.com:54321`;
        activeSharePort = portVal;
        shareCard.classList.add('active');
        shareInstructions.innerText = 'Sharing Active! Click below to copy your IP Address. Friends can join you now:';
        shareInputRow.style.display = 'none';
        
        tunnelLink.innerText = activeTunnelUrl;
        tunnelLink.style.display = 'block';
        btnShare.innerText = 'Stop';
        btnShare.classList.add('stop-sharing');
        btnShare.disabled = false;
        
        navigator.clipboard.writeText(activeTunnelUrl);
        sendPresenceHeartbeat();
        showWarningToast("Mock Tunnel active! Copied IP address to clipboard.");
      }, 1500);
      return;
    }

    try {
      // 1. Ensure Cloudflared binary exists (downloads if not)
      progressPanel.style.display = 'block';
      statusText.innerText = 'Preparing cloudflared.exe...';
      percentText.innerText = '0%';
      progressFill.style.width = '0%';
      
      const cfStatus = await window.electronAPI.ensureCloudflared();
      if (!cfStatus.success) {
        throw new Error(cfStatus.error || "Failed to download cloudflared");
      }
      
      progressPanel.style.display = 'none';
      
      // 2. Start Cloudflared TCP tunnel forwarding LAN port
      statusText.innerText = 'Connecting tunnel...';
      const tunnelStatus = await window.electronAPI.startCloudflaredTunnel(portVal);
      if (!tunnelStatus.success) {
        throw new Error(tunnelStatus.error || "Failed to establish TCP tunnel");
      }
      
      activeTunnelUrl = tunnelStatus.url;
      activeSharePort = portVal;
      
      // Render shared status
      shareCard.classList.add('active');
      shareInstructions.innerText = 'Sharing Active! Click below to copy your IP Address. Friends can join you now:';
      shareInputRow.style.display = 'none';
      
      tunnelLink.innerText = activeTunnelUrl;
      tunnelLink.style.display = 'block';
      
      btnShare.innerText = 'Stop';
      btnShare.classList.add('stop-sharing');
      
      navigator.clipboard.writeText(activeTunnelUrl);
      
      // Update presence immediately
      await sendPresenceHeartbeat();
      showWarningToast("LAN world successfully shared! IP address copied to clipboard.");
    } catch (err) {
      showWarningToast(`Tunnel Error: ${err.message}`);
      progressPanel.style.display = 'none';
      btnShare.innerText = 'Share';
    } finally {
      btnShare.disabled = false;
    }
  });

  // Listen to cloudflared download progress
  if (window.electronAPI) {
    window.electronAPI.onCloudflaredInstallProgress((data) => {
      progressPanel.style.display = 'block';
      statusText.innerText = data.status || 'Downloading...';
      percentText.innerText = `${data.percent}%`;
      progressFill.style.width = `${data.percent}%`;
    });

    window.electronAPI.onCloudflaredTunnelClosed(() => {
      if (activeTunnelUrl) {
        // Tunnel closed from outside
        activeTunnelUrl = null;
        activeSharePort = null;
        
        shareCard.classList.remove('active');
        shareInstructions.innerText = 'Open your Minecraft singleplayer world, click "Open to LAN", then enter the port below to invite your friends!';
        shareInputRow.style.display = 'flex';
        tunnelLink.style.display = 'none';
        
        btnShare.innerText = 'Share';
        btnShare.classList.remove('stop-sharing');
        sendPresenceHeartbeat();
        showWarningToast("Tunnel connection closed unexpected.");
      }
    });
  }

  // Copy IP on link click
  tunnelLink.addEventListener('click', () => {
    if (activeTunnelUrl) {
      navigator.clipboard.writeText(activeTunnelUrl);
      showWarningToast("IP Address copied to clipboard!");
    }
  });

  // --- ADD FRIEND ACTION ---
  btnAddFriend.addEventListener('click', handleAddFriend);
  inputAddFriend.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddFriend();
  });

  async function handleAddFriend() {
    const friendName = inputAddFriend.value.trim();
    if (!friendName) return;

    btnAddFriend.disabled = true;
    try {
      const res = await idkRequest('/api/friends/request', 'POST', { username: friendName });
      inputAddFriend.value = '';
      showWarningToast(res.message);
      refreshFriendsData();
    } catch (err) {
      showWarningToast(err.message);
    } finally {
      btnAddFriend.disabled = false;
    }
  }

  // --- HEARTBEATS & SYNC ENGINE ---
  function startHeartbeats() {
    stopHeartbeats();
    
    // Heartbeat every 10 seconds to update presence
    sendPresenceHeartbeat(); // Immediate
    presenceInterval = setInterval(sendPresenceHeartbeat, 10000);
    
    // Refresh friends list & pending requests every 7 seconds
    refreshFriendsData();
    refreshInterval = setInterval(refreshFriendsData, 7000);
  }

  function stopHeartbeats() {
    if (presenceInterval) clearInterval(presenceInterval);
    if (refreshInterval) clearInterval(refreshInterval);
    presenceInterval = null;
    refreshInterval = null;
  }

  async function sendPresenceHeartbeat() {
    if (!idkToken) return;
    
    // Determine playing state from playBtn class!
    const isPlaying = playBtn.classList.contains('running');
    const playingVersion = isPlaying ? `${selectedLoader} ${selectedVersion}` : null;

    try {
      await idkRequest('/api/presence', 'POST', {
        status: 'online',
        playingVersion,
        cloudflaredUrl: activeTunnelUrl
      });
    } catch (err) {
      console.warn("[IDK Connect] Heartbeat failed", err.message);
    }
  }

  // --- REFRESH FRIENDS & RENDER LISTS ---
  async function refreshFriendsData() {
    if (!idkToken) return;

    try {
      // 1. Fetch friend list
      const friendsData = await idkRequest('/api/friends');
      renderFriendsList(friendsData.friends);

      // 2. Fetch pending requests
      const reqData = await idkRequest('/api/friends/requests');
      renderFriendRequests(reqData.requests);
      
      // Update badge count
      const reqCount = reqData.requests.length;
      badgePending.innerText = reqCount;
      badgePending.style.display = reqCount > 0 ? 'flex' : 'none';
    } catch (err) {
      console.warn("[IDK Connect] Sync failed", err.message);
    }
  }

  function renderFriendRequests(requests) {
    if (!requests || requests.length === 0) {
      requestsSection.style.display = 'none';
      requestsList.innerHTML = '';
      return;
    }

    requestsSection.style.display = 'flex';
    requestsList.innerHTML = '';

    requests.forEach(req => {
      const card = document.createElement('div');
      card.className = 'friend-request-card';
      card.innerHTML = `
        <div class="friend-request-info">
          <strong>${req.username}</strong>
          <span>Wants to be friends</span>
        </div>
        <div class="friend-request-actions">
          <button class="friend-request-btn accept" data-id="${req.requestId}" title="Accept Request">✓</button>
          <button class="friend-request-btn decline" data-id="${req.requestId}" title="Decline Request">✕</button>
        </div>
      `;

      card.querySelector('.accept').onclick = () => handleFriendRequest(req.requestId, true);
      card.querySelector('.decline').onclick = () => handleFriendRequest(req.requestId, false);
      requestsList.appendChild(card);
    });
  }

  async function handleFriendRequest(requestId, accept) {
    try {
      const res = await idkRequest('/api/friends/requests/handle', 'POST', { requestId, accept });
      showWarningToast(res.message);
      refreshFriendsData();
    } catch (err) {
      showWarningToast(err.message);
    }
  }

  function renderFriendsList(friends) {
    if (!friends || friends.length === 0) {
      friendsList.innerHTML = '<div class="friends-list-empty">Your friends list is empty.</div>';
      return;
    }

    friendsList.innerHTML = '';

    // Sort friends: Hosting first, then Online, then Offline
    const sorted = [...friends].sort((a, b) => {
      if (a.cloudflaredUrl && !b.cloudflaredUrl) return -1;
      if (!a.cloudflaredUrl && b.cloudflaredUrl) return 1;
      if (a.status !== 'offline' && b.status === 'offline') return -1;
      if (a.status === 'offline' && b.status !== 'offline') return 1;
      return a.username.localeCompare(b.username);
    });

    sorted.forEach(friend => {
      const card = document.createElement('div');
      card.className = 'friend-card';
      
      const isOnline = friend.status !== 'offline';
      const isHosting = !!friend.cloudflaredUrl;
      const isPlaying = !!friend.playingVersion && !isHosting;
      
      let statusText = 'Offline';
      let statusClass = '';
      if (isHosting) {
        statusText = `Hosting ${friend.playingVersion || ''}`;
        statusClass = 'hosting';
      } else if (isPlaying) {
        statusText = `Playing ${friend.playingVersion}`;
        statusClass = 'playing';
      } else if (isOnline) {
        statusText = 'Online';
        statusClass = 'online';
      }

      card.innerHTML = `
        <div class="friend-card-left">
          <div class="friend-avatar ${isOnline ? 'online' : ''}">
            <canvas id="friend-avatar-${friend.id}" width="28" height="28" style="image-rendering:pixelated;width:100%;height:100%;"></canvas>
          </div>
          <div class="friend-info">
            <strong>${friend.username}</strong>
            <span class="friend-status-text ${statusClass}">
              <span class="friend-status-dot ${isOnline ? 'online' : ''}"></span>
              ${statusText}
            </span>
          </div>
        </div>
        <div class="friend-card-right">
          ${isHosting ? `<button class="friend-join-btn" title="Join Friend's LAN game!">JOIN</button>` : ''}
          <button class="friend-remove-btn" title="Unfriend" data-id="${friend.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="11" x2="23" y2="11"></line></svg>
          </button>
        </div>
      `;

      // Render canvas face async
      const canvas = card.querySelector(`#friend-avatar-${friend.id}`);
      if (canvas) {
        renderSkinFaceOnFriendsCanvas(canvas, friend.username);
      }

      // Hook Remove Friend
      card.querySelector('.friend-remove-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to remove ${friend.username} as a friend?`)) {
          unfriend(friend.id);
        }
      };

      // Hook Join World
      if (isHosting) {
        card.querySelector('.friend-join-btn').onclick = () => joinFriendWorld(friend);
      }

      friendsList.appendChild(card);
    });
  }

  async function unfriend(friendId) {
    try {
      const res = await idkRequest(`/api/friends/${friendId}`, 'DELETE');
      showWarningToast(res.message);
      refreshFriendsData();
    } catch (err) {
      showWarningToast(err.message);
    }
  }

  // --- JOIN GAME ACTION ---
  function joinFriendWorld(friend) {
    if (!friend.cloudflaredUrl) return;

    let host, port;
    let connectAddressText;

    if (friend.cloudflaredUrl.startsWith('https://')) {
      host = '127.0.0.1';
      port = 25565;
      connectAddressText = '127.0.0.1:25565';
      if (window.electronAPI) {
        window.electronAPI.startCloudflaredAccess(friend.cloudflaredUrl, 25565);
        showWarningToast("Connecting secure bridge over Cloudflare network...");
      }
    } else {
      const hostPort = friend.cloudflaredUrl.replace('tcp://', '');
      const parts = hostPort.split(':');
      host = parts[0];
      port = parseInt(parts[1]);
      connectAddressText = hostPort;
    }

    if (isNaN(port)) {
      showWarningToast("Failed to parse friend's server port.");
      return;
    }

    // Copy IP as fallback
    navigator.clipboard.writeText(connectAddressText);

    // If game is already running, show a notification that IP is copied
    if (playBtn.classList.contains('running')) {
      showWarningToast(`IP copied to clipboard! Paste it in Minecraft Multiplayer Direct Connect to join ${friend.username}.`);
      return;
    }

    // Set quickConnectTarget details
    quickConnectTarget = { host, port };

    // Auto-switch Version & Loader if they mismatch!
    let mustSwitch = false;
    let playingVer = friend.playingVersion || '';
    
    let friendLoader = selectedLoader;
    let friendVersion = selectedVersion;
    
    if (playingVer) {
      let parts = playingVer.split(' ');
      if (parts.length > 1) {
        friendLoader = parts[0];
        friendVersion = parts[1];
      } else {
        // Fallback for single word playingVersion
        if (['Vanilla', 'Fabric', 'Forge', 'NeoForge', 'Quilt'].includes(parts[0])) {
          friendLoader = parts[0];
        } else {
          friendVersion = parts[0];
        }
      }
    }

    if (selectedVersion !== friendVersion || selectedLoader !== friendLoader) {
      mustSwitch = true;
      
      // Auto switch loader dropdown selection
      selectedLoader = friendLoader;
      const loaderTriggerText = document.getElementById('selected-loader-text');
      if (loaderTriggerText) {
        loaderTriggerText.innerHTML = `<span style="display: flex; align-items: center; gap: 8px;">${friendLoader}</span>`;
      }
      document.querySelectorAll('#loader-dropdown .custom-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.loader === friendLoader);
      });
      
      // Auto switch version dropdown selection
      selectedVersion = friendVersion;
      renderVersions();
    }

    if (mustSwitch) {
      showWarningToast(`Auto-switched to ${friendLoader} ${friendVersion} to match ${friend.username}! Launching game...`);
    } else {
      showWarningToast(`Launching Minecraft to join ${friend.username}'s world!`);
    }

    // Programmatically launch the game!
    setTimeout(() => {
      playBtn.click();
    }, 800);
  }

  // --- INITIAL CHECK ---
  updateFriendsAuthUI();
})();



