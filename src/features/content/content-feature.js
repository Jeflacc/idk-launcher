import { actions } from "../../core/app-state.js";
import { esc } from "../../core/safe-parse.js";

let __initContentFeatureInitialized = false;

export function initContentFeature() {
  if (__initContentFeatureInitialized) return;
  __initContentFeatureInitialized = true;
  // === MOJANG NEWS FETCHING ================================
  // =========================================================
  async function fetchMojangNews() {
    const grid = document.getElementById("mojang-news-grid");
    if (!grid) return;
    try {
      const res = await fetch("https://launchercontent.mojang.com/news.json");
      const data = await res.json();
      grid.replaceChildren();

      const latestNews = (data.entries || []).slice(0, 4); // Show latest 4

      latestNews.forEach((news) => {
        const imageUrl = news.newsPageImage?.url
          ? "idk-cache://launchercontent.mojang.com" + news.newsPageImage.url
          : news.playPageImage?.url
            ? "idk-cache://launchercontent.mojang.com" + news.playPageImage.url
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
          : (news.date || "");

        const card = document.createElement("div");
        card.className = "news-card";
        card.style.cursor = "pointer";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Open article: ${news.title || "Untitled"}`);
        const openUrl = news.readMoreLink || "";
        const onOpen = () => {
          if (!openUrl) return;
          if (window.electronAPI?.openExternal) window.electronAPI.openExternal(openUrl);
          else window.open(openUrl, "_blank");
        };
        card.addEventListener("click", onOpen);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
        });

        const img = document.createElement("div");
        img.className = "news-img";
        if (imageUrl) img.style.backgroundImage = `url('${imageUrl.replace(/'/g, "%27")}')`;

        const content = document.createElement("div");
        content.className = "news-content";

        const meta = document.createElement("span");
        meta.className = "news-date";
        meta.style.display = "block";
        meta.style.marginBottom = "6px";
        meta.textContent = `${dateStr} • ${news.category || ""}`;

        const h3 = document.createElement("h3");
        h3.style.fontSize = "15px";
        h3.style.marginBottom = "6px";
        h3.textContent = news.title || "";

        const p = document.createElement("p");
        p.style.fontSize = "12px";
        p.style.display = "-webkit-box";
        p.style.webkitLineClamp = "2";
        p.style.webkitBoxOrient = "vertical";
        p.style.overflow = "hidden";
        p.textContent = news.text || "";

        content.append(meta, h3, p);
        card.append(img, content);
        grid.appendChild(card);
      });
    } catch (err) {
      grid.replaceChildren();
      const errEl = document.createElement("div");
      errEl.style.padding = "20px";
      errEl.style.color = "var(--text-muted)";
      errEl.style.width = "100%";
      errEl.style.textAlign = "center";
      errEl.textContent = "Failed to load news.";
      grid.appendChild(errEl);
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
      const res = await fetch(
        "https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=4471&sortField=2&sortOrder=desc&pageSize=4",
      );
      const json = await res.json();
      if (json.data && json.data.length > 0) packs = json.data;
    } catch (e) {
      // offline — fall through to defaults
    }

    grid.replaceChildren();
    const renderCard = (mp, thumb, dl, loader, modObj) => {
      const card = document.createElement("div");
      card.className = "trending-mp-card";
      card.style.cursor = "pointer";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Install modpack: ${mp.name || ""}`);
      const onActivate = () => {
        try { window.clickTrendingMod?.(modObj); } catch (e) { console.error("clickTrendingMod failed:", e); }
      };
      card.addEventListener("click", onActivate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
      });

      const initial = (mp.name || "M").charAt(0).toUpperCase();
      let thumbEl;
      if (thumb) {
        thumbEl = document.createElement("img");
        thumbEl.className = "trending-mp-thumb";
        thumbEl.src = thumb;
        thumbEl.alt = "";
        thumbEl.addEventListener("error", () => {
          const fb = document.createElement("div");
          fb.className = "trending-mp-thumb trending-mp-thumb-fallback";
          fb.textContent = initial;
          thumbEl.replaceWith(fb);
        });
      } else {
        thumbEl = document.createElement("div");
        thumbEl.className = "trending-mp-thumb trending-mp-thumb-fallback";
        thumbEl.textContent = initial;
      }

      const info = document.createElement("div");
      info.className = "trending-mp-info";

      const name = document.createElement("strong");
      name.textContent = mp.name || "";
      const summary = document.createElement("p");
      summary.textContent = mp.summary || "";

      const meta = document.createElement("div");
      meta.className = "trending-mp-meta";
      const dlSpan = document.createElement("span");
      dlSpan.textContent = `⬇ ${dl}`;
      meta.appendChild(dlSpan);
      if (loader) {
        const tag = document.createElement("span");
        tag.className = "trending-mp-tag";
        tag.textContent = loader;
        meta.appendChild(tag);
      }

      info.append(name, summary, meta);
      card.append(thumbEl, info);
      grid.appendChild(card);
    };

    if (packs) {
      packs.forEach((mp) => {
        const thumb = mp.logo
          ? mp.logo.thumbnailUrl.replace("https://", "idk-cache://")
          : "";
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
        const modObj = {
          project_id: mp.id.toString(),
          title: mp.name,
          icon_url: thumb,
          provider: "curseforge",
        };
        renderCard(mp, thumb, dl, loader, modObj);
      });
    } else {
      FALLBACK.forEach((mp) => {
        const thumbCached = mp.thumb.replace("https://", "idk-cache://");
        const modObj = {
          project_id: mp.id,
          title: mp.name,
          icon_url: mp.thumb,
          provider: "curseforge",
        };
        renderCard(mp, thumbCached, mp.dl, mp.loader, modObj);
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
        let htmlNotes = '';
        const notes = releaseNotes;
        let raw = '';
        if (notes) {
          if (typeof notes === 'string') {
            raw = notes.trim();
          } else if (Array.isArray(notes)) {
            raw = notes.map(n => (typeof n === 'string' ? n : (n && n.note) || '')).filter(Boolean).join('\n\n').trim();
          } else if (typeof notes === 'object' && notes.note) {
            raw = String(notes.note).trim();
          } else {
            raw = String(notes).trim();
          }
        }
        if (raw) {
          if (/<[a-z][\s\S]*>/i.test(raw)) {
            // Strip all HTML tags and emit as plain text — never trust
            // arbitrary HTML from the update server (XSS risk).
            htmlNotes = raw
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, "")
              .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/\n/g, "<br>");
          } else {
            htmlNotes = raw
              .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/\n/g, "<br>")
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.*?)\*/g, "<em>$1</em>")
              .replace(/## (.*?)(<br>|$)/g, '<h4 style="margin:10px 0 5px;color:white;font-family:var(--font-title);">$1</h4>')
              .replace(/- (.*?)(<br>|$)/g, '<div style="margin-left:8px;display:flex;gap:6px;margin-bottom:4px;"><span style="color:#60a5fa;">&bull;</span><span>$1</span></div>');
          }
        }
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

  // Seamless tab transitions helper — uses switchView directly for reliability
  document.querySelectorAll(".nav-tab[data-target]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;

      if (target === "profile") {
        const profileView = document.getElementById("view-profile");
        if (profileView && !profileView.classList.contains("active")) {
          // openProfile handles both switching view AND refreshing profile data
          if (actions.openProfile) {
            actions.openProfile();
          } else if (actions.switchView) {
            actions.switchView("profile");
          }
        }
        return;
      }

      // For non-profile tabs, close profile view first if open, then switch
      const profileIsActive = document
        .getElementById("view-profile")
        ?.classList.contains("active");

      if (profileIsActive) {
        // Remove active from profile and switch to target view directly
        document.getElementById("view-profile")?.classList.remove("active");
        if (actions.switchView) actions.switchView(target);
        return;
      }

      if (target === "main") {
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
      }
    });
  });
}
