const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="mod-browser-results"></div></body></html>`);
const document = dom.window.document;

async function test() {
  const results = document.getElementById('mod-browser-results');
  results.innerHTML = `<div class="mp-loading">Searching...</div>`;
  try {
    let hits = [];
    const query = 'rlcraft';
    const res = await fetch(`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=4471&searchFilter=${encodeURIComponent(query)}&pageSize=20`);
    const data = await res.json();
    hits = (data.data || []).map(m => ({ project_id: m.id.toString(), title: m.name, description: m.summary, icon_url: m.logo ? m.logo.thumbnailUrl : '', downloads: m.downloadCount, follows: 0, provider: 'curseforge' }));
    
    results.innerHTML = '';
    if (!hits.length) { results.innerHTML = `No results`; return; }
    
    const installedIds = [];
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
        <button class="add-mod-btn ${installed?'installed':''}" ${installed?'disabled':''}>${installed?'✓ Added':'+ Import'}</button>`;
      results.appendChild(el);
    });
    console.log("FINAL HTML:", results.innerHTML.substring(0, 500) + '...');
  } catch(e) {
    console.log("CAUGHT ERROR:", e);
    results.innerHTML = `Failed to fetch`;
  }
}
test();
