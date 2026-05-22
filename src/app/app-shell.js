export function renderAppShell() {
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
          <div class="nav-tab" data-target="main">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Play
          </div>
          <div class="nav-tab" data-target="mods">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            Modpacks
          </div>
          <div class="nav-tab" data-target="settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path></svg>
            Settings
          </div>
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
          <div class="user-profile-3d-wrap">
            <canvas id="profile-3d-canvas" width="50" height="100"></canvas>
          </div>
          <div class="user-avatar" style="display: none;">
            <canvas id="avatar-canvas" width="28" height="28" style="width:100%;height:100%;image-rendering:pixelated;"></canvas>
          </div>
          <div class="user-details" style="display: flex; flex-direction: column; align-items: flex-start; gap: 1px;">
            <span style="font-size: 8px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.8px; line-height: 1; font-family: inherit;">Playing as</span>
            <h4 id="display-username" style="font-size: 13px; font-weight: 800; color: white; margin: 0; line-height: 1.1; font-family: var(--font-title); letter-spacing: 0.5px;">PlayerOne</h4>
            <span style="display: none;">Offline Account</span>
          </div>
        </div>
        
        <div class="profile-dropdown" id="profile-dropdown">
          <div class="profile-dropdown-item" id="btn-dropdown-skin" style="display:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 8a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z"></path></svg>
            Change Skin (Ely.by)
          </div>
          <div class="profile-dropdown-item" id="btn-dropdown-3d-skin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            View 3D Skin
          </div>
          <div class="profile-dropdown-item logout" id="btn-dropdown-logout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log Out
          </div>
        </div>
      </div>
      <div class="window-controls">
        <div class="ctrl minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1">
            <line x1="0" y1="6" x2="12" y2="6"></line>
          </svg>
        </div>
        <div class="ctrl maximize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="0.5" y="0.5" width="11" height="11"></rect>
          </svg>
        </div>
        <div class="ctrl close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1">
            <line x1="0" y1="0" x2="12" y2="12"></line>
            <line x1="12" y1="0" x2="0" y2="12"></line>
          </svg>
        </div>
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
                  <div class="version-tabs">
                    <button class="version-tab active" data-tab="all">All Versions</button>
                    <button class="version-tab" data-tab="downloaded">Downloaded</button>
                  </div>
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

          <button class="refresh-versions-btn" id="btn-refresh-versions" title="Refresh downloaded versions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>

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
          <button class="manage-mods-button" id="manage-mods-btn" style="display: none;">MANAGE MODS</button>
        </div>
      </div>
    </div>
    
    <div class="details-section">
      <div class="details-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <!-- Minecraft-style sword icon for Time Played -->
              <img src="/playtime.png" alt="Time Played" style="width:28px;height:28px;image-rendering:pixelated;" />
            </div>
            <div class="stat-info">
              <h4>Time Played</h4>
              <h2 id="stat-playtime">0.0h</h2>
            </div>
          </div>
        </div>

        <div class="news-section">
          <div class="section-header">
            <h2 class="section-title">Latest News</h2>
            <div class="section-decoration">
              <div class="decoration-block"></div>
              <div class="decoration-block"></div>
              <div class="decoration-block"></div>
            </div>
          </div>
          <div class="news-grid" id="mojang-news-grid">
            <div style="padding: 60px 40px; text-align: center; color: var(--text-muted); width: 100%; grid-column: 1 / -1;">
              <div style="font-size: 48px; margin-bottom: 16px;">≡ƒô░</div>
              <div>Loading Mojang news...</div>
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
          <h3>Global Java Arguments</h3>
          <p>Advanced JVM arguments applied to all modpacks. Example: -XX:+UseG1GC -XX:+ParallelRefProcEnabled</p>
          <input type="text" class="clean-input" style="text-align: left; font-size:11px;" id="global-java-args" placeholder="Leave empty for defaults" />
        </div>

        <div class="settings-section">
          <h3>Default Game Window Size</h3>
          <p>Set the default window resolution when launching Minecraft.</p>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="number" class="clean-input" id="default-window-width" placeholder="Width" style="text-align:center; flex:1;" value="1024" />
            <span style="color:var(--text-muted);">×</span>
            <input type="number" class="clean-input" id="default-window-height" placeholder="Height" style="text-align:center; flex:1;" value="768" />
            <label class="toggle-switch" style="margin:0;">
              <input type="checkbox" id="fullscreen-toggle" />
              <div class="switch"></div>
              <span style="color: var(--text-main); font-size: 12px; margin-left: 4px;">Fullscreen</span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>In-Game Overlay</h3>
          <p>Enable the interactive in-game overlay featuring web browser, friends list, and discord status.</p>
          <label class="toggle-switch" style="margin-top: 8px;">
            <input type="checkbox" id="overlay-toggle" />
            <div class="switch"></div>
            <span style="color: var(--text-main); font-size: 14px; margin-left: 4px;">Enable In-Game Overlay (Experimental, please turn on Fullscreen)</span>
          </label>
        </div>

        <div class="settings-section">
          <h3>Performance Boost Pack</h3>
          <p>For Fabric launches, install a compatible optimization pack when available: Sodium, Lithium, FerriteCore, and EntityCulling.</p>
          <label class="toggle-switch" style="margin-top: 8px;">
            <input type="checkbox" id="auto-optimization" />
            <div class="switch"></div>
            <span style="color: var(--text-main); font-size: 14px; margin-left: 4px;">Auto-install Fabric performance mods</span>
          </label>
        </div>

        <div class="settings-section performance-settings-section">
          <h3>Launcher Performance</h3>
          <p>Choose how much animation and background rendering the launcher should use while browsing.</p>
          <div class="performance-mode-grid" id="launcher-performance-modes">
            <button class="performance-mode-card" data-performance-mode="quality">
              <strong>Quality</strong>
              <span>Full motion and visual polish.</span>
            </button>
            <button class="performance-mode-card active" data-performance-mode="balanced">
              <strong>Balanced</strong>
              <span>Smooth UI with quieter background work.</span>
            </button>
            <button class="performance-mode-card" data-performance-mode="eco">
              <strong>Eco</strong>
              <span>Minimum animation and GPU usage.</span>
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3>Game Directory</h3>
          <p>Open the folder where your Minecraft game files, mods, and resource packs are stored.</p>
          <button class="submit-btn" id="btn-open-folder" style="width: auto; padding: 10px 20px;">Open Minecraft Folder</button>
        </div>

        <div class="settings-section">
          <h3>Launcher Updates</h3>
          <p>Check for new versions of the IDK Launcher and stay up to date with the latest features.</p>
          <button class="submit-btn" id="btn-check-launcher-updates" style="width: auto; padding: 10px 20px;">Check for Updates</button>
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
          <button class="create-modpack-btn" id="btn-browse-modpacks">Browse Modpacks</button>
          <button class="create-modpack-btn" id="btn-import-modpack">Import Zip</button>
          <button class="create-modpack-btn" id="btn-new-modpack">+ New Modpack</button>
        </div>
      </div>
      <div class="mods-container">
        <div class="modpacks-sidebar">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:6px;">
            <p class="sidebar-label">YOUR MODPACKS</p>
            <button class="mp-action-btn back" id="btn-refresh-profiles" title="Refresh all profiles from disk">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <button class="mp-action-btn back" id="btn-back-modpacks" title="Back to Modpacks">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>
          </div>
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
              <div style="display:flex;align-items:center;gap:16px;flex:1;">
                <div id="modpack-icon-display" title="Click to change icon" style="width:80px;height:80px;border-radius:0px;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;border:3px solid #4cb837;transition:all 0.2s;box-shadow:inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.3);">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4cb837" stroke-width="1.5" style="opacity:0.8;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                </div>
                <div style="flex:1;">
                  <h2 id="modpack-name-display" style="font-size:28px;margin-bottom:2px;font-family:var(--font-title);font-weight:900;letter-spacing:1px;color:#ffffff;text-shadow:2px 2px 0 rgba(0,0,0,0.5);">Modpack</h2>
                  <p id="modpack-meta-display" style="font-size:13px;color:#a0a0a0;margin-bottom:12px;font-weight:600;font-family:var(--font-title);">MC 1.20.4 · Fabric</p>
                  <div style="display:flex;gap:20px;font-size:12px;align-items:center;font-family:var(--font-title);flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:6px;color:#ffffff;font-weight:600;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4cb837" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                      <span id="mp-stat-version">1.20.4</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;color:#ffffff;font-weight:600;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4cb837" stroke-width="2.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"></path></svg>
                      <span id="mp-stat-playtime">0h played</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;color:#ffffff;font-weight:600;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4cb837" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                      <span id="mp-stat-loader">Fabric</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;color:#ffffff;font-weight:600;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      <span id="mp-stat-achievements">0 Achievements</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;align-items:stretch;">
                <div style="display:flex;gap:8px;align-items:center;">
                  <button class="mp-action-btn icon-btn" id="btn-export-modpack" title="Export Modpack" style="flex:1;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></button>
                  <button class="mp-action-btn icon-btn" id="btn-delete-modpack" title="Delete" style="flex:1;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button>
                  <button class="mp-action-btn icon-btn" id="btn-modpack-settings" title="Settings" style="flex:1;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path></svg></button>
                </div>
                <button class="mp-action-btn play" id="btn-play-modpack" style="padding:12px 24px;font-size:14px;font-weight:600;font-family:var(--font-title);width:100%;">PLAY</button>
              </div>
            </div>
            <div class="mp-tabs">
              <button class="mp-tab active" data-tab="mods">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                Mods <span class="mp-tab-count" id="mod-count">0</span>
              </button>
              <button class="mp-tab" data-tab="resourcepacks">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Resource Packs <span class="mp-tab-count" id="rp-count">0</span>
              </button>
              <button class="mp-tab" data-tab="shaders">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><path d="M12 12l-4-2.3v4.6l4 2.3 4-2.3v-4.6l-4 2.3z" fill="currentColor" opacity="0.3"></path></svg>
                Shaders <span class="mp-tab-count" id="shader-count">0</span>
              </button>
              <div class="mp-tabs-spacer"></div>
              <button class="mp-action-btn browse" id="btn-check-updates" onclick="window.handleCheckUpdatesClick?.();">Check Updates</button>
              <button class="mp-action-btn browse" id="btn-browse-mods" data-tab="mods">+ Add Mods</button>
              <button class="mp-action-btn browse" id="btn-browse-rp" data-tab="resourcepacks" style="display:none;">+ Add Resource Packs</button>
              <button class="mp-action-btn browse" id="btn-browse-shaders" data-tab="shaders" style="display:none;">+ Add Shaders</button>
            </div>
            <div class="mp-tab-content active" id="tab-mods">
              <div class="mp-scroll-area">
                <div class="mods-grid" id="installed-mods-list"></div>
              </div>
            </div>
            <div class="mp-tab-content" id="tab-resourcepacks">
              <div class="mp-scroll-area">
                <div class="mods-grid" id="installed-rp-list"></div>
              </div>
            </div>
            <div class="mp-tab-content" id="tab-shaders">
              <div class="mp-scroll-area">
                <div class="mods-grid" id="installed-shaders-list"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mod-browser" id="mod-browser">
        <div class="mod-browser-header">
          <h3 id="browser-title">Browse Mods</h3>
          <button class="mod-browser-close" id="btn-close-browser">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
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

      <div class="mp-settings-modal" id="mp-settings-modal">
        <div class="mp-settings-box">
          <div class="mp-settings-header">
            <h3>Modpack Settings</h3>
            <button class="mp-settings-close" id="btn-close-mp-settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="mp-settings-content">
            <div class="mp-settings-section">
              <label>Modpack Name</label>
              <input type="text" class="clean-input" id="mp-settings-name" placeholder="Modpack name..." style="text-align:left;" />
            </div>
            
            <div class="mp-settings-section">
              <label>Description</label>
              <textarea class="clean-input" id="mp-settings-description" placeholder="Add a description for this modpack..." style="text-align:left; min-height:80px; resize:vertical;"></textarea>
            </div>
            
            <div class="mp-settings-section">
              <label>Minecraft Version</label>
              <select class="clean-select" id="mp-settings-version"></select>
            </div>
            
            <div class="mp-settings-section">
              <label>Mod Loader</label>
              <select class="clean-select" id="mp-settings-loader">
                <option value="Vanilla">Vanilla</option>
                <option value="Fabric">Fabric</option>
                <option value="Forge">Forge</option>
                <option value="NeoForge">NeoForge</option>
                <option value="Quilt">Quilt</option>
              </select>
            </div>
            
            <div class="mp-settings-section">
              <label>Loader Version</label>
              <input type="text" class="clean-input" id="mp-settings-loader-version" placeholder="Auto-detected" style="text-align:left;" />
            </div>
            
            <div class="mp-settings-section">
              <label>Java Arguments</label>
              <input type="text" class="clean-input" id="mp-settings-java-args" placeholder="e.g., -XX:+UseG1GC -XX:+ParallelRefProcEnabled" style="text-align:left; font-size:11px;" />
              <small style="color:var(--text-muted); display:block; margin-top:4px;">Advanced JVM arguments for this modpack</small>
            </div>
            
            <div class="mp-settings-section">
              <label>Game Window Size</label>
              <div style="display:flex; gap:8px;">
                <input type="number" class="clean-input" id="mp-settings-width" placeholder="Width" style="text-align:center; flex:1;" />
                <span style="display:flex; align-items:center; color:var(--text-muted);">×</span>
                <input type="number" class="clean-input" id="mp-settings-height" placeholder="Height" style="text-align:center; flex:1;" />
              </div>
            </div>
            
            <div class="mp-settings-actions">
              <button class="submit-btn" id="btn-save-mp-settings" style="flex:1;">Save Changes</button>
              <button class="modal-btn" id="btn-cancel-mp-settings" style="flex:1;">Cancel</button>
            </div>
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
      <h3>IDK CONNECT <span style="font-size: 11px; color: var(--text-muted); font-weight: 500; vertical-align: middle; margin-left: 6px; letter-spacing: 0.5px; opacity: 0.8;">(Beta)</span></h3>
      <button class="friends-sidebar-close" id="btn-friends-sidebar-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
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
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:4px;">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Connected
              </span>
            </div>
          </div>
          <button class="friends-identity-disconnect" id="btn-friends-disconnect" title="Disconnect Account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
        
        <!-- Share LAN World Card -->
        <div class="friends-share-card" id="friends-share-card">
          <h4>
            <!-- Minecraft-style signal/antenna icon for LAN hosting -->
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
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
              <!-- Minecraft-style add player icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
                <line x1="19" y1="8" x2="19" y2="14"></line>
                <line x1="22" y1="11" x2="16" y2="11"></line>
              </svg>
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

  <!-- MOD UPDATE CHECKER MODAL -->
  <div class="custom-modal" id="mod-updates-modal">
    <div class="modal-content mod-updates-modal-content">
      <div class="updates-modal-header">
        <div>
          <span class="updates-kicker">Modpack maintenance</span>
          <h3>Mod Updates</h3>
        </div>
        <button class="mp-settings-close" id="btn-close-mod-updates">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div id="mod-updates-content">
        <div class="updates-empty">Checking for updates...</div>
      </div>
    </div>
  </div>

  <!-- CHANGELOG VIEWER MODAL -->
  <div class="custom-modal" id="changelog-modal">
    <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 id="changelog-title" style="margin: 0; font-size: 18px; font-weight: 700;">Changelog</h3>
        <button class="mp-settings-close" id="btn-close-changelog">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div id="changelog-content" style="color: white;">
        <div style="text-align: center; padding: 20px; color: #a0a0a0;">Loading changelog...</div>
      </div>
    </div>
  </div>

  <!-- CRASH LOG ANALYZER MODAL -->
  <div class="custom-modal" id="crash-analyzer-modal">
    <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Crash Log Analyzer</h3>
        <button class="mp-settings-close" id="btn-close-crash-analyzer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #4cb837; text-transform: uppercase;">Paste Crash Log</label>
        <textarea id="crash-log-input" class="clean-input" placeholder="Paste your crash log here..." style="width: 100%; min-height: 150px; resize: vertical; text-align: left; font-family: monospace; font-size: 11px;"></textarea>
      </div>
      <button class="submit-btn" id="btn-analyze-crash" style="width: 100%; margin-bottom: 16px;">Analyze Crash Log</button>
      <div id="crash-analysis-result" style="color: white;">
        <!-- Analysis results will be displayed here -->
      </div>
    </div>
  </div>

  <!-- DEPENDENCY RESOLVER MODAL -->
  <div class="custom-modal" id="dependencies-modal">
    <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Missing Dependencies</h3>
        <button class="mp-settings-close" id="btn-close-dependencies">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div id="dependencies-content" style="color: white;">
        <div style="text-align: center; padding: 20px; color: #a0a0a0;">Scanning for dependencies...</div>
      </div>
    </div>
  </div>

`;
}


