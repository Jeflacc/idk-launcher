const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

// Find the broken section start (after sidebar close div) and end (before mp-create-modal)
const startMark = '<div class="modpacks-list" id="modpacks-list"></div>\r\n      </div>';
const endMark = '<div class="mp-create-modal" id="mp-create-modal">';

const startIdx = src.indexOf(startMark);
const endIdx = src.indexOf(endMark);

if (startIdx === -1) { console.error('START not found'); process.exit(1); }
if (endIdx === -1) { console.error('END not found'); process.exit(1); }

const before = src.substring(0, startIdx);
const after = src.substring(endIdx);

const replacement = `<div class="modpacks-list" id="modpacks-list"></div>
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
            <div><h3 id="modpack-name-display">Modpack</h3><p id="modpack-meta-display">MC 1.20.4 \u00b7 Fabric</p></div>
            <div style="display:flex;gap:10px;align-items:center;">
              <button class="mp-action-btn play" id="btn-play-modpack">\u25b6 Play</button>
              <button class="mp-action-btn delete" id="btn-delete-modpack" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button>
            </div>
          </div>
          <div class="mp-tabs">
            <button class="mp-tab active" data-tab="mods">\uD83E\uDDE9 Mods <span class="mp-tab-count" id="mod-count">0</span></button>
            <button class="mp-tab" data-tab="resourcepacks">\uD83C\uDFA8 Resource Packs <span class="mp-tab-count" id="rp-count">0</span></button>
            <button class="mp-tab" data-tab="shaders">\u2728 Shaders <span class="mp-tab-count" id="shader-count">0</span></button>
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
              <span class="shader-note">\u26a0 Requires Fabric + Iris Shaders mod</span>
            </div>
            <div class="mods-grid" id="installed-shaders-list"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="mod-browser" id="mod-browser">
      <div class="mod-browser-header">
        <h3 id="browser-title">Browse Mods</h3>
        <button class="mod-browser-close" id="btn-close-browser">\u2715</button>
      </div>
      <div class="browser-provider-bar">
        <span class="browser-provider-label">Source</span>
        <div class="provider-pill-group" id="provider-pill-group">
          <button class="provider-pill active" data-provider="modrinth" id="pill-modrinth">
            <svg width="13" height="13" viewBox="0 0 512 514" fill="currentColor"><path d="M239.99 0C107.45 0 0 107.45 0 239.99v34.02C0 406.55 107.45 514 239.99 514h34.02c76.47 0 145.65-33.01 194.49-85.22l-82.08-82.08C354.2 382.52 308.05 405.57 256.58 406.09V317.08c39.8-.67 73.43-23.79 90.51-57.29h85.47c9.13 0 16.91 5.94 19.07 14.65L512 274.44V239.99C512 107.45 404.55 0 272.01 0h-32.02zm16.59 95.79v.02c83.21 0 152.62 58.09 169.49 136.02h-85.06c-14.88-33.37-48.24-56.49-87.12-57.13h2.69V95.79z"/></svg>
            Modrinth
          </button>
          <button class="provider-pill" data-provider="curseforge" id="pill-curseforge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.489 0H0l2.286 4.5H8.48L6.49 0h-.001zM17.51 0H11.02l1.99 4.5h6.494L17.51 0zM0 6.75l5.614 12.5H9.64L4.025 6.75H0zm19.975 0H15.95L10.337 19.25h4.025L19.975 6.75zm-9.988 0l5.613 12.5H9.988L4.374 6.75h5.613z"/></svg>
            CurseForge
          </button>
        </div>
      </div>
      <input type="text" class="clean-input" id="mod-search" placeholder="Search..." style="margin:0 24px 16px;width:calc(100% - 48px);" />
      <div class="mod-browser-results" id="mod-browser-results"></div>
    </div>
    `;

fs.writeFileSync('src/main.js', before + replacement + after, 'utf8');
console.log('HTML fixed. Lines:', fs.readFileSync('src/main.js','utf8').split('\n').length);
