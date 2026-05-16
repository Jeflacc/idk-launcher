const fs = require('fs');
let src = fs.readFileSync('src/main.js', 'utf8');

const targetStr = `async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  const mp = passedMp || mpGet(); if (!mp) return;`;

const replacementStr = `async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
  if (browserMode === 'modpack') {
    if (btn) { btn.textContent = '⬇ Fetching...'; btn.disabled = true; }
    try {
      const projectId = typeof mod === 'string' ? mod : mod.project_id;
      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/\${projectId}/files\`);
      const filesData = await res.json();
      let validFiles = filesData.data || [];
      if (!validFiles.length) { showWarningToast("No downloadable files for this modpack."); if(btn){btn.textContent='+ Install';btn.disabled=false;} return; }
      validFiles.sort((a,b) => new Date(b.fileDate) - new Date(a.fileDate));
      const fileObj = validFiles[0];
      
      let dlUrl = fileObj.downloadUrl;
      if (!dlUrl) {
         const p1 = Math.floor(fileObj.id / 1000);
         const p2 = (fileObj.id % 1000).toString().padStart(3, '0');
         dlUrl = \`https://edge.forgecdn.net/files/\${p1}/\${p2}/\${encodeURIComponent(fileObj.fileName)}\`;
      }
      
      document.getElementById('mod-browser').classList.remove('active');
      overlay.classList.add('active');
      launchStatus.innerText = 'Downloading Modpack...';
      launchFill.style.width = '10%';
      
      if (window.electronAPI) {
        const importRes = await window.electronAPI.downloadCurseforgeModpack({ downloadUrl: dlUrl });
        if (!importRes.success) throw new Error(importRes.error);
        
        const manifest = importRes.manifest;
        const loaderStr = manifest.minecraft?.modLoaders?.[0]?.id || '';
        const loader = loaderStr.toLowerCase().includes('fabric') ? 'Fabric' : (loaderStr.toLowerCase().includes('forge') ? 'Forge' : 'Vanilla');
        const mcVersion = manifest.minecraft?.version || '1.20.4';
        
        const newMp = { 
          id: importRes.modpackId, 
          name: manifest.name || 'Imported Modpack', 
          mcVersion, 
          loader, 
          mods: [], resourcepacks: [], shaders: [] 
        };
        
        modpacks.push(newMp);
        activeModpackId = newMp.id;
        mpSave();
        mpRenderList(); mpRenderDetail();
        
        const files = manifest.files || [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          launchStatus.innerText = \`Downloading mod \${i+1} of \${files.length}...\`;
          launchFill.style.width = \`\${10 + (i/files.length)*90}%\`;
          
          try {
            const modRes = await fetch(\`https://api.curse.tools/v1/cf/mods/\${f.projectID}\`);
            const modData = await modRes.json();
            if (!modData.data) continue;
            const fileRes = await fetch(\`https://api.curse.tools/v1/cf/mods/\${f.projectID}/files/\${f.fileID}\`);
            const fileData = await fileRes.json();
            if (!fileData.data) continue;
            
            const mfileObj = fileData.data;
            let mUrl = mfileObj.downloadUrl;
            if (!mUrl) {
               const mp1 = Math.floor(mfileObj.id / 1000);
               const mp2 = (mfileObj.id % 1000).toString().padStart(3, '0');
               mUrl = \`https://edge.forgecdn.net/files/\${mp1}/\${mp2}/\${encodeURIComponent(mfileObj.fileName)}\`;
            }
            
            const modObj = { provider: 'curseforge', project_id: f.projectID.toString(), title: modData.data.name, icon_url: modData.data.logo ? modData.data.logo.thumbnailUrl : '' };
            const mentry = { modrinthId: modObj.project_id, name: modObj.title, version: mfileObj.displayName, filename: mfileObj.fileName, downloadUrl: mUrl, iconUrl: modObj.icon_url };
            newMp.mods.push(mentry);
            await window.electronAPI.installMod({ modpackId: newMp.id, downloadUrl: mUrl, filename: mfileObj.fileName });
          } catch(me) {
             console.error('Failed to download mod', f.projectID, me);
          }
        }
        mpSave(); mpRenderDetail();
        overlay.classList.remove('active');
        showWarningToast('Modpack imported successfully!');
      }
    } catch(e) {
      overlay.classList.remove('active');
      showWarningToast('Failed to import modpack: ' + e.message);
      if(btn){btn.textContent='+ Install';btn.disabled=false;}
    }
    return;
  }

  const mp = passedMp || mpGet(); if (!mp) return;`;

src = src.replace(targetStr, replacementStr);
fs.writeFileSync('src/main.js', src, 'utf8');
console.log('Restored mpAddItem modpack logic');
