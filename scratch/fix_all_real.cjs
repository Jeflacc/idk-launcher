const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

// 1. Fix HTML: "Trending on Modrinth" -> "Trending Modpacks" and add Curseforge logo
src = src.replace(/<h2 class="section-title">Trending on Modrinth<\/h2>[\s\S]*?<div class="trending-modpacks-grid" id="trending-mods-grid">/, 
`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
              <h2 class="section-title" style="margin-bottom:0;">Trending Modpacks</h2>
              <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.489 0H0l2.286 4.5H8.48L6.49 0h-.001zM17.51 0H11.02l1.99 4.5h6.494L17.51 0zM0 6.75l5.614 12.5H9.64L4.025 6.75H0zm19.975 0H15.95L10.337 19.25h4.025L19.975 6.75zm-9.988 0l5.613 12.5H9.988L4.374 6.75h5.613z"/></svg>
                CurseForge
              </span>
            </div>
            <div class="trending-modpacks-grid" id="trending-mods-grid">`);

// 2. Fix JS: fetchTrendingMods -> fetchTrendingModpacks
src = src.replace(/async function fetchTrendingMods\(\) \{[\s\S]*?fetchTrendingMods\(\);/g, 
`async function fetchTrendingModpacks() {
  const grid = document.getElementById('trending-mods-grid');
  if (!grid) return;
  try {
    const res = await fetch('https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=4471&sortField=2&sortOrder=desc&pageSize=4');
    const data = await res.json();
    grid.innerHTML = '';
    if (!data.data || data.data.length === 0) { grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);width:100%;">No modpacks found.</div>'; return; }
    data.data.forEach(mp => {
      const thumb = mp.logo ? mp.logo.thumbnailUrl : '';
      const dl = mp.downloadCount >= 1000000 ? (mp.downloadCount/1000000).toFixed(1)+'M' : mp.downloadCount >= 1000 ? (mp.downloadCount/1000).toFixed(0)+'K' : mp.downloadCount;
      const loaderTags = (mp.categories || []).filter(c => ['Forge','Fabric','NeoForge','Quilt'].includes(c.name)).map(c => \`<span class="trending-mp-tag">\${c.name}</span>\`).join('');
      const modObj = { project_id: mp.id.toString(), title: mp.name.replace(/'/g, "\\\\'"), provider: 'curseforge' };
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
fetchTrendingModpacks();`);

fs.writeFileSync('src/main.js', src, 'utf8');
console.log('Fixed HTML and JS.');
