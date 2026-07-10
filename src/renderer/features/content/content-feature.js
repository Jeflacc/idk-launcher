import { actions } from "../../core/app-state.js";

export function initContentFeature() {
  // === MOJANG NEWS FETCHING ================================
  // =========================================================
  async function fetchMojangNews() {
    const grid = document.getElementById("mojang-news-grid");
    if (!grid) return;
    try {
      const entries = await window.electronAPI.getMojangNews();
      grid.innerHTML = "";

      const latestNews = (entries || []).slice(0, 6);

      latestNews.forEach((news, index) => {
        const imageUrl = news.newsPageImage?.url
          ? news.newsPageImage.url
          : news.playPageImage?.url
            ? news.playPageImage.url
            : "";

        const dateObj = new Date(news.date);
        const dateStr = !isNaN(dateObj)
          ? dateObj
              .toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              .toUpperCase()
          : news.date;

        const isFirst = index === 0;
        grid.innerHTML += `
        <div class="news-card ${isFirst ? 'news-card-featured' : ''}" onclick="window.electronAPI ? window.electronAPI.openExternal('${news.readMoreLink}') : window.open('${news.readMoreLink}', '_blank')" style="cursor:pointer;">
          <div class="news-img" style="background-image: url('${imageUrl}')"></div>
          <div class="news-content">
            <span class="news-category">${news.category || 'Minecraft'}</span>
            <h3 class="news-title">${news.title}</h3>
            <p class="news-desc">${news.text}</p>
            <span class="news-date">${dateStr}</span>
          </div>
        </div>
      `;
      });
    } catch (err) {
      grid.innerHTML =
        '<div class="news-empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg><span>Unable to load news</span></div>';
      console.error("Failed to fetch Mojang news:", err);
    }
  }

  async function fetchTrendingModpacks() {
    const grid = document.getElementById("trending-mods-grid");
    if (!grid) return;
    grid.innerHTML =
      '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading modpacks...</div>';
    const FALLBACK = [
      {
        id: "389615",
        name: "RLCraft",
        summary: "A modpack designed to make Minecraft as hard as possible.",
        thumb:
          "https://media.forgecdn.net/avatars/255/644/637285881806441891.png",
        dl: "12M",
        loader: "Forge",
      },
      {
        id: "35539",
        name: "SkyFactory 4",
        summary: "SkyFactory 4 is a new Skyblock-inspired modpack.",
        thumb:
          "https://media.forgecdn.net/avatars/145/866/636730709659626580.png",
        dl: "20M",
        loader: "Forge",
      },
      {
        id: "497279",
        name: "All the Mods 9",
        summary: "All the Mods started as a private pack for a friend group.",
        thumb:
          "https://media.forgecdn.net/avatars/740/633/638163849529059464.png",
        dl: "8M",
        loader: "Forge",
      },
      {
        id: "641528",
        name: "Better MC [FABRIC]",
        summary: "The Better Minecraft modpack series \u2014 now for Fabric.",
        thumb:
          "https://media.forgecdn.net/avatars/524/491/637880462219327988.png",
        dl: "6M",
        loader: "Fabric",
      },
    ];
    let packs = null;
    try {
      const data = await window.electronAPI.getTrendingModpacks();
      if (data && data.length > 0) packs = data;
    } catch (e) {
      // offline — fall through to defaults
    }

    grid.innerHTML = "";
    if (packs) {
      packs.forEach((mp) => {
        const thumb = mp.logo ? mp.logo.thumbnailUrl : "";
        const initial = (mp.name || "M").charAt(0).toUpperCase();
        const dl =
          mp.downloadCount >= 1e6
            ? (mp.downloadCount / 1e6).toFixed(1) + "M"
            : mp.downloadCount >= 1000
              ? (mp.downloadCount / 1000).toFixed(0) + "K"
              : mp.downloadCount;
        const loader =
          (mp.categories || []).find((c) =>
            ["Forge", "Fabric", "NeoForge", "Quilt"].includes(c.name),
          )?.name || "";
        const modObj = JSON.stringify({
          project_id: mp.id.toString(),
          title: mp.name,
          icon_url: thumb,
          provider: "curseforge",
        }).replace(/"/g, "&quot;");
        grid.innerHTML += `<div class="trending-mp-card" onclick="clickTrendingMod(JSON.parse('${modObj}'));" style="cursor:pointer;">
        ${thumb ? `<img class="trending-mp-thumb" src="${thumb}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'trending-mp-thumb trending-mp-thumb-fallback',textContent:'${initial}'}))" />` : `<div class="trending-mp-thumb trending-mp-thumb-fallback">${initial}</div>`}
        <div class="trending-mp-info"><strong>${mp.name}</strong><p>${mp.summary}</p>
          <div class="trending-mp-meta"><span>&#x2B07; ${dl}</span>${loader ? '<span class="trending-mp-tag">' + loader + "</span>" : ""}</div>
        </div></div>`;
      });
    } else {
      FALLBACK.forEach((mp) => {
        const modObj = JSON.stringify({
          project_id: mp.id,
          title: mp.name,
          icon_url: mp.thumb,
          provider: "curseforge",
        }).replace(/"/g, "&quot;");
        grid.innerHTML += `<div class="trending-mp-card" onclick="clickTrendingMod(JSON.parse('${modObj}'));" style="cursor:pointer;">
        <img class="trending-mp-thumb" src="${mp.thumb}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'trending-mp-thumb trending-mp-thumb-fallback',textContent:'${mp.name.charAt(0).toUpperCase()}'}))" />
        <div class="trending-mp-info"><strong>${mp.name}</strong><p>${mp.summary}</p>
          <div class="trending-mp-meta"><span>&#x2B07; ${mp.dl}</span><span class="trending-mp-tag">${mp.loader}</span></div>
        </div></div>`;
      });
    }
  }

  // Check for Updates
  async function initUpdateChecker() {
    if (!window.electronAPI) return;
    const api = window.electronAPI;

    // Listen for update events from main process
    if (api.onUpdateAvailable) {
      api.onUpdateAvailable((data) => {
        showUpdateModal(data.currentVersion, data.latestVersion, data.releaseNotes);
      });
    }
    if (api.onUpdateProgress) {
      api.onUpdateProgress((data) => {
        const progressText = document.getElementById("update-progress-text");
        const progressPercent = document.getElementById("update-progress-percent");
        const progressBar = document.getElementById("update-progress-bar");
        if (progressText) progressText.textContent = `Downloading... ${formatBytes(data.bytesPerSecond)}/s`;
        if (progressPercent) progressPercent.textContent = `${data.percent}%`;
        if (progressBar) progressBar.style.width = `${data.percent}%`;
      });
    }
    if (api.onUpdateDownloaded) {
      api.onUpdateDownloaded((data) => {
        const downloadBtn = document.getElementById("btn-download-update");
        const installBtn = document.getElementById("btn-install-update");
        const progressContainer = document.getElementById("update-progress-container");
        const progressText = document.getElementById("update-progress-text");
        const progressBar = document.getElementById("update-progress-bar");
        if (downloadBtn) downloadBtn.style.display = "none";
        if (installBtn) installBtn.style.display = "flex";
        if (progressContainer) progressContainer.style.display = "none";
        if (progressText) progressText.textContent = "Download complete!";
        if (progressBar) progressBar.style.width = "100%";
        const title = document.getElementById("update-modal-title");
        if (title) title.textContent = "Update Ready to Install!";
      });
    }
    if (api.onUpdateError) {
      api.onUpdateError((data) => {
        console.warn("Auto-update error:", data.message);
        const progressText = document.getElementById("update-progress-text");
        if (progressText) progressText.textContent = `Update failed: ${data.message}`;
      });
    }

    // Check on load
    if (api.checkForUpdates) {
      try {
        const res = await api.checkForUpdates();
        if (res && res.updateAvailable) {
          showUpdateModal(res.currentVersion, res.latestVersion, res.releaseNotes);
        }
      } catch (e) {
        console.warn("Update check failed:", e);
      }
    }

    function showUpdateModal(currentVersion, latestVersion, releaseNotes) {
      const modal = document.getElementById("update-modal");
      const verInfo = document.getElementById("update-version-info");
      const notesContainer = document.getElementById("update-notes");
      const downloadBtn = document.getElementById("btn-download-update");
      const installBtn = document.getElementById("btn-install-update");
      const progressContainer = document.getElementById("update-progress-container");
      const title = document.getElementById("update-modal-title");

      if (title) title.textContent = "New Update Available!";
      if (verInfo) verInfo.textContent = `Version v${latestVersion} is now available (you have v${currentVersion}).`;
      if (downloadBtn) { downloadBtn.style.display = "flex"; downloadBtn.textContent = "Download & Install"; }
      if (installBtn) installBtn.style.display = "none";
      if (progressContainer) progressContainer.style.display = "none";

      if (notesContainer) {
        const htmlNotes = (releaseNotes || "")
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/## (.*?)(<br>|$)/g, '<h4 style="margin:10px 0 5px;color:white;font-family:var(--font-title);">$1</h4>')
          .replace(/- (.*?)(<br>|$)/g, '<div style="margin-left:8px;display:flex;gap:6px;margin-bottom:4px;"><span style="color:#60a5fa;">&bull;</span><span>$1</span></div>');
        notesContainer.innerHTML = htmlNotes || '<p style="color:var(--text-muted);">No release notes provided.</p>';
      }

      modal.classList.add("active");

      downloadBtn.onclick = async () => {
        downloadBtn.textContent = "Downloading...";
        downloadBtn.disabled = true;
        progressContainer.style.display = "block";
        try {
          await api.downloadUpdate();
        } catch (e) {
          console.warn("Download failed:", e);
          downloadBtn.textContent = "Download & Install";
          downloadBtn.disabled = false;
        }
      };

      installBtn.onclick = () => {
        installBtn.textContent = "Restarting...";
        installBtn.disabled = true;
        api.installUpdate();
      };

      document.getElementById("btn-ignore-update").onclick = () => {
        modal.classList.remove("active");
      };
    }

    function formatBytes(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }
  }

  // Initialize on load
  fetchMojangNews();
  fetchTrendingModpacks();
  initUpdateChecker();

  window.addEventListener("reload-content", () => {
    fetchMojangNews();
    fetchTrendingModpacks();
  });

  // Seamless tab transitions helper
  document.querySelectorAll(".nav-tab[data-target]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;
      const profileIsActive = document
        .getElementById("view-profile")
        ?.classList.contains("active");

      if (target === "profile") {
        if (!profileIsActive) {
          actions.openProfile?.();
        }
        return;
      }

      if (target === "main") {
        if (profileIsActive) {
          actions.closeProfile?.("main");
          return;
        }
        const closeMods = document.getElementById("btn-close-mods");
        const closeSettings = document.getElementById("btn-close-settings");
        if (
          document.getElementById("view-mods").classList.contains("active") &&
          closeMods
        )
          closeMods.click();
        else if (
          document
            .getElementById("view-settings")
            .classList.contains("active") &&
          closeSettings
        )
          closeSettings.click();
      } else if (target === "mods") {
        if (profileIsActive) {
          actions.closeProfile?.("mods");
          return;
        }
        const openMods = document.getElementById("btn-open-mods");
        const closeSettings = document.getElementById("btn-close-settings");
        if (
          document
            .getElementById("view-settings")
            .classList.contains("active") &&
          closeSettings
        ) {
          closeSettings.click();
          setTimeout(() => {
            if (openMods) openMods.click();
          }, 50);
        } else if (openMods) {
          openMods.click();
        }
      } else if (target === "settings") {
        if (profileIsActive) {
          actions.closeProfile?.("settings");
          return;
        }
        const openSettings = document.getElementById("btn-open-settings");
        const closeMods = document.getElementById("btn-close-mods");
        if (
          document.getElementById("view-mods").classList.contains("active") &&
          closeMods
        ) {
          closeMods.click();
          setTimeout(() => {
            if (openSettings) openSettings.click();
          }, 50);
        } else if (openSettings) {
          openSettings.click();
        }
      } else if (target === "idk-connect") {
        if (profileIsActive) {
          actions.closeProfile?.("idk-connect");
          return;
        }
        const closeMods = document.getElementById("btn-close-mods");
        const closeSettings = document.getElementById("btn-close-settings");
        if (document.getElementById("view-mods")?.classList.contains("active") && closeMods) closeMods.click();
        else if (document.getElementById("view-settings")?.classList.contains("active") && closeSettings) closeSettings.click();

        setTimeout(() => actions.switchView?.("idk-connect"), 50);
      }
    });
  });
}
