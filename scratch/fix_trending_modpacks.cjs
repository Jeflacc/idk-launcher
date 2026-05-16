const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

const targetStr = `async function fetchTrendingMods() {
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

const replacementStr = `async function fetchTrendingModpacks() {
  const grid = document.getElementById('trending-mods-grid');
  if (!grid) return;
  try {
    // CurseForge classId 4471 = Modpacks, sorted by popularity
    const res = await fetch('https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=4471&sortField=2&sortOrder=desc&pageSize=4');
    const data = await res.json();
    grid.innerHTML = '';
    if (!data.data || data.data.length === 0) { grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);width:100%;">No modpacks found.</div>'; return; }
    data.data.forEach(mp => {
      const thumb = mp.logo ? mp.logo.thumbnailUrl : '';
      const dl = mp.downloadCount >= 1000000 ? (mp.downloadCount/1000000).toFixed(1)+'M' : mp.downloadCount >= 1000 ? (mp.downloadCount/1000).toFixed(0)+'K' : mp.downloadCount;
      const loaderTags = (mp.categories || []).filter(c => ['Forge','Fabric','NeoForge','Quilt'].includes(c.name)).map(c => \`<span class="trending-mp-tag">\${c.name}</span>\`).join('');
      
      const modObj = { project_id: mp.id.toString(), title: mp.name.replace(/'/g, "\\'"), provider: 'curseforge' };
      const modObjStr = JSON.stringify(modObj).replace(/"/g, '&quot;');
      
      grid.innerHTML += \`
        <div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('\${modObjStr}'), this);" style="cursor:pointer;">
          <div class="trending-mp-thumb" style="background-image:url('\${thumb}');"></div>
          <div class="trending-mp-info">
            <strong>\${mp.name}</strong>
            <p>\${mp.summary}</p>
            <div class="trending-mp-meta">
              <span>⬇ \${dl}</span>
              \${loaderTags}
            </div>
          </div>
        </div>
      \`;
    });
  } catch(e) {
    grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted); width: 100%; text-align: center;">Failed to load modpacks.</div>';
  }
}

// Initialize on load
fetchMojangNews();
fetchTrendingModpacks();`;

src = src.replace(targetStr, replacementStr);

fs.writeFileSync('src/main.js', src, 'utf8');
console.log('Fixed trending modpacks');
