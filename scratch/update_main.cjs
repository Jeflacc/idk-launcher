const fs = require('fs');

let mainJs = fs.readFileSync('src/main.js', 'utf8');

// 1. Add Dropdown to HTML template
mainJs = mainJs.replace(
  '<h3 id="browser-title">Browse on Modrinth</h3>\n        <button class="mod-browser-close" id="btn-close-browser">✕</button>\n      </div>\n      <input type="text" class="clean-input" id="mod-search"',
  '<h3 id="browser-title">Browse Mods</h3>\n        <button class="mod-browser-close" id="btn-close-browser">✕</button>\n      </div>\n      <div style="padding: 0 24px 12px; display: flex; align-items: center; gap: 10px;">\n        <span style="font-size: 13px; color: var(--text-muted);">Source:</span>\n        <select id="mod-provider-select" class="clean-select" style="width: 140px;">\n          <option value="modrinth">Modrinth</option>\n          <option value="curseforge">CurseForge</option>\n        </select>\n      </div>\n      <input type="text" class="clean-input" id="mod-search"'
);

// 2. Add currentProvider state
mainJs = mainJs.replace(
  "let activeModpackId = null;\nlet browserMode = 'mod'; // 'mod' | 'resourcepack' | 'shader'",
  "let activeModpackId = null;\nlet browserMode = 'mod'; // 'mod' | 'resourcepack' | 'shader'\nlet currentProvider = 'modrinth';"
);

// 3. Update titles in openBrowser
mainJs = mainJs.replace(
  "const titles = { mod: 'Browse Mods on Modrinth', resourcepack: 'Browse Resource Packs', shader: 'Browse Shaders' };",
  "const titles = { mod: 'Browse Mods', resourcepack: 'Browse Resource Packs', shader: 'Browse Shaders' };"
);

// 4. Add provider select listener
mainJs = mainJs.replace(
  "document.getElementById('btn-close-browser').addEventListener('click', () => document.getElementById('mod-browser').classList.remove('active'));",
  "document.getElementById('btn-close-browser').addEventListener('click', () => document.getElementById('mod-browser').classList.remove('active'));\n\ndocument.getElementById('mod-provider-select').addEventListener('change', (e) => {\n  currentProvider = e.target.value;\n  mpBrowse(document.getElementById('mod-search').value);\n});"
);

// 5. Replace mpBrowse
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
          <div class="mod-result-meta"><span>⬇ \${mod.downloads>=1000?(mod.downloads/1000).toFixed(0)+'K':mod.downloads}</span><span>👥 \${mod.follows}</span></div>
        </div>
        <button class="add-mod-btn \${installed?'installed':''}" \${installed?'disabled':''}>\${installed?'✓ Added':'+ Add'}</button>\`;
      if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(mod, el.querySelector('.add-mod-btn')));
      results.appendChild(el);
    });
  } catch(e) {
    results.innerHTML = \`<div class="mp-loading">Failed to fetch. Check your internet.</div>\`;
  }
}`;

const newMpBrowse = `async function mpBrowse(query) {
  const mp = mpGet(); if (!mp) return;
  const results = document.getElementById('mod-browser-results');
  results.innerHTML = \`<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching \${currentProvider === 'modrinth' ? 'Modrinth' : 'CurseForge'}...</div>\`;
  try {
    let data;
    if (currentProvider === 'modrinth') {
      let facets;
      if (browserMode === 'mod') facets = encodeURIComponent(JSON.stringify([[\`categories:\${mp.loader.toLowerCase()}\`],[\`versions:\${mp.mcVersion}\`],[\`project_type:mod\`]]));
      else if (browserMode === 'resourcepack') facets = encodeURIComponent(JSON.stringify([[\`versions:\${mp.mcVersion}\`],[\`project_type:resourcepack\`]]));
      else facets = encodeURIComponent(JSON.stringify([[\`project_type:shader\`]]));
      const res = await fetch(\`https://api.modrinth.com/v2/search?query=\${encodeURIComponent(query)}&facets=\${facets}&limit=20\`);
      data = await res.json();
    } else {
      let classId = 6;
      if (browserMode === 'resourcepack') classId = 12;
      else if (browserMode === 'shader') classId = 6552;
      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=\${classId}&searchFilter=\${encodeURIComponent(query)}&gameVersion=\${mp.mcVersion}&pageSize=20\`);
      data = await res.json();
    }
    
    results.innerHTML = '';
    const installedIds = browserMode === 'mod' ? (mp.mods||[]).map(m=>m.modrinthId) : browserMode === 'resourcepack' ? (mp.resourcepacks||[]).map(r=>r.modrinthId) : (mp.shaders||[]).map(s=>s.modrinthId);
      
    if (currentProvider === 'modrinth') {
      if (!data.hits || data.hits.length === 0) { results.innerHTML = \`<div class="mp-loading">No results found for "\${query}"</div>\`; return; }
      data.hits.forEach(mod => {
        const installed = installedIds.includes(mod.project_id);
        const el = document.createElement('div'); el.className = 'mod-result-card';
        el.innerHTML = \`
          \${mod.icon_url ? \`<img class="mod-result-icon" src="\${mod.icon_url}" onerror="this.style.display='none'" />\` : \`<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;"></div>\`}
          <div class="mod-result-info"><strong>\${mod.title}</strong><span>\${mod.description}</span><div class="mod-result-meta"><span>⬇ \${mod.downloads>=1000?(mod.downloads/1000).toFixed(0)+'K':mod.downloads}</span><span>👥 \${mod.follows}</span></div></div>
          <button class="add-mod-btn \${installed?'installed':''}" \${installed?'disabled':''}>\${installed?'✓ Added':'+ Add'}</button>\`;
        if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(mod, el.querySelector('.add-mod-btn')));
        results.appendChild(el);
      });
    } else {
      if (!data.data || data.data.length === 0) { results.innerHTML = \`<div class="mp-loading">No results found for "\${query}"</div>\`; return; }
      data.data.forEach(mod => {
        const pId = mod.id.toString();
        const installed = installedIds.includes(pId);
        const iconUrl = mod.logo ? mod.logo.thumbnailUrl : '';
        const downloads = mod.downloadCount;
        const el = document.createElement('div'); el.className = 'mod-result-card';
        el.innerHTML = \`
          \${iconUrl ? \`<img class="mod-result-icon" src="\${iconUrl}" onerror="this.style.display='none'" />\` : \`<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;"></div>\`}
          <div class="mod-result-info"><strong>\${mod.name}</strong><span>\${mod.summary}</span><div class="mod-result-meta"><span>⬇ \${downloads>=1000?(downloads/1000).toFixed(0)+'K':downloads}</span></div></div>
          <button class="add-mod-btn \${installed?'installed':''}" \${installed?'disabled':''}>\${installed?'✓ Added':'+ Add'}</button>\`;
        const modObj = { provider: 'curseforge', project_id: pId, title: mod.name, icon_url: iconUrl };
        if (!installed) el.querySelector('.add-mod-btn').addEventListener('click', () => mpAddItem(modObj, el.querySelector('.add-mod-btn')));
        results.appendChild(el);
      });
    }
  } catch(e) { results.innerHTML = \`<div class="mp-loading">Failed to fetch. Check your internet.</div>\`; }
}`;

mainJs = mainJs.replace(oldMpBrowse, newMpBrowse);

// 6. Replace mpAddItem
const newMpAddItem = `async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  const mp = passedMp || mpGet(); if (!mp) return;
  if (btn) { btn.textContent = '⬇ Fetching...'; btn.disabled = true; }
  try {
    const projectId = typeof mod === 'string' ? mod : mod.project_id;
    const modTitle = typeof mod === 'string' ? 'Dependency' : mod.title;
    const modIcon = typeof mod === 'string' ? '' : (mod.icon_url || '');
    const isCurseForge = typeof mod !== 'string' && mod.provider === 'curseforge';
    let fileObj, versionStr, dlUrl, fileName;

    if (isCurseForge) {
      if (browserMode === 'mod' && mp.mods.find(m => m.modrinthId === projectId)) { if(btn) { btn.textContent = '✓ Added'; btn.classList.add('installed'); } return; }
      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/\${projectId}/files?gameVersion=\${mp.mcVersion}\`);
      const filesData = await res.json();
      let validFiles = filesData.data || [];
      if (browserMode === 'mod') {
         validFiles = validFiles.filter(f => {
            if (!f.sortableGameVersions) return false;
            const loaders = f.sortableGameVersions.filter(v => ['Fabric','Forge','NeoForge','Quilt'].includes(v.gameVersionName));
            if (loaders.length > 0) return loaders.some(l => l.gameVersionName.toLowerCase() === mp.loader.toLowerCase());
            return true;
         });
      }
      if (!validFiles.length) { if(btn) { showWarningToast(\`\${modTitle} has no compatible version.\`); btn.textContent='+ Add'; btn.disabled=false; } return; }
      validFiles.sort((a,b) => new Date(b.fileDate) - new Date(a.fileDate));
      fileObj = validFiles[0];
      versionStr = fileObj.displayName;
      fileName = fileObj.fileName;
      dlUrl = fileObj.downloadUrl;
      if (!dlUrl) {
         const p1 = Math.floor(fileObj.id / 1000);
         const p2 = (fileObj.id % 1000).toString().padStart(3, '0');
         dlUrl = \`https://edge.forgecdn.net/files/\${p1}/\${p2}/\${encodeURIComponent(fileName)}\`;
      }
      if (browserMode === 'mod' && fileObj.dependencies) {
         for (const dep of fileObj.dependencies) {
            if (dep.relationType === 3) {
               const depRes = await fetch(\`https://api.curse.tools/v1/cf/mods/\${dep.modId}\`);
               const depData = await depRes.json();
               if (depData.data) {
                  const depModObj = { provider: 'curseforge', project_id: depData.data.id.toString(), title: depData.data.name, icon_url: depData.data.logo ? depData.data.logo.thumbnailUrl : '' };
                  await mpAddItem(depModObj, null, true, mp);
               }
            }
         }
      }
    } else {
      if ((browserMode === 'mod' || isDependency) && mp.mods.find(m => m.modrinthId === projectId)) { if(btn) { btn.textContent = '✓ Added'; btn.classList.add('installed'); } return; }
      let url = \`https://api.modrinth.com/v2/project/\${projectId}/version\`;
      if (browserMode === 'mod' || isDependency) url += \`?loaders=\${encodeURIComponent(JSON.stringify([mp.loader.toLowerCase()]))}&game_versions=\${encodeURIComponent(JSON.stringify([mp.mcVersion]))}\`;
      else if (browserMode === 'resourcepack') url += \`?game_versions=\${encodeURIComponent(JSON.stringify([mp.mcVersion]))}\`;
      const res = await fetch(url);
      const versions = await res.json();
      if (!versions.length) { if(btn) { showWarningToast(\`\${modTitle} has no compatible version.\`); btn.textContent='+ Add'; btn.disabled=false; } return; }
      const versionObj = versions[0];
      fileObj = versionObj.files.find(f=>f.primary)||versionObj.files[0];
      versionStr = versionObj.version_number;
      fileName = fileObj.filename;
      dlUrl = fileObj.url;
      if ((browserMode === 'mod' || isDependency) && versionObj.dependencies) {
        for (const dep of versionObj.dependencies) {
          if (dep.dependency_type === 'required' && dep.project_id) {
            await mpAddItem(dep.project_id, null, true, mp);
          }
        }
      }
    }
    const entry = { modrinthId: projectId, name: modTitle === 'Dependency' ? fileName.split('-')[0] : modTitle, version: versionStr, filename: fileName, downloadUrl: dlUrl, iconUrl: modIcon };
    if (browserMode === 'mod' || isDependency) mp.mods.push(entry);
    else if (browserMode === 'resourcepack') mp.resourcepacks.push(entry);
    else mp.shaders.push(entry);
    mpSave(); 
    if (btn) btn.textContent='⬇ Installing...';
    if (window.electronAPI) {
      if (browserMode === 'mod' || isDependency) await window.electronAPI.installMod({ modpackId: mp.id, downloadUrl: dlUrl, filename: fileName });
      else if (browserMode === 'resourcepack') await window.electronAPI.installResourcepack({ modpackId: mp.id, downloadUrl: dlUrl, filename: fileName });
      else await window.electronAPI.installShader({ modpackId: mp.id, downloadUrl: dlUrl, filename: fileName });
    }
    if (btn) { btn.textContent = '✓ Added'; btn.classList.add('installed'); }
    mpRenderDetail(); mpRenderList();
  } catch(e) {
    if (btn && !isDependency) {
      showWarningToast(\`Failed to add \${typeof mod === 'string' ? mod : mod.title}: \${e.message}\`);
      btn.textContent = '+ Add'; btn.disabled = false;
    }
  }
}`;

const oldMpAddItemStart = mainJs.indexOf('async function mpAddItem');
const oldMpAddItemEnd = mainJs.indexOf('// --- Play Modpack ---', oldMpAddItemStart);
mainJs = mainJs.substring(0, oldMpAddItemStart) + newMpAddItem + "\n\n" + mainJs.substring(oldMpAddItemEnd);

fs.writeFileSync('src/main.js', mainJs, 'utf8');
console.log('Update applied');
