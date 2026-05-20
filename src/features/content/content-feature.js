export function initContentFeature() {
// === MOJANG NEWS FETCHING ================================
// =========================================================
async function fetchMojangNews() {
  const grid = document.getElementById('mojang-news-grid');
  if (!grid) return;
  try {
    const res = await fetch('https://launchercontent.mojang.com/news.json');
    const data = await res.json();
    grid.innerHTML = '';
    
    const latestNews = data.entries.slice(0, 4); // Show latest 4
    
    latestNews.forEach(news => {
      const imageUrl = news.newsPageImage?.url 
        ? 'https://launchercontent.mojang.com' + news.newsPageImage.url 
        : (news.playPageImage?.url ? 'https://launchercontent.mojang.com' + news.playPageImage.url : '');
      
      const dateObj = new Date(news.date);
      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : news.date;
      
      grid.innerHTML += `
        <div class="news-card" onclick="window.electronAPI ? window.electronAPI.openExternal('${news.readMoreLink}') : window.open('${news.readMoreLink}', '_blank')" style="cursor:pointer;">
          <div class="news-img" style="background-image: url('${imageUrl}')"></div>
          <div class="news-content">
            <span class="news-date" style="display: block; margin-bottom: 6px;">${dateStr} &bull; ${news.category}</span>
            <h3 style="font-size: 15px; margin-bottom: 6px;">${news.title}</h3>
            <p style="font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${news.text}</p>
          </div>
        </div>
      `;
    });
  } catch (err) {
    grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted); width: 100%; text-align: center;">Failed to load news.</div>';
    console.error('Failed to fetch Mojang news:', err);
  }
}

async function fetchTrendingModpacks() {
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
      const modObj = JSON.stringify({ project_id: mp.id.toString(), title: mp.name, icon_url: thumb, provider: 'curseforge' }).replace(/"/g,'&quot;');
      grid.innerHTML += `<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('${modObj}'), this);" style="cursor:pointer;">
        <div class="trending-mp-thumb" style="background-image:url('${thumb}');background-size:cover;background-position:center;"></div>
        <div class="trending-mp-info"><strong>${mp.name}</strong><p>${mp.summary}</p>
          <div class="trending-mp-meta"><span>⬇ ${dl}</span>${loader?'<span class="trending-mp-tag">'+loader+'</span>':''}</div>
        </div></div>`;
    });
  } else {
    FALLBACK.forEach(mp => {
      const modObj = JSON.stringify({ project_id: mp.id, title: mp.name, icon_url: mp.thumb, provider: 'curseforge' }).replace(/"/g,'&quot;');
      grid.innerHTML += `<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem(JSON.parse('${modObj}'), this);" style="cursor:pointer;">
        <div class="trending-mp-thumb" style="background-image:url('${mp.thumb}');background-size:cover;background-position:center;"></div>
        <div class="trending-mp-info"><strong>${mp.name}</strong><p>${mp.summary}</p>
          <div class="trending-mp-meta"><span>⬇ ${mp.dl}</span><span class="trending-mp-tag">${mp.loader}</span></div>
        </div></div>`;
    });
  }
}

// Check for Updates
async function initUpdateChecker() {
  if (window.electronAPI && window.electronAPI.checkForUpdates) {
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res && res.updateAvailable) {
        const modal = document.getElementById('update-modal');
        const verInfo = document.getElementById('update-version-info');
        const notesContainer = document.getElementById('update-notes');
        
        verInfo.textContent = `Version v${res.latestVersion} is now available (you have v${res.currentVersion}).`;
        
        // Escape HTML to prevent XSS and convert markdown elements to stylized HTML
        const htmlNotes = res.releaseNotes
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/## (.*?)(<br>|$)/g, '<h4 style="margin:10px 0 5px;color:white;font-family:var(--font-title);">$1</h4>')
          .replace(/- (.*?)(<br>|$)/g, '<div style="margin-left:8px;display:flex;gap:6px;margin-bottom:4px;"><span style="color:#60a5fa;">•</span><span>$1</span></div>');
          
        notesContainer.innerHTML = htmlNotes || '<p style="color:var(--text-muted);">No release notes provided.</p>';
        modal.classList.add('active');
        
        document.getElementById('btn-download-update').onclick = () => {
          window.electronAPI.openExternal(res.releaseUrl);
          modal.classList.remove('active');
        };
        
        document.getElementById('btn-ignore-update').onclick = () => {
          modal.classList.remove('active');
        };
      }
    } catch(e) {
      console.warn('Update check failed:', e);
    }
  }
}

// Initialize on load
fetchMojangNews();
fetchTrendingModpacks();
initUpdateChecker();

// Seamless tab transitions helper
document.querySelectorAll('.nav-tab[data-target]').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.target;
    if (target === 'main') {
      const closeMods = document.getElementById('btn-close-mods');
      const closeSettings = document.getElementById('btn-close-settings');
      if (document.getElementById('view-mods').classList.contains('active') && closeMods) closeMods.click();
      else if (document.getElementById('view-settings').classList.contains('active') && closeSettings) closeSettings.click();
    } else if (target === 'mods') {
      const openMods = document.getElementById('btn-open-mods');
      const closeSettings = document.getElementById('btn-close-settings');
      if (document.getElementById('view-settings').classList.contains('active') && closeSettings) {
        closeSettings.click();
        setTimeout(() => { if (openMods) openMods.click(); }, 50);
      } else if (openMods) {
        openMods.click();
      }
    } else if (target === 'settings') {
      const openSettings = document.getElementById('btn-open-settings');
      const closeMods = document.getElementById('btn-close-mods');
      if (document.getElementById('view-mods').classList.contains('active') && closeMods) {
        closeMods.click();
        setTimeout(() => { if (openSettings) openSettings.click(); }, 50);
      } else if (openSettings) {
        openSettings.click();
      }
    }
  });
});

}
