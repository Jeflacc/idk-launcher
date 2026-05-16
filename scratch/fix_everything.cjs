const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

// 1. Replace the mod-provider-select HTML with pill-buttons
src = src.replace(
  /<div style="padding: 0 24px 12px; display: flex; align-items: center; gap: 10px;">[\s\S]*?<\/select>\n      <\/div>/,
  `<div class="browser-provider-bar">
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
      </div>`
);

// 2. Replace the old provider-select listener with pill listener logic
const selectListenerMatch = /document\.getElementById\('mod-provider-select'\)\.addEventListener\('change', \(e\) => \{[\s\S]*?\}\);/g;
src = src.replace(selectListenerMatch, `const providerPills = document.querySelectorAll('.provider-pill');
providerPills.forEach(pill => {
  pill.addEventListener('click', () => {
    providerPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentProvider = pill.getAttribute('data-provider');
    mpBrowse(document.getElementById('mod-search').value);
  });
});`);

// 3. Fix mpBrowse
// a. Data hit mapping
const cfMappingTarget = `const res = await fetch(\`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=\${classId}&searchFilter=\${encodeURIComponent(query)}&gameVersion=\${mp.mcVersion}&pageSize=20\`);
      data = await res.json();
    }`;
const cfMappingReplace = `let gameVerStr = mp ? \`&gameVersion=\${mp.mcVersion}\` : '';
      if (browserMode === 'modpack') gameVerStr = '';
      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=\${classId}&searchFilter=\${encodeURIComponent(query)}\${gameVerStr}&pageSize=20\`);
      const cfData = await res.json();
      data = {
        data: cfData.data, // keep this for the curseforge logic loop below
        hits: (cfData.data || []).map(mod => ({
          project_id: mod.id.toString(),
          title: mod.name,
          description: mod.summary,
          icon_url: mod.logo ? mod.logo.thumbnailUrl : '',
          downloads: mod.downloadCount,
          follows: 0,
          provider: 'curseforge'
        }))
      };
    }`;
src = src.replace(cfMappingTarget, cfMappingReplace);

// b. Installed IDs crash fix
const installedIdsTarget = `const installedIds = browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId) : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId) : (mp.shaders||[]).map(s=>s.modrinthId);`;
const installedIdsReplace = `const installedIds = browserMode === 'modpack' ? [] : (browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId) : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId) : (mp.shaders||[]).map(s=>s.modrinthId));`;
src = src.replace(installedIdsTarget, installedIdsReplace);

// c. Modpack mode force curseforge in openBrowser
const openBrowserTarget = `document.getElementById('browser-title').innerText = titles[mode];`;
const openBrowserReplace = `document.getElementById('browser-title').innerText = titles[mode];
  document.getElementById('provider-pill-group').style.display = mode === 'modpack' ? 'none' : 'flex';
  if (mode === 'modpack') {
    currentProvider = 'curseforge';
  } else {
    currentProvider = document.querySelector('.provider-pill.active')?.getAttribute('data-provider') || 'modrinth';
  }`;
src = src.replace(openBrowserTarget, openBrowserReplace);

// 4. Update Trending cards onclick
const trendingClickTarget = `<div class="trending-mp-card" onclick="openBrowser('modpack')" style="cursor:pointer;">`;
const trendingClickReplace = `<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem({ project_id: '\${mp.id.toString()}', title: '\${mp.name.replace(/'/g, '\\\\\\'')}', provider: 'curseforge' }, this);" style="cursor:pointer;">`;
src = src.replace(new RegExp(trendingClickTarget.replace(/[.*+?^$\{}()|[\]\\]/g, '\\$&'), 'g'), trendingClickReplace);

fs.writeFileSync('src/main.js', src, 'utf8');
console.log('Fixed everything.');
