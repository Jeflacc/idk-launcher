// patch_overrides.cjs
// Adds resource pack / shader / extra mod cataloging after CurseForge modpack import
const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

// ── Target: the old final-save block inside mpAddItem ──────────────────────
const OLD = `      const mpData2 = JSON.parse(localStorage.getItem('idk_modpacks') || '[]');
      const idx = mpData2.findIndex(m => m.id === newMp.id);
      if (idx >= 0) mpData2[idx] = newMp; else mpData2.push(newMp);
      localStorage.setItem('idk_modpacks', JSON.stringify(mpData2));
      mpRenderDetail();
      launchFill.style.width = '100%';
      overlay.classList.remove('active');`;

const NEW = `      // --- Catalog resource packs / shaders / extra mods from overrides -----
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
      overlay.classList.remove('active');`;

if (!src.includes(OLD)) {
  console.error('ERROR: Target block not found in src/main.js. It may have already been patched or the text has changed.');
  process.exit(1);
}

src = src.replace(OLD, NEW);
fs.writeFileSync('src/main.js', src, 'utf8');
console.log('patch_overrides: Done. Lines:', src.split('\n').length);
