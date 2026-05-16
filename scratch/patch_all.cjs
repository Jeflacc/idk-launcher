const fs = require('fs');

// Start from the clean original
let src = fs.readFileSync('scratch/main_original.js', 'utf8');

// ============================================================
// 1. HTML: Replace "Trending on Modrinth" section
// ============================================================
src = src.replace(
  `            <h2 class="section-title">Trending on Modrinth</h2>
            <div class="news-grid" id="trending-mods-grid">
              <div style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">Loading marketplace...</div>
            </div>`,
  `            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
              <h2 class="section-title" style="margin-bottom:0;">Trending Modpacks</h2>
              <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.489 0H0l2.286 4.5H8.48L6.49 0h-.001zM17.51 0H11.02l1.99 4.5h6.494L17.51 0zM0 6.75l5.614 12.5H9.64L4.025 6.75H0zm19.975 0H15.95L10.337 19.25h4.025L19.975 6.75zm-9.988 0l5.613 12.5H9.988L4.374 6.75h5.613z"/></svg>
                CurseForge
              </span>
            </div>
            <div class="trending-modpacks-grid" id="trending-mods-grid">
              <div style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">Loading modpacks...</div>
            </div>`
);

// ============================================================
// 2. HTML: Replace mod browser header with provider pill bar
// ============================================================
src = src.replace(
  `    <div class="mod-browser" id="mod-browser">
      <div class="mod-browser-header">
        <h3 id="browser-title">Browse on Modrinth</h3>
        <button class="mod-browser-close" id="btn-close-browser">✕</button>
      </div>
      <input type="text" class="clean-input" id="mod-search" placeholder="Search..." style="margin:0 24px 16px;width:calc(100% - 48px);" />`,
  `    <div class="mod-browser" id="mod-browser">
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
      <input type="text" class="clean-input" id="mod-search" placeholder="Search..." style="margin:0 24px 16px;width:calc(100% - 48px);" />`
);

// ============================================================
// 3. JS: Add currentProvider state variable
// ============================================================
src = src.replace(
  `let activeModpackId = null;\nlet browserMode = 'mod'; // 'mod' | 'resourcepack' | 'shader'`,
  `let activeModpackId = null;\nlet browserMode = 'mod'; // 'mod' | 'resourcepack' | 'shader' | 'modpack'\nlet currentProvider = 'modrinth';`
);

// ============================================================
// 4. JS: Update openBrowser titles + provider pill logic
// ============================================================
src = src.replace(
  `  const titles = { mod: 'Browse Mods on Modrinth', resourcepack: 'Browse Resource Packs', shader: 'Browse Shaders' };`,
  `  const titles = { mod: 'Browse Mods', resourcepack: 'Browse Resource Packs', shader: 'Browse Shaders', modpack: 'Browse Modpacks' };`
);

// ============================================================
// 5. JS: Add modpack to openBrowser + hide pills for modpack mode
// ============================================================
src = src.replace(
  `document.getElementById('btn-browse-mods').addEventListener('click', () => openBrowser('mod'));
document.getElementById('btn-browse-rp').addEventListener('click', () => openBrowser('resourcepack'));
document.getElementById('btn-browse-shaders').addEventListener('click', () => openBrowser('shader'));
document.getElementById('btn-close-browser').addEventListener('click', () => document.getElementById('mod-browser').classList.remove('active'));`,
  `document.getElementById('btn-browse-mods').addEventListener('click', () => openBrowser('mod'));
document.getElementById('btn-browse-rp').addEventListener('click', () => openBrowser('resourcepack'));
document.getElementById('btn-browse-shaders').addEventListener('click', () => openBrowser('shader'));
document.getElementById('btn-close-browser').addEventListener('click', () => document.getElementById('mod-browser').classList.remove('active'));

// Provider pill switching
document.querySelectorAll('.provider-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentProvider = pill.getAttribute('data-provider');
    mpBrowse(document.getElementById('mod-search').value);
  });
});`
);

// ============================================================
// 6. JS: Replace mpBrowse with CurseForge-aware version
// ============================================================
const oldMpBrowse = `async function mpBrowse(query) {
  const mp = mpGet(); if (!mp) return;
  const results = document.getElementById('mod-browser-results');
  results.innerHTML = \`<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching Modrinth...</div>\`;
  try {
    let facets;
    if (browserMode === 'mod') {
      facets = encodeURIComponent(JSON.stringify([[\`categories:\${mp.loader.toLowerCase()}\`],[\`versions:\${mp.mcVersion}\`],[\`project_type:mod\`]]));
    } else if (browserMode === 'resourcepack') {
      facets = encodeURIComponent(JSON.stringify([[\`versions:\${mp.mcVersion}\`],[\`project_type:resourcepack\`]]));
    } else {
      facets = encodeURIComponent(JSON.stringify([[\`project_type:shader\`]]));
    }
    const res = await fetch(\`https://api.modrinth.com/v2/search?query=\${encodeURIComponent(query)}&facets=\${facets}&limit=20\`);
    const data = await res.json();
    results.innerHTML = '';
    if (!data.hits || data.hits.length === 0) {
      results.innerHTML = \`<div class="mp-loading">No results found for "\${query}"</div>\`; return;
    }
    const installedIds = browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId)
      : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId)
      : (mp.shaders||[]).map(s=>s.modrinthId);
    data.hits.forEach(mod => {
      const installed = installedIds.includes(mod.project_id);
      const el = document.createElement('div');
      el.className = 'mod-result-card';
      el.innerHTML = \`
        \${mod.icon_url ? \`<img class="mod-result-icon" src="\${mod.icon_url}" onerror="this.style.display='none'" />\` : \`<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;"></div>\`}
        <div class="mod-result-info">
          <strong>\${mod.title}</strong><span>\${mod.description}</span>
          <div class="mod-result-meta"><span>&#11015; \${mod.downloads>=1000?(mod.downloads/1000).toFixed(0)+'K':mod.downloads}</span><span>&#128101; \${mod.follows}</span></div>
        </div>
        <button class="add-mod-btn \${installed?'installed':''}" \${installed?'disabled':''}>\${installed?'&#10003; Added':'+ Add'}</button>\`;
      if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(mod, el.querySelector('.add-mod-btn')));
      results.appendChild(el);
    });
  } catch(e) {
    results.innerHTML = \`<div class="mp-loading">Failed to fetch. Check your internet.</div>\`;
  }
}`;

const newMpBrowse = `async function mpBrowse(query) {
  const mp = mpGet();
  if (!mp && browserMode !== 'modpack') return;
  const results = document.getElementById('mod-browser-results');
  results.innerHTML = \`<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching \${currentProvider === 'modrinth' ? 'Modrinth' : 'CurseForge'}...</div>\`;
  try {
    let hits = [];
    if (currentProvider === 'modrinth') {
      let facets;
      if (browserMode === 'mod') facets = encodeURIComponent(JSON.stringify([[\`categories:\${mp.loader.toLowerCase()}\`],[\`versions:\${mp.mcVersion}\`],[\`project_type:mod\`]]));
      else if (browserMode === 'resourcepack') facets = encodeURIComponent(JSON.stringify([[\`versions:\${mp.mcVersion}\`],[\`project_type:resourcepack\`]]));
      else facets = encodeURIComponent(JSON.stringify([[\`project_type:shader\`]]));
      const res = await fetch(\`https://api.modrinth.com/v2/search?query=\${encodeURIComponent(query)}&facets=\${facets}&limit=20\`);
      const data = await res.json();
      hits = (data.hits || []).map(m => ({ project_id: m.project_id, title: m.title, description: m.description, icon_url: m.icon_url, downloads: m.downloads, follows: m.follows, provider: 'modrinth' }));
    } else {
      let classId = 6;
      if (browserMode === 'resourcepack') classId = 12;
      else if (browserMode === 'shader') classId = 6552;
      else if (browserMode === 'modpack') classId = 4471;
      const gameVerStr = (mp && browserMode !== 'modpack') ? \`&gameVersion=\${mp.mcVersion}\` : '';
      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=\${classId}&searchFilter=\${encodeURIComponent(query)}\${gameVerStr}&pageSize=20\`);
      const data = await res.json();
      hits = (data.data || []).map(m => ({ project_id: m.id.toString(), title: m.name, description: m.summary, icon_url: m.logo ? m.logo.thumbnailUrl : '', downloads: m.downloadCount, follows: 0, provider: 'curseforge' }));
    }
    results.innerHTML = '';
    if (!hits.length) { results.innerHTML = \`<div class="mp-loading">No results found for "\${query}"</div>\`; return; }
    const installedIds = browserMode === 'modpack' ? [] : (browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId) : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId) : (mp.shaders||[]).map(s=>s.modrinthId));
    hits.forEach(mod => {
      const installed = installedIds.includes(mod.project_id);
      const el = document.createElement('div');
      el.className = 'mod-result-card';
      el.innerHTML = \`
        \${mod.icon_url ? \`<img class="mod-result-icon" src="\${mod.icon_url}" onerror="this.style.display='none'" />\` : \`<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;"></div>\`}
        <div class="mod-result-info">
          <strong>\${mod.title}</strong><span>\${mod.description}</span>
          <div class="mod-result-meta"><span>&#11015; \${mod.downloads>=1000?(mod.downloads/1000).toFixed(0)+'K':mod.downloads}</span></div>
        </div>
        <button class="add-mod-btn \${installed?'installed':''}" \${installed?'disabled':''}>\${installed?'&#10003; Added':(browserMode==='modpack'?'+ Import':'+ Add')}</button>\`;
      if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(mod, el.querySelector('.add-mod-btn')));
      results.appendChild(el);
    });
  } catch(e) {
    results.innerHTML = \`<div class="mp-loading">Failed to fetch. Check your internet.</div>\`;
  }
}`;

src = src.replace(oldMpBrowse, newMpBrowse);

// ============================================================
// 7. JS: Inject modpack import logic at top of mpAddItem
// ============================================================
src = src.replace(
  `async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  const mp = passedMp || mpGet(); if (!mp) return;`,
  `async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  // ---- MODPACK IMPORT FLOW ----
  if (browserMode === 'modpack' && !isDependency) {
    if (btn) { btn.textContent = 'Fetching...'; btn.disabled = true; }
    try {
      const projectId = typeof mod === 'string' ? mod : mod.project_id;
      const modName = typeof mod === 'string' ? 'Modpack' : mod.title;
      const filesRes = await fetch(\`https://api.curse.tools/v1/cf/mods/\${projectId}/files\`);
      const filesData = await filesRes.json();
      let files = filesData.data || [];
      files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate));
      if (!files.length) { showWarningToast('No downloadable files found.'); if(btn){btn.textContent='+ Import';btn.disabled=false;} return; }
      const fileObj = files[0];
      let dlUrl = fileObj.downloadUrl;
      if (!dlUrl) {
        const p1 = Math.floor(fileObj.id / 1000);
        const p2 = (fileObj.id % 1000).toString().padStart(3, '0');
        dlUrl = \`https://edge.forgecdn.net/files/\${p1}/\${p2}/\${encodeURIComponent(fileObj.fileName)}\`;
      }
      document.getElementById('mod-browser').classList.remove('active');
      overlay.classList.add('active');
      launchStatus.innerText = 'Downloading modpack archive...';
      launchFill.style.width = '5%';
      if (!window.electronAPI) { overlay.classList.remove('active'); showWarningToast('Only available in the desktop app.'); return; }
      const importRes = await window.electronAPI.downloadCurseforgeModpack({ downloadUrl: dlUrl });
      if (!importRes.success) throw new Error(importRes.error || 'Import failed');
      const manifest = importRes.manifest;
      const loaderStr = (manifest.minecraft?.modLoaders?.[0]?.id || '').toLowerCase();
      const loader = loaderStr.includes('fabric') ? 'Fabric' : loaderStr.includes('forge') ? 'Forge' : loaderStr.includes('neoforge') ? 'NeoForge' : 'Vanilla';
      const mcVersion = manifest.minecraft?.version || '1.20.4';
      const newMp = { id: importRes.modpackId, name: manifest.name || modName, mcVersion, loader, mods: [], resourcepacks: [], shaders: [] };
      const mpData = JSON.parse(localStorage.getItem('idk_modpacks') || '[]');
      mpData.push(newMp);
      localStorage.setItem('idk_modpacks', JSON.stringify(mpData));
      modpacks.push(newMp);
      activeModpackId = newMp.id;
      mpRenderList(); mpRenderDetail();
      const manifestFiles = manifest.files || [];
      for (let i = 0; i < manifestFiles.length; i++) {
        const f = manifestFiles[i];
        launchStatus.innerText = \`Downloading mod \${i+1} / \${manifestFiles.length}...\`;
        launchFill.style.width = \`\${5 + (i / manifestFiles.length) * 90}\`;
        try {
          const fRes = await fetch(\`https://api.curse.tools/v1/cf/mods/\${f.projectID}/files/\${f.fileID}\`);
          const fData = await fRes.json();
          if (!fData.data) continue;
          const mf = fData.data;
          let mUrl = mf.downloadUrl;
          if (!mUrl) {
            const mp1 = Math.floor(mf.id/1000), mp2 = (mf.id%1000).toString().padStart(3,'0');
            mUrl = \`https://edge.forgecdn.net/files/\${mp1}/\${mp2}/\${encodeURIComponent(mf.fileName)}\`;
          }
          newMp.mods.push({ modrinthId: f.projectID.toString(), name: mf.fileName.replace(/\\.jar$/, ''), version: mf.displayName, filename: mf.fileName, downloadUrl: mUrl, iconUrl: '' });
          await window.electronAPI.installMod({ modpackId: newMp.id, downloadUrl: mUrl, filename: mf.fileName });
        } catch(me) { console.warn('Failed mod', f.projectID, me); }
      }
      const mpData2 = JSON.parse(localStorage.getItem('idk_modpacks') || '[]');
      const idx = mpData2.findIndex(m => m.id === newMp.id);
      if (idx >= 0) mpData2[idx] = newMp; else mpData2.push(newMp);
      localStorage.setItem('idk_modpacks', JSON.stringify(mpData2));
      mpRenderDetail();
      launchFill.style.width = '100%';
      overlay.classList.remove('active');
      showWarningToast(\`"\${newMp.name}" imported successfully!\`);
    } catch(e) {
      overlay.classList.remove('active');
      showWarningToast('Import failed: ' + e.message);
      if (btn) { btn.textContent = '+ Import'; btn.disabled = false; }
    }
    return;
  }
  // ---- NORMAL MOD/RP/SHADER FLOW ----
  const mp = passedMp || mpGet(); if (!mp) return;`
);

// ============================================================
// 8. JS: Replace fetchTrendingMods with fetchTrendingModpacks
// ============================================================
const oldFetch = `async function fetchTrendingMods() {
  const grid = document.getElementById('trending-mods-grid');
  if (!grid) return;
  try {
    const facets = encodeURIComponent(JSON.stringify([["project_type:mod"]]));
    const res = await fetch(\`https://api.modrinth.com/v2/search?limit=4&facets=\${facets}\`);
    const data = await res.json();
    grid.innerHTML = '';
    data.hits.forEach(mod => {
      grid.innerHTML += \`
        <div class="news-card" onclick="alert('Select a modpack from the left sidebar to install mods!')" style="cursor:pointer;">
          <div class="news-img" style="background-image: url('\${mod.icon_url || ''}'); background-size: cover; background-position: center; border-bottom: 1px solid var(--border-color); height: 160px;"></div>
          <div class="news-content">
            <h3 style="font-size: 15px; margin-bottom: 6px;">\${mod.title}</h3>
            <p style="font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-muted);">\${mod.description}</p>
          </div>
        </div>
      \`;
    });
  } catch(e) {
    grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted); width: 100%; text-align: center;">Failed to load marketplace.</div>';
  }
}

// Initialize on load
fetchMojangNews();
fetchTrendingMods();`;

const newFetch = `async function fetchTrendingModpacks() {
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
      grid.innerHTML += \`<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('\${modObj}'), this);" style="cursor:pointer;">
        <div class="trending-mp-thumb" style="background-image:url('\${thumb}');background-size:cover;background-position:center;"></div>
        <div class="trending-mp-info"><strong>\${mp.name}</strong><p>\${mp.summary}</p>
          <div class="trending-mp-meta"><span>&#11015; \${dl}</span>\${loader?'<span class="trending-mp-tag">'+loader+'</span>':''}</div>
        </div></div>\`;
    });
  } else {
    FALLBACK.forEach(mp => {
      const modObj = JSON.stringify({ project_id: mp.id, title: mp.name, provider: 'curseforge' }).replace(/"/g,'&quot;');
      grid.innerHTML += \`<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('\${modObj}'), this);" style="cursor:pointer;">
        <div class="trending-mp-thumb" style="background-image:url('\${mp.thumb}');background-size:cover;background-position:center;"></div>
        <div class="trending-mp-info"><strong>\${mp.name}</strong><p>\${mp.summary}</p>
          <div class="trending-mp-meta"><span>&#11015; \${mp.dl}</span><span class="trending-mp-tag">\${mp.loader}</span></div>
        </div></div>\`;
    });
  }
}

// Initialize on load
fetchMojangNews();
fetchTrendingModpacks();`;

src = src.replace(oldFetch, newFetch);

// ============================================================
// Write output
// ============================================================
fs.writeFileSync('src/main.js', src, 'utf8');
console.log('Patch complete. Lines:', src.split('\n').length);
