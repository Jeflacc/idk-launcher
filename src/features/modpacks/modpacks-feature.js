import { state, actions } from "../../core/app-state.js";

export function initModpacksFeature({ switchView }) {
  // === MODPACK MANAGER =====================================
  // =========================================================
  state.modpacks = JSON.parse(localStorage.getItem("idk_modpacks") || "[]");
  // Migrate old state.modpacks and remove any "Default Modpack" or generic "Modpack" placeholders
  const originalCount = state.modpacks.length;
  state.modpacks = state.modpacks.filter((mp) => {
    const n = (mp.name || "").trim().toLowerCase();
    return n !== "default modpack" && n !== "modpack" && n !== "new modpack";
  });
  state.modpacks = state.modpacks.map((mp) => ({
    mods: [],
    resourcepacks: [],
    shaders: [],
    ...mp,
  }));

  // Ensure all state.modpacks have iconUrl property
  state.modpacks = state.modpacks.map((mp) => ({
    ...mp,
    iconUrl: mp.iconUrl || "",
  }));

  // Fix IDs that were incorrectly stored with the 'modpack-' prefix
  // The id should be the raw part (e.g. 'mp9qv96i3i3uqistkjd'), not 'modpack-mp9qv96...'
  state.modpacks = state.modpacks.map((mp) => ({
    ...mp,
    id: mp.id.startsWith("modpack-") ? mp.id.replace(/^modpack-/, "") : mp.id,
  }));

  // Remove any entries whose id still contains 'modpack-' after stripping (double-nested duplicates)
  state.modpacks = state.modpacks.filter((mp) => !mp.id.startsWith("modpack-"));

  // Save immediately if we filtered anything out to prevent it from coming back
  if (state.modpacks.length !== originalCount) {
    localStorage.setItem("idk_modpacks", JSON.stringify(state.modpacks));
  }

  // Global flag to pause profile scanning during deletion
  let isDeleting = false;

  // Scan profiles directory on disk and merge with localStorage
  async function loadProfilesFromDisk() {
    // Skip if deletion is in progress
    if (isDeleting) {
      console.log("[Modpacks] Skipping scan - deletion in progress");
      return;
    }

    console.log("[Modpacks] loadProfilesFromDisk called");
    if (!window.electronAPI?.scanProfiles) {
      console.log("[Modpacks] scanProfiles API not available");
      return;
    }

    try {
      console.log("[Modpacks] Calling scanProfiles...");
      const result = await window.electronAPI.scanProfiles();
      // Log to main process via IPC so it shows in terminal
      const summary = result.profiles
        ?.map(
          (p) =>
            `${p.name}:mods=${p.diskMods?.length}rp=${p.diskResourcepacks?.length}sh=${p.diskShaders?.length}`,
        )
        .join(" | ");
      const logMsg = `scanProfiles returned: success=${result.success} profiles=${result.profiles?.length} | ${summary}`;
      console.log("[Modpacks]", logMsg);
      window.electronAPI?.rendererLog?.("[Modpacks] " + logMsg);
      console.log("[Modpacks] scanProfiles result:", result);
      if (result.success && result.profiles.length > 0) {
        try {
          const diskProfiles = result.profiles;
          // Debug: log what disk returned
          diskProfiles.forEach((p) => {
            console.log(
              `[Modpacks] Disk profile: ${p.name} (${p.id}) \u2014 mods:${p.diskMods?.length || 0} rp:${p.diskResourcepacks?.length || 0} sh:${p.diskShaders?.length || 0}`,
            );
          });

          // Helper: merge disk file list with stored metadata
          // IMPORTANT: Preserve existing iconUrl from API (Modrinth/CurseForge) to avoid unnecessary JAR extraction
          const mergeFiles = (diskFiles, storedFiles) => {
            // storedFiles might be an object or non-array \u2014 normalize it
            const storedArr = Array.isArray(storedFiles) ? storedFiles : [];
            const storedMap = new Map(storedArr.map((f) => [f.filename, f]));
            return (diskFiles || []).map((df) => {
              const stored = storedMap.get(df.filename);
              return stored
                ? {
                    // Preserve all metadata from stored item, especially iconUrl from API
                    ...stored,
                    filename: df.filename, // Ensure filename is current
                  }
                : {
                    filename: df.filename,
                    name: df.filename.replace(/\.jar$|\.zip$/, ""),
                    modrinthId: "",
                    version: "",
                    iconUrl: "",
                  };
            });
          };

          // Build lookup maps \u2014 by ID and by name (for legacy matching)
          const existingById = new Map(state.modpacks.map((mp) => [mp.id, mp]));
          const existingByName = new Map(
            state.modpacks.map((mp) => [mp.name?.toLowerCase().trim(), mp]),
          );

          console.log(
            "[Modpacks] localStorage IDs:",
            state.modpacks.map((mp) => `${mp.id}="${mp.name}"`).join(", "),
          );
          console.log(
            "[Modpacks] Disk IDs:",
            diskProfiles.map((p) => `${p.id}="${p.name}"`).join(", "),
          );

          // Build a new state.modpacks array entirely from disk \u2014 disk is the source of truth
          // Preserve metadata (iconUrl, lastPlayed, modrinthId per file) from localStorage
          const newModpacks = diskProfiles.map((diskMp) => {
            // Try to find existing entry by ID, then by name
            const existing =
              existingById.get(diskMp.id) ||
              existingByName.get(diskMp.name?.toLowerCase().trim());

            return {
              id: diskMp.id,
              name:
                existing?.name && !existing.name.startsWith("Modpack (")
                  ? existing.name
                  : diskMp.name,
              mcVersion:
                diskMp.mcVersion !== "Unknown"
                  ? diskMp.mcVersion
                  : existing?.mcVersion || diskMp.mcVersion,
              loader:
                diskMp.loader !== "Vanilla"
                  ? diskMp.loader
                  : existing?.loader || diskMp.loader,
              iconUrl: existing?.iconUrl || diskMp.iconUrl || null,
              lastPlayed: existing?.lastPlayed || diskMp.lastPlayed || null,
              mods: mergeFiles(diskMp.diskMods || [], existing?.mods || []),
              resourcepacks: mergeFiles(
                diskMp.diskResourcepacks || [],
                existing?.resourcepacks || [],
              ),
              shaders: mergeFiles(
                diskMp.diskShaders || [],
                existing?.shaders || [],
              ),
            };
          });

          state.modpacks = newModpacks;
          const rebuildMsg =
            "After rebuild: " +
            state.modpacks
              .map(
                (m) =>
                  `${m.name}: mods=${m.mods?.length} rp=${m.resourcepacks?.length} sh=${m.shaders?.length}`,
              )
              .join(" | ");
          console.log("[Modpacks]", rebuildMsg);
          window.electronAPI?.rendererLog?.("[Modpacks] " + rebuildMsg);
          // Keep state.activeModpackId pointing to a valid modpack
          // The ID may have changed (legacy fix) \u2014 try to find by old ID first, then keep first
          if (
            state.activeModpackId &&
            !state.modpacks.find((m) => m.id === state.activeModpackId)
          ) {
            // Try to find by name match from old localStorage
            const oldMp = [
              ...new Map(state.modpacks.map((m) => [m.id, m])).values(),
            ][0];
            state.activeModpackId = oldMp?.id || null;
          }

          localStorage.setItem("idk_modpacks", JSON.stringify(state.modpacks));
          console.log(
            `[Modpacks] Synced ${diskProfiles.length} profiles from disk`,
          );
          mpRenderList();
          mpRenderDetail();
        } catch (innerErr) {
          window.electronAPI?.rendererLog?.(
            "[Modpacks] INNER ERROR: " +
              innerErr.message +
              " | stack: " +
              innerErr.stack?.split("\n").slice(0, 3).join(" | "),
          );
        }
      }
    } catch (e) {
      console.error("[Modpacks] Failed to scan profiles:", e);
      window.electronAPI?.rendererLog?.("[Modpacks] OUTER ERROR: " + e.message);
    }
  }

  // Load profiles from disk on startup
  setTimeout(() => {
    console.log("[Modpacks] Calling loadProfilesFromDisk after delay");
    loadProfilesFromDisk();
  }, 500);

  state.activeModpackId = null;
  state.browserMode = "mod"; // 'mod' | 'resourcepack' | 'shader' | 'modpack'
  state.currentProvider = "modrinth";

  function mpSave() {
    // Filter out temporary modpacks before saving to localStorage
    const modpacksToSave = state.modpacks.filter((mp) => !mp.isTemporary);
    localStorage.setItem("idk_modpacks", JSON.stringify(modpacksToSave));
    // Also save profile metadata to disk for each modpack
    saveModpacksToDisk();
  }

  async function saveModpacksToDisk() {
    // Profile metadata is managed by the main process via IPC
    // No need to save to disk here - the main process handles profile.json files
    // This function is kept for compatibility but does nothing
  }

  function mpGet() {
    return state.modpacks.find((m) => m.id === state.activeModpackId) || null;
  }

  function mpRenderList() {
    const list = document.getElementById("modpacks-list");
    if (!list) return; // Guard for startup
    list.innerHTML = "";

    // Get permanent modpacks
    const permanentModpacks = state.modpacks.filter((mp) => !mp.isTemporary);

    // Get downloaded versions
    const downloadedVersions =
      state.allVersions?.filter((v) =>
        state.downloadedVersions.includes(v.id),
      ) || [];

    // Combine both lists
    const hasModpacks = permanentModpacks.length > 0;
    const hasVersions = downloadedVersions.length > 0;

    if (!hasModpacks && !hasVersions) {
      list.innerHTML = `<div class="mp-empty">No modpacks or versions yet.<br>Click <strong>+ New Modpack</strong> to create one.</div>`;
      return;
    }

    // Render versions section
    if (hasVersions) {
      const versionsHeader = document.createElement("div");
      versionsHeader.className = "mp-list-section-header";
      versionsHeader.innerHTML =
        '<span style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Versions</span>';
      list.appendChild(versionsHeader);

      downloadedVersions.forEach((v) => {
        // Get version settings to show correct loader
        const vSettings = state.versionSettings?.[v.id] || {
          loader: "Vanilla",
        };

        const el = document.createElement("div");
        el.className =
          "modpack-item version-item" +
          (state.activeVersionForMods === v.id ? " active" : "");
        el.innerHTML = `
        <div class="mp-item-icon" style="width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(var(--theme-accent-rgb),0.15);flex-shrink:0;border:2px solid rgba(var(--theme-accent-rgb),0.3);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--theme-accent);"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        </div>
        <div class="mp-item-info"><strong>${v.id}</strong><span>${vSettings.loader}</span></div>`;
        el.addEventListener("click", () => {
          state.activeVersionForMods = v.id;
          state.activeModpackId = null;
          mpRenderList();
          mpRenderDetail();
        });
        list.appendChild(el);
      });
    }

    // Render modpacks section
    if (hasModpacks) {
      if (hasVersions) {
        const modpacksHeader = document.createElement("div");
        modpacksHeader.className = "mp-list-section-header";
        modpacksHeader.innerHTML =
          '<span style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Modpacks</span>';
        list.appendChild(modpacksHeader);
      }

      permanentModpacks.forEach((mp) => {
        const el = document.createElement("div");
        el.className =
          "modpack-item" + (mp.id === state.activeModpackId ? " active" : "");
        const modCount = mp.mods?.length || 0;
        const rpCount = mp.resourcepacks?.length || 0;
        const shCount = mp.shaders?.length || 0;
        const total = modCount + rpCount + shCount;
        const renderablePackIconUrl = getRenderableIconUrl(mp.iconUrl);
        const iconHtml = renderablePackIconUrl
          ? `<img src="${renderablePackIconUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='<svg width=\`20\` height=\`20\` viewBox=\`0 0 24 24\` fill=\`none\` stroke=\`currentColor\` stroke-width=\`2\`><path d=\`M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\`></path></svg>'" />`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
        el.innerHTML = `
        <div class="mp-item-icon" style="width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(255,255,255,0.05);flex-shrink:0;border:1px solid rgba(255,255,255,0.08);">${iconHtml}</div>
        <div class="mp-item-info"><strong>${mp.name}</strong><span>${mp.mcVersion} \u00B7 ${mp.loader}</span></div>
        <span class="mp-item-count">${total}</span>`;
        el.addEventListener("click", async () => {
          state.activeModpackId = mp.id;
          state.activeVersionForMods = null;
          mpRenderList();
          mpRenderDetail();
          loadProfilesFromDisk();
        });
        list.appendChild(el);
      });
    }
  }

  // Extract icon from mod JAR - uses disk cache (like ModMenu)
  async function extractAndCacheModIcon(modpackId, typeDir, filename) {
    try {
      const result = await window.electronAPI?.extractModIcon?.({
        modId: filename,
        modpackId,
        typeDir,
        filename,
      });
      if (result?.success && result.iconUrl) {
        console.log(`[IconExtractor] Got icon for ${filename}`);
        return getRenderableIconUrl(result.iconUrl);
      } else {
        console.warn(
          `[IconExtractor] Failed to extract icon for ${filename}:`,
          result?.reason,
        );
      }
    } catch (e) {
      console.error(
        "[IconExtractor] Failed to extract icon for",
        filename,
        ":",
        e,
      );
    }
    return null;
  }

  // Extract version from mod filename (fallback if metadata not available)
  function extractVersionFromFilename(filename) {
    // Common patterns: modname-1.20.4-1.0.0.jar, modname-1.0.0+1.20.4.jar, etc.
    const patterns = [
      /([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)\+/, // 1.0.0+ pattern
      /\-([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)(?:\-|\.jar)/, // -1.0.0- or -1.0.0.jar
      /\-([0-9]+\.[0-9]+(?:\.[0-9]+)?)(?:\-|\.jar)/, // -1.0 or -1.0.0
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  function getLaunchOverlayElements() {
    return {
      overlay: document.getElementById("launch-overlay"),
      launchStatus: document.getElementById("launch-status"),
      launchFill: document.getElementById("launch-fill"),
    };
  }

  function showImportOverlay(status, percent = 5) {
    const { overlay, launchStatus, launchFill } = getLaunchOverlayElements();
    if (overlay) overlay.classList.add("active");
    if (launchStatus) launchStatus.innerText = status;
    if (launchFill) launchFill.style.width = `${percent}%`;
  }

  function hideImportOverlay() {
    const { overlay } = getLaunchOverlayElements();
    if (overlay) overlay.classList.remove("active");
  }

  function setImportProgress(status, percent) {
    const { launchStatus, launchFill } = getLaunchOverlayElements();
    if (launchStatus) launchStatus.innerText = status;
    if (launchFill && Number.isFinite(percent))
      launchFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  function getRenderableIconUrl(iconUrl) {
    if (!iconUrl || iconUrl.startsWith("file://")) return "";
    return iconUrl;
  }

  // Batch extract icons for all items in a modpack (for legacy profiles)
  // OPTIMIZED: Only extract icons for items that don't already have them (from API)
  async function batchExtractIconsForModpack(modpackId) {
    try {
      console.log(
        `[IconBatch] Starting batch extraction for modpack ${modpackId}`,
      );
      const result = await window.electronAPI?.extractAllIcons?.({ modpackId });

      if (result?.success) {
        console.log(
          `[IconBatch] Extracted ${result.extracted} icons, ${result.failed} failed`,
        );

        // Update modpack data with extracted icons
        const mp = state.modpacks.find((m) => m.id === modpackId);
        if (!mp) return;

        // Process mods - only update if item doesn't already have an icon
        if (result.mods && result.mods.length > 0) {
          result.mods.forEach(({ filename, iconUrl }) => {
            const item = mp.mods?.find((m) => m.filename === filename);
            const safeIconUrl = getRenderableIconUrl(iconUrl);
            if (item && !item.iconUrl && safeIconUrl) {
              item.iconUrl = safeIconUrl;
              if (!item.version || item.version === "Unknown") {
                item.version =
                  extractVersionFromFilename(filename) || "Unknown";
              }
            }
          });
        }

        // Process resource packs - only update if item doesn't already have an icon
        if (result.resourcepacks && result.resourcepacks.length > 0) {
          result.resourcepacks.forEach(({ filename, iconUrl }) => {
            const item = mp.resourcepacks?.find((m) => m.filename === filename);
            const safeIconUrl = getRenderableIconUrl(iconUrl);
            if (item && !item.iconUrl && safeIconUrl) {
              item.iconUrl = safeIconUrl;
              if (!item.version || item.version === "Unknown") {
                item.version =
                  extractVersionFromFilename(filename) || "Unknown";
              }
            }
          });
        }

        // Process shaders - only update if item doesn't already have an icon
        if (result.shaders && result.shaders.length > 0) {
          result.shaders.forEach(({ filename, iconUrl }) => {
            const item = mp.shaders?.find((m) => m.filename === filename);
            const safeIconUrl = getRenderableIconUrl(iconUrl);
            if (item && !item.iconUrl && safeIconUrl) {
              item.iconUrl = safeIconUrl;
              if (!item.version || item.version === "Unknown") {
                item.version =
                  extractVersionFromFilename(filename) || "Unknown";
              }
            }
          });
        }

        mpSave();

        // Re-render to show new icons
        mpRenderInstalledList("mods");
        mpRenderInstalledList("resourcepacks");
        mpRenderInstalledList("shaders");
      }
    } catch (e) {
      console.error("[IconBatch] Batch extraction failed:", e);
    }
  }

  // Initial Render
  setTimeout(() => {
    mpRenderList();
    mpRenderDetail();
  }, 100);

  if (window.electronAPI?.onLaunchClosed) {
    window.electronAPI.onLaunchClosed(() => {
      const mp = mpGet();
      if (mp?.id) {
        updateAchievementsStat({ modpackId: mp.id });
      } else if (state.activeVersionForMods) {
        updateAchievementsStat({ versionId: state.activeVersionForMods });
      }
    });
  }

  function mpRenderInstalledList(type) {
    const mp = mpGet();
    const isViewingVersion =
      state.activeVersionForMods && !state.activeModpackId;

    if (!mp && !isViewingVersion) return;

    // For versions, get mods from versionSettings
    let items = [];
    if (isViewingVersion) {
      const versionSettings =
        state.versionSettings?.[state.activeVersionForMods];
      items = versionSettings?.[type] || [];
    } else {
      items = mp ? mp[type] || [] : [];
    }

    const gridId =
      type === "mods"
        ? "installed-mods-list"
        : type === "resourcepacks"
          ? "installed-rp-list"
          : "installed-shaders-list";
    const grid = document.getElementById(gridId);
    const emptyMsgs = {
      mods: "No mods installed. Click <strong>+ Add Mods</strong> to browse Modrinth.",
      resourcepacks:
        "No resource packs installed. Click <strong>+ Add Resource Packs</strong>.",
      shaders: "No shaders installed. Click <strong>+ Add Shaders</strong>.",
    };
    grid.innerHTML = "";

    if (items.length === 0) {
      grid.innerHTML = `<div class="mp-empty" style="padding:40px 0;">${emptyMsgs[type]}</div>`;
      return;
    }

    const typeDir =
      type === "mods"
        ? "mods"
        : type === "resourcepacks"
          ? "resourcepacks"
          : "shaderpacks";

    items.forEach((item, index) => {
      const el = document.createElement("div");
      el.className = "installed-mod-card";
      el.id = `item-${type}-${index}`;

      // Get version - use stored version or extract from filename
      const version =
        item.version || extractVersionFromFilename(item.filename) || "Unknown";

      // Create icon element - prioritize existing iconUrl (from Modrinth/CurseForge API)
      const renderableIconUrl = getRenderableIconUrl(item.iconUrl);
      const firstLetter = (item.name || "M").charAt(0).toUpperCase();
      const iconHtml = renderableIconUrl
        ? `<img src="${renderableIconUrl}" class="mod-icon" onerror="this.style.display='none'" />`
        : `<div class="mod-icon-placeholder" style="display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;color:rgba(255,255,255,0.6);">${firstLetter}</div>`;

      el.innerHTML = `
      ${iconHtml}
      <div class="installed-mod-info"><strong>${item.name}</strong><span>${version}</span></div>
      <button class="remove-mod-btn" title="Remove">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>`;

      el.querySelector(".remove-mod-btn").addEventListener("click", () => {
        if (type === "mods") mpRemoveItem(item, "mods", "removeMod");
        else if (type === "resourcepacks")
          mpRemoveItem(item, "resourcepacks", "removeResourcepack");
        else mpRemoveItem(item, "shaders", "removeShader");
      });
      grid.appendChild(el);

      // Extract icon from JAR ONLY if not already present (no API icon available)
      // This is a fallback - icons should come from Modrinth/CurseForge API first
      if (!item.iconUrl) {
        // For modpacks, use mp.id; for versions, use version ID
        const modpackId = isViewingVersion
          ? `version-${state.activeVersionForMods}`
          : mp.id;
        extractAndCacheModIcon(modpackId, typeDir, item.filename).then(
          (iconUrl) => {
            if (iconUrl) {
              item.iconUrl = iconUrl;
              // Save updated item with icon
              if (isViewingVersion) {
                localStorage.setItem(
                  "idk_version_settings",
                  JSON.stringify(state.versionSettings),
                );
              } else {
                mpSave();
              }

              // Update the card's image
              const cardEl = document.getElementById(`item-${type}-${index}`);
              if (cardEl) {
                const imgEl = cardEl.querySelector("img");
                if (imgEl) {
                  imgEl.src = iconUrl;
                  imgEl.style.display = "block";
                } else {
                  const placeholder = cardEl.querySelector(
                    ".mod-icon-placeholder",
                  );
                  if (placeholder) {
                    const img = document.createElement("img");
                    img.src = iconUrl;
                    img.className = "mod-icon";
                    img.onerror = () => (img.style.display = "none");
                    placeholder.replaceWith(img);
                  }
                }
              }
            }
          },
        );
      }
    });
  }

  function formatAchievementCount(count) {
    const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    return n === 1 ? "1 achievement" : `${n} achievements`;
  }

  async function updateAchievementsStat({ modpackId, versionId } = {}) {
    const el = document.getElementById("mp-stat-achievements");
    if (!el) return;

    if (!window.electronAPI?.scanProfileAchievements) {
      el.innerText = formatAchievementCount(0);
      return;
    }

    el.innerText = "…";

    try {
      const result = await window.electronAPI.scanProfileAchievements({
        modpackId,
        versionId,
      });
      const count = result?.success ? result.count : 0;
      el.innerText = formatAchievementCount(count);
    } catch (err) {
      console.warn("[Modpacks] Achievement scan failed:", err);
      el.innerText = formatAchievementCount(0);
    }
  }

  function mpRenderDetail() {
    const mp = mpGet();
    const noMpMsg = document.getElementById("no-modpack-msg");
    const mpContent = document.getElementById("modpack-content");

    // Check if we're viewing a version instead of a modpack
    const isViewingVersion =
      state.activeVersionForMods && !state.activeModpackId;

    if (noMpMsg)
      noMpMsg.style.setProperty(
        "display",
        mp || isViewingVersion ? "none" : "flex",
        "important",
      );
    if (mpContent)
      mpContent.style.setProperty(
        "display",
        mp || isViewingVersion ? "flex" : "none",
        "important",
      );

    if (!mp && !isViewingVersion) return;

    // Get version data if viewing a version
    let versionData = null;
    let versionSettings = null;
    if (isViewingVersion) {
      versionData = state.allVersions?.find(
        (v) => v.id === state.activeVersionForMods,
      );
      // Get or create version settings
      versionSettings = state.versionSettings?.[state.activeVersionForMods] || {
        loader: "Vanilla",
        loaderVersion: "",
        javaArgs: "",
        windowWidth: 1024,
        windowHeight: 768,
      };
    }

    const nameEl = document.getElementById("modpack-name-display");
    const metaEl = document.getElementById("modpack-meta-display");

    if (isViewingVersion && versionData) {
      nameEl.innerText = versionData.id;
      metaEl.innerText = `${versionData.id} \u00B7 ${versionSettings.loader}`;
      nameEl.title = versionData.id;
      nameEl.style.cursor = "default";
      nameEl.ondblclick = null;
    } else if (mp) {
      nameEl.innerText = mp.name;
      metaEl.innerText = `MC ${mp.mcVersion} \u00B7 ${mp.loader}`;
      nameEl.title = "Double-click to rename";
      nameEl.style.cursor = "pointer";
      nameEl.ondblclick = () => {
        const newName = prompt("Rename modpack:", mp.name);
        if (newName && newName.trim() && newName.trim() !== mp.name) {
          mp.name = newName.trim();
          mpSave();
          mpRenderList();
          mpRenderDetail();
        }
      };
    }

    const iconDisplay = document.getElementById("modpack-icon-display");
    if (iconDisplay) {
      if (isViewingVersion) {
        iconDisplay.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.8;color:var(--theme-accent);"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
      } else {
        const renderablePackIconUrl = getRenderableIconUrl(mp.iconUrl);
        iconDisplay.innerHTML = renderablePackIconUrl
          ? `<img src="${renderablePackIconUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='<svg width=\`24\` height=\`24\` viewBox=\`0 0 24 24\` fill=\`none\` stroke=\`currentColor\` stroke-width=\`2\` style=\`opacity:0.5;\`><path d=\`M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\`></path></svg>'" />`
          : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
      }
    }

    // Update dynamic stats
    if (isViewingVersion) {
      document.getElementById("mp-stat-version").innerText =
        versionData?.id || "1.20.4";
      document.getElementById("mp-stat-loader").innerText =
        versionSettings.loader;
      document.getElementById("mp-stat-playtime").innerText = "0h played";
      updateAchievementsStat({ versionId: state.activeVersionForMods });
      document.getElementById("mod-count").innerText = "0";
      document.getElementById("rp-count").innerText = "0";
      document.getElementById("shader-count").innerText = "0";
    } else {
      document.getElementById("mp-stat-version").innerText =
        mp.mcVersion || "1.20.4";
      document.getElementById("mp-stat-loader").innerText =
        mp.loader || "Vanilla";

      // Update playtime
      const playtimeEl = document.getElementById("mp-stat-playtime");
      if (mp.lastPlayed) {
        const lastPlayedDate = new Date(mp.lastPlayed);
        const now = new Date();
        const diffMs = now - lastPlayedDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) playtimeEl.innerText = "Just now";
        else if (diffMins < 60) playtimeEl.innerText = `${diffMins}m ago`;
        else if (diffHours < 24) playtimeEl.innerText = `${diffHours}h ago`;
        else if (diffDays < 7) playtimeEl.innerText = `${diffDays}d ago`;
        else playtimeEl.innerText = lastPlayedDate.toLocaleDateString();
      } else {
        playtimeEl.innerText = "Never Played";
      }

      document.getElementById("mod-count").innerText = mp.mods?.length || 0;
      document.getElementById("rp-count").innerText =
        mp.resourcepacks?.length || 0;
      document.getElementById("shader-count").innerText =
        mp.shaders?.length || 0;

      updateAchievementsStat({ modpackId: mp.id });
    }

    // Load installed mods for versions
    if (isViewingVersion) {
      loadVersionMods(state.activeVersionForMods);
    }

    mpRenderInstalledList("mods");
    mpRenderInstalledList("resourcepacks");
    mpRenderInstalledList("shaders");
  }

  // Load installed mods for a version from disk
  async function loadVersionMods(version) {
    try {
      const result = await window.electronAPI?.scanVersionMods?.(version);
      if (result && result.success) {
        if (!state.versionSettings[version]) {
          state.versionSettings[version] = {};
        }

        // Convert filenames to full mod objects with metadata
        const diskMods = result.mods || [];
        const existingMods = state.versionSettings[version].mods || [];

        // Merge disk mods with existing metadata
        const mergedMods = diskMods.map((diskMod) => {
          // Try to find existing metadata for this mod
          const existing = existingMods.find(
            (m) => m.filename === diskMod.filename,
          );
          if (existing) {
            return existing; // Keep existing metadata
          }
          // Create new mod entry from disk
          return {
            filename: diskMod.filename,
            name: diskMod.filename.replace(/\.jar$/, ""),
            version: "Unknown",
            modrinthId: diskMod.filename,
            iconUrl: "",
          };
        });

        state.versionSettings[version].mods = mergedMods;
        localStorage.setItem(
          "idk_version_settings",
          JSON.stringify(state.versionSettings),
        );

        // Update counts
        document.getElementById("mod-count").innerText = mergedMods.length || 0;

        // Re-render the installed list
        mpRenderInstalledList("mods");
      }
    } catch (e) {
      console.error("[LoadVersionMods] Error:", e);
    }
  }

  // Tab switching
  document.querySelectorAll(".mp-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".mp-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".mp-tab-content")
        .forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");

      // Show/hide add buttons based on active tab
      document.getElementById("btn-browse-mods").style.display =
        tab.dataset.tab === "mods" ? "block" : "none";
      document.getElementById("btn-browse-rp").style.display =
        tab.dataset.tab === "resourcepacks" ? "block" : "none";
      document.getElementById("btn-browse-shaders").style.display =
        tab.dataset.tab === "shaders" ? "block" : "none";
    });
  });

  async function mpRemoveItem(item, type, apiMethod) {
    const mp = mpGet();
    const isViewingVersion =
      state.activeVersionForMods && !state.activeModpackId;

    if (isViewingVersion) {
      // Remove from version settings
      if (!state.versionSettings[state.activeVersionForMods]) return;
      if (!state.versionSettings[state.activeVersionForMods][type]) return;

      state.versionSettings[state.activeVersionForMods][type] =
        state.versionSettings[state.activeVersionForMods][type].filter(
          (i) => i.filename !== item.filename,
        );

      localStorage.setItem(
        "idk_version_settings",
        JSON.stringify(state.versionSettings),
      );

      // Call IPC to delete the file from disk
      if (window.electronAPI) {
        await window.electronAPI[apiMethod]({
          modpackId: `version-${state.activeVersionForMods}`,
          filename: item.filename,
        });
      }
    } else if (mp) {
      // Remove from modpack
      mp[type] = mp[type].filter((i) => i.modrinthId !== item.modrinthId);
      mpSave();
      if (window.electronAPI)
        await window.electronAPI[apiMethod]({
          modpackId: mp.id,
          filename: item.filename,
        });
    }

    mpRenderDetail();
    mpRenderList();
  }

  // --- Create Modpack ---
  document.getElementById("btn-new-modpack").addEventListener("click", () => {
    const sel = document.getElementById("new-mp-version");
    if (sel.options.length === 0 && state.allVersions.length > 0) {
      state.allVersions
        .filter((v) => v.type === "release")
        .slice(0, 30)
        .forEach((v) => {
          const o = document.createElement("option");
          o.value = v.id;
          o.textContent = v.id;
          sel.appendChild(o);
        });
    }
    document.getElementById("mp-create-modal").classList.add("active");
    document.getElementById("new-mp-name").focus();
  });
  document
    .getElementById("btn-cancel-create-mp")
    .addEventListener("click", () =>
      document.getElementById("mp-create-modal").classList.remove("active"),
    );
  document
    .getElementById("btn-confirm-create-mp")
    .addEventListener("click", async () => {
      const name = document.getElementById("new-mp-name").value.trim();
      const mcVersion = document.getElementById("new-mp-version").value;
      const loader = document.getElementById("new-mp-loader").value;
      if (!name || !mcVersion) return;
      const newMp = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name,
        mcVersion,
        loader,
        iconUrl: "",
        mods: [],
        resourcepacks: [],
        shaders: [],
      };
      state.modpacks.push(newMp);
      mpSave();

      // Profile metadata is managed by the main process via IPC
      // No need to save to disk here - the main process handles profile.json files

      document.getElementById("mp-create-modal").classList.remove("active");
      document.getElementById("new-mp-name").value = "";
      state.activeModpackId = newMp.id;
      mpRenderList();
      mpRenderDetail();
    });

  // --- Modpack Settings ---
  document
    .getElementById("btn-modpack-settings")
    .addEventListener("click", () => {
      const mp = mpGet();
      const isViewingVersion =
        state.activeVersionForMods && !state.activeModpackId;

      if (!mp && !isViewingVersion) return;

      if (isViewingVersion) {
        // Show version settings
        const versionSettings = state.versionSettings[
          state.activeVersionForMods
        ] || {
          loader: "Vanilla",
          loaderVersion: "",
          javaArgs: "",
          windowWidth: 1024,
          windowHeight: 768,
        };

        document.getElementById("mp-settings-name").value =
          state.activeVersionForMods;
        document.getElementById("mp-settings-name").disabled = true;
        document.getElementById("mp-settings-description").value = "";
        document.getElementById("mp-settings-description").disabled = true;
        document.getElementById("mp-settings-version").value =
          state.activeVersionForMods;
        document.getElementById("mp-settings-version").disabled = true;
        document.getElementById("mp-settings-loader").value =
          versionSettings.loader;
        document.getElementById("mp-settings-loader").disabled = false;
        document.getElementById("mp-settings-loader-version").value =
          versionSettings.loaderVersion || "";
        document.getElementById("mp-settings-loader-version").disabled = false;
        document.getElementById("mp-settings-java-args").value =
          versionSettings.javaArgs || "";
        document.getElementById("mp-settings-java-args").disabled = false;
        document.getElementById("mp-settings-width").value =
          versionSettings.windowWidth || 1024;
        document.getElementById("mp-settings-width").disabled = false;
        document.getElementById("mp-settings-height").value =
          versionSettings.windowHeight || 768;
        document.getElementById("mp-settings-height").disabled = false;
      } else {
        // Show modpack settings
        document.getElementById("mp-settings-name").disabled = false;
        document.getElementById("mp-settings-description").disabled = false;
        document.getElementById("mp-settings-version").disabled = false;
        document.getElementById("mp-settings-loader").disabled = false;
        document.getElementById("mp-settings-loader-version").disabled = false;
        document.getElementById("mp-settings-java-args").disabled = false;
        document.getElementById("mp-settings-width").disabled = false;
        document.getElementById("mp-settings-height").disabled = false;

        document.getElementById("mp-settings-name").value = mp.name;
        document.getElementById("mp-settings-description").value =
          mp.description || "";
        document.getElementById("mp-settings-version").value =
          mp.mcVersion || "";
        document.getElementById("mp-settings-loader").value =
          mp.loader || "Vanilla";
        document.getElementById("mp-settings-loader-version").value =
          mp.loaderVersion || "";
        document.getElementById("mp-settings-java-args").value =
          mp.javaArgs || "";
        document.getElementById("mp-settings-width").value =
          mp.windowWidth || "1024";
        document.getElementById("mp-settings-height").value =
          mp.windowHeight || "768";
      }

      // Show modal
      document.getElementById("mp-settings-modal").classList.add("active");
    });

  document
    .getElementById("btn-close-mp-settings")
    .addEventListener("click", () => {
      document.getElementById("mp-settings-modal").classList.remove("active");
    });

  document
    .getElementById("btn-cancel-mp-settings")
    .addEventListener("click", () => {
      document.getElementById("mp-settings-modal").classList.remove("active");
    });

  document
    .getElementById("btn-save-mp-settings")
    .addEventListener("click", () => {
      const mp = mpGet();
      const isViewingVersion =
        state.activeVersionForMods && !state.activeModpackId;

      if (isViewingVersion) {
        // Save version settings
        if (!state.versionSettings[state.activeVersionForMods]) {
          state.versionSettings[state.activeVersionForMods] = {};
        }

        state.versionSettings[state.activeVersionForMods].loader =
          document.getElementById("mp-settings-loader").value;
        state.versionSettings[state.activeVersionForMods].loaderVersion =
          document.getElementById("mp-settings-loader-version").value;
        state.versionSettings[state.activeVersionForMods].javaArgs = document
          .getElementById("mp-settings-java-args")
          .value.trim();
        state.versionSettings[state.activeVersionForMods].windowWidth =
          parseInt(document.getElementById("mp-settings-width").value) || 1024;
        state.versionSettings[state.activeVersionForMods].windowHeight =
          parseInt(document.getElementById("mp-settings-height").value) || 768;

        localStorage.setItem(
          "idk_version_settings",
          JSON.stringify(state.versionSettings),
        );
        mpRenderList();
        mpRenderDetail();
      } else if (mp) {
        // Save modpack settings
        mp.name =
          document.getElementById("mp-settings-name").value.trim() || mp.name;
        mp.description = document
          .getElementById("mp-settings-description")
          .value.trim();
        mp.mcVersion = document.getElementById("mp-settings-version").value;
        mp.loader = document.getElementById("mp-settings-loader").value;
        mp.loaderVersion = document.getElementById(
          "mp-settings-loader-version",
        ).value;
        mp.javaArgs = document
          .getElementById("mp-settings-java-args")
          .value.trim();
        mp.windowWidth =
          parseInt(document.getElementById("mp-settings-width").value) || 1024;
        mp.windowHeight =
          parseInt(document.getElementById("mp-settings-height").value) || 768;

        mpSave();
        mpRenderList();
        mpRenderDetail();
      }

      document.getElementById("mp-settings-modal").classList.remove("active");
    });

  // --- Delete Modpack ---
  document
    .getElementById("btn-delete-modpack")
    .addEventListener("click", async () => {
      const mp = mpGet();
      const isViewingVersion =
        state.activeVersionForMods && !state.activeModpackId;

      if (isViewingVersion) {
        actions.showWarningToast("Cannot delete versions.");
        return;
      }

      if (!mp) return;

      // For temporary modpacks (version mods), just remove from state without confirmation
      if (mp.isTemporary) {
        state.modpacks = state.modpacks.filter(
          (m) => m.id !== state.activeModpackId,
        );
        state.activeModpackId = null;
        mpSave();
        mpRenderList();
        mpRenderDetail();
        return;
      }

      // Show delete confirmation modal for permanent modpacks
      const modal = document.getElementById("delete-modpack-modal");
      const checkbox = document.getElementById("delete-files-checkbox");
      const confirmBtn = document.getElementById("delete-modal-confirm");
      const cancelBtn = document.getElementById("delete-modal-cancel");
      const messageEl = document.getElementById("delete-modal-message");

      // Reset checkbox state
      checkbox.checked = false;

      // Update message
      messageEl.textContent = `Are you sure you want to delete "${mp.name}"? This action cannot be undone.`;

      // Show modal
      modal.classList.add("active");

      // Handle confirm
      const handleConfirm = async () => {
        // Only allow deletion if checkbox is checked
        if (!checkbox.checked) {
          actions.showWarningToast("Please check the box to confirm deletion.");
          return;
        }

        // Close modal immediately
        closeModal();

        // Set deletion flag to prevent scanner from running
        isDeleting = true;

        // Remove from state.modpacks list
        state.modpacks = state.modpacks.filter(
          (m) => m.id !== state.activeModpackId,
        );
        state.activeModpackId = null;
        mpSave();
        mpRenderList();
        mpRenderDetail();

        // Delete entire modpack folder from disk using IPC (main process has proper permissions)
        if (window.electronAPI?.deleteModpackFolder) {
          try {
            const result = await window.electronAPI.deleteModpackFolder(mp.id);
            if (!result.success) {
              console.warn(
                "[Modpacks] Failed to delete modpack folder:",
                result.error,
              );
              actions.showWarningToast(
                "Warning: Could not delete all files from disk.",
              );
            } else {
              console.log(
                `[Modpacks] Deleted modpack folder: modpack-${mp.id}`,
              );
            }
          } catch (e) {
            console.warn("[Modpacks] IPC error deleting modpack folder:", e);
            actions.showWarningToast(
              "Warning: Could not delete all files from disk.",
            );
          }
        }

        // Re-enable scanning after deletion
        isDeleting = false;

        // Rescan after a delay to ensure files are fully released
        setTimeout(() => {
          loadProfilesFromDisk();
        }, 1000);

        actions.showWarningToast(`Modpack "${mp.name}" deleted successfully.`);
      };

      const closeModal = () => {
        modal.classList.remove("active");
        // Remove event listeners to prevent duplicates
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      };

      confirmBtn.addEventListener("click", handleConfirm);
      cancelBtn.addEventListener("click", closeModal);
    });

  // Close modal when clicking outside
  document
    .getElementById("delete-modpack-modal")
    .addEventListener("click", (e) => {
      if (e.target.id === "delete-modpack-modal") {
        document
          .getElementById("delete-modpack-modal")
          .classList.remove("active");
      }
    });

  // --- Import Modpack (.zip) ---
  document
    .getElementById("btn-import-modpack")
    .addEventListener("click", async () => {
      if (!window.electronAPI) {
        actions.showWarningToast("Only available in the desktop app.");
        return;
      }
      const zipPath = await window.electronAPI.selectModpackZip();
      if (!zipPath) return;

      const overlay = document.getElementById("launch-overlay");
      const launchStatus = document.getElementById("launch-status");
      const launchFill = document.getElementById("launch-fill");

      try {
        overlay.classList.add("active");
        launchStatus.innerText = "Extracting local modpack archive...";
        launchFill.style.width = "5%";

        const importRes = await window.electronAPI.unzipCurseforge({
          filePath: zipPath,
        });
        if (!importRes.success)
          throw new Error(importRes.error || "Import failed");

        const manifest = importRes.manifest;
        const rawLoaderId = manifest.minecraft?.modLoaders?.[0]?.id || "";
        const loaderStr = rawLoaderId.toLowerCase();
        const loader = loaderStr.includes("fabric")
          ? "Fabric"
          : loaderStr.includes("forge")
            ? "Forge"
            : loaderStr.includes("neoforge")
              ? "NeoForge"
              : "Vanilla";
        const loaderVerMatch = rawLoaderId.match(/^[a-z]+-(.+)$/i);
        const loaderVersion = loaderVerMatch ? loaderVerMatch[1] : "";
        const mcVersion = manifest.minecraft?.version || "1.20.4";

        // Parse modpack name from zip filename
        const zipName = zipPath
          .split(/[\\/]/)
          .pop()
          .replace(/\.zip$/i, "");
        const mpName = manifest.name || zipName || "Imported Modpack";

        const newMp = {
          id: importRes.modpackId,
          name: mpName,
          iconUrl: "",
          mcVersion,
          loader,
          loaderVersion,
          mods: [],
          resourcepacks: [],
          shaders: [],
        };

        // First save the modpack base structure to localStorage so it registers
        const mpData = JSON.parse(localStorage.getItem("idk_modpacks") || "[]");
        mpData.push(newMp);
        localStorage.setItem("idk_modpacks", JSON.stringify(mpData));
        state.modpacks.push(newMp);
        state.activeModpackId = newMp.id;
        mpRenderList();
        mpRenderDetail();

        const manifestFiles = manifest.files || [];
        let completedCount = 0;
        const concurrencyLimit = 4; // Download mods in parallel (reduced from 12 to prevent memory issues)

        const downloadTask = async (f) => {
          try {
            const [fRes, projRes] = await Promise.all([
              fetch(
                `https://api.curse.tools/v1/cf/mods/${f.projectID}/files/${f.fileID}`,
              ),
              fetch(`https://api.curse.tools/v1/cf/mods/${f.projectID}`),
            ]);

            if (!fRes.ok) {
              console.warn(
                `[CurseForge] Failed to fetch file ${f.fileID}: ${fRes.status}`,
              );
              return;
            }

            const fData = await fRes.json();
            if (!fData.data) return;
            const mf = fData.data;

            // Check if file loader matches modpack loader
            const fileName = mf.fileName.toLowerCase();
            const expectedLoader = newMp.loader.toLowerCase();
            const hasExpectedLoader = fileName.includes(expectedLoader);

            if (
              !hasExpectedLoader &&
              (fileName.includes("fabric") ||
                fileName.includes("forge") ||
                fileName.includes("neoforge") ||
                fileName.includes("quilt"))
            ) {
              console.warn(
                `[CurseForge] WARNING: File ${mf.fileName} is for a different loader than ${newMp.loader}. Expected ${expectedLoader} but got ${fileName}`,
              );
            }

            let mUrl = mf.downloadUrl;
            if (!mUrl) {
              const mp1 = Math.floor(mf.id / 1000),
                mp2 = (mf.id % 1000).toString().padStart(3, "0");
              mUrl = `https://edge.forgecdn.net/files/${mp1}/${mp2}/${encodeURIComponent(mf.fileName)}`;
            }
            let classId = 6;
            try {
              if (projRes.ok) {
                const pj = await projRes.json();
                classId = pj.data?.classId ?? 6;
              }
            } catch (e) {
              console.warn("[CurseForge] Error parsing project data:", e);
            }

            if (classId === 12) {
              newMp.resourcepacks.push({
                modrinthId: f.projectID.toString(),
                name: mf.fileName.replace(/\.(zip|jar)$/, ""),
                version: mf.displayName,
                filename: mf.fileName,
                downloadUrl: mUrl,
                iconUrl: "",
              });
              await window.electronAPI.installResourcepack({
                modpackId: newMp.id,
                downloadUrl: mUrl,
                filename: mf.fileName,
              });
            } else if (classId === 6552) {
              newMp.shaders.push({
                modrinthId: f.projectID.toString(),
                name: mf.fileName.replace(/\.(zip|jar)$/, ""),
                version: mf.displayName,
                filename: mf.fileName,
                downloadUrl: mUrl,
                iconUrl: "",
              });
              await window.electronAPI.installShader({
                modpackId: newMp.id,
                downloadUrl: mUrl,
                filename: mf.fileName,
              });
            } else {
              newMp.mods.push({
                modrinthId: f.projectID.toString(),
                name: mf.fileName.replace(/\.jar$/, ""),
                version: mf.displayName,
                filename: mf.fileName,
                downloadUrl: mUrl,
                iconUrl: "",
              });
              await window.electronAPI.installMod({
                modpackId: newMp.id,
                downloadUrl: mUrl,
                filename: mf.fileName,
              });
            }
          } catch (me) {
            console.warn("Failed file", f.projectID, me);
          } finally {
            completedCount++;
            launchStatus.innerText = `Downloading file ${completedCount} / ${manifestFiles.length}...`;
            launchFill.style.width = `${5 + (completedCount / manifestFiles.length) * 90}%`;
          }
        };

        if (manifestFiles.length > 0) {
          const queue = [...manifestFiles];
          const workers = Array(concurrencyLimit)
            .fill(null)
            .map(async () => {
              while (queue.length > 0) {
                const item = queue.shift();
                if (item) await downloadTask(item);
              }
            });
          await Promise.all(workers);
        }

        launchStatus.innerText = "Cataloging overrides...";
        (importRes.resourcepackFiles || []).forEach((rp) => {
          newMp.resourcepacks.push({
            modrinthId: "override-" + rp.filename,
            name: rp.name,
            version: "bundled",
            filename: rp.filename,
            iconUrl: "",
          });
        });
        (importRes.shaderpackFiles || []).forEach((sp) => {
          newMp.shaders.push({
            modrinthId: "override-" + sp.filename,
            name: sp.name,
            version: "bundled",
            filename: sp.filename,
            iconUrl: "",
          });
        });
        (importRes.extraModFiles || []).forEach((em) => {
          if (!newMp.mods.find((m) => m.filename === em.filename)) {
            newMp.mods.push({
              modrinthId: "override-" + em.filename,
              name: em.name,
              version: "bundled",
              filename: em.filename,
              downloadUrl: "",
              iconUrl: "",
            });
          }
        });

        const mpData2 = JSON.parse(
          localStorage.getItem("idk_modpacks") || "[]",
        );
        const idx = mpData2.findIndex((m) => m.id === newMp.id);
        if (idx >= 0) mpData2[idx] = newMp;
        else mpData2.push(newMp);
        localStorage.setItem("idk_modpacks", JSON.stringify(mpData2));
        mpRenderDetail();
        launchFill.style.width = "100%";
        overlay.classList.remove("active");
        actions.showWarningToast(`"${newMp.name}" imported successfully!`);
      } catch (e) {
        overlay.classList.remove("active");
        actions.showWarningToast("Import failed: " + e.message);
      }
    });

  // --- Export Modpack (.zip) ---
  document
    .getElementById("btn-export-modpack")
    .addEventListener("click", async () => {
      const mp = mpGet();
      const isViewingVersion =
        state.activeVersionForMods && !state.activeModpackId;

      if (isViewingVersion) {
        actions.showWarningToast(
          "Cannot export versions. Create a modpack instead.",
        );
        return;
      }

      if (!mp) return;

      // For temporary modpacks, don't allow export
      if (mp.isTemporary) {
        actions.showWarningToast(
          "Cannot export version mods. Create a modpack instead.",
        );
        return;
      }

      if (!window.electronAPI) {
        actions.showWarningToast("Only available in the desktop app.");
        return;
      }

      const defaultName = mp.name.replace(/[^a-zA-Z0-9_\-]/g, "_") + ".zip";
      const destPath = await window.electronAPI.selectExportZip({
        defaultName,
      });
      if (!destPath) return;

      const overlay = document.getElementById("launch-overlay");
      const launchStatus = document.getElementById("launch-status");
      const launchFill = document.getElementById("launch-fill");

      try {
        overlay.classList.add("active");
        launchStatus.innerText = "Packaging modpack archive...";
        launchFill.style.width = "30%";

        const exportRes = await window.electronAPI.exportModpack({
          modpackId: mp.id,
          name: mp.name,
          mcVersion: mp.mcVersion,
          loader: mp.loader,
          loaderVersion: mp.loaderVersion || "",
          destPath,
        });

        if (!exportRes.success)
          throw new Error(exportRes.error || "Export failed");

        launchFill.style.width = "100%";
        overlay.classList.remove("active");
        actions.showWarningToast(
          `Modpack exported to: ${destPath.split(/[\\/]/).pop()}`,
        );
      } catch (e) {
        overlay.classList.remove("active");
        actions.showWarningToast("Export failed: " + e.message);
      }
    });

  // --- Unified Browser ---
  function openBrowser(mode) {
    state.browserMode = mode;
    const titles = {
      mod: "Browse Mods",
      resourcepack: "Browse Resource Packs",
      shader: "Browse Shaders",
      modpack: "Browse Modpacks",
    };
    const placeholders = {
      mod: "Search mods...",
      resourcepack: "Search resource packs...",
      shader: "Search shaders...",
      modpack: "Search modpacks...",
    };
    document.getElementById("browser-title").innerText = titles[mode];
    document.getElementById("mod-search").placeholder =
      placeholders[mode] || "Search...";

    if (mode === "modpack") {
      // For modpacks, show both providers with Modrinth as default
      state.currentProvider = "modrinth";
      document
        .querySelectorAll(".provider-pill")
        .forEach((p) => p.classList.remove("active"));
      document.getElementById("pill-modrinth").classList.add("active");
      document.getElementById("pill-modrinth").style.display = "inline-block";
      document.getElementById("pill-curseforge").style.display = "inline-block";
    } else {
      // For mods, only show Modrinth
      document.getElementById("pill-modrinth").style.display = "inline-block";
      document.getElementById("pill-curseforge").style.display = "none";
    }

    document.getElementById("mod-browser").classList.add("active");
    document.getElementById("mod-search").value = "";
    mpBrowse("");
  }
  document
    .getElementById("btn-browse-mods")
    .addEventListener("click", () => openBrowser("mod"));
  document
    .getElementById("btn-browse-rp")
    .addEventListener("click", () => openBrowser("resourcepack"));
  document
    .getElementById("btn-browse-shaders")
    .addEventListener("click", () => openBrowser("shader"));
  document
    .getElementById("btn-browse-modpacks")
    .addEventListener("click", () => openBrowser("modpack"));
  document
    .getElementById("btn-close-browser")
    .addEventListener("click", () =>
      document.getElementById("mod-browser").classList.remove("active"),
    );

  // Provider pill switching
  document.querySelectorAll(".provider-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelectorAll(".provider-pill")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentProvider = pill.getAttribute("data-provider");
      mpBrowse(document.getElementById("mod-search").value);
    });
  });

  let mpSearchTimeout;
  document.getElementById("mod-search").addEventListener("input", (e) => {
    clearTimeout(mpSearchTimeout);
    mpSearchTimeout = setTimeout(() => mpBrowse(e.target.value, 0), 400);
  });

  async function mpBrowse(query, page = 0) {
    let mp = mpGet();
    const isViewingVersion =
      state.activeVersionForMods && !state.activeModpackId;

    // Create virtual modpack for version if needed
    if (!mp && isViewingVersion) {
      const versionData = state.allVersions?.find(
        (v) => v.id === state.activeVersionForMods,
      );
      const versionSettings = state.versionSettings?.[
        state.activeVersionForMods
      ] || { loader: "Vanilla" };

      mp = {
        id: `version-${state.activeVersionForMods}`,
        name: state.activeVersionForMods,
        mcVersion: state.activeVersionForMods,
        loader: versionSettings.loader,
        mods: [],
        resourcepacks: [],
        shaders: [],
        isVersion: true,
      };
    }

    if (!mp && state.browserMode !== "modpack") return;

    // Store pagination state
    state.browserPage = page;
    state.browserQuery = query;

    const results = document.getElementById("mod-browser-results");
    results.innerHTML = `<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching ${state.currentProvider === "modrinth" ? "Modrinth" : "CurseForge"}...</div>`;
    try {
      let hits = [];
      const pageSize = 20;
      const offset = page * pageSize;

      if (state.currentProvider === "modrinth") {
        let facets;
        if (state.browserMode === "mod")
          facets = encodeURIComponent(
            JSON.stringify([
              [`categories:${mp.loader.toLowerCase()}`],
              [`versions:${mp.mcVersion}`],
              [`project_type:mod`],
            ]),
          );
        else if (state.browserMode === "resourcepack")
          facets = encodeURIComponent(
            JSON.stringify([
              [`versions:${mp.mcVersion}`],
              [`project_type:resourcepack`],
            ]),
          );
        else if (state.browserMode === "shader")
          facets = encodeURIComponent(
            JSON.stringify([[`project_type:shader`]]),
          );
        else if (state.browserMode === "modpack")
          facets = encodeURIComponent(
            JSON.stringify([[`project_type:modpack`]]),
          );
        const res = await fetch(
          `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${facets}&limit=${pageSize}&offset=${offset}`,
        );
        if (!res.ok) throw new Error(`Modrinth API error: ${res.status}`);
        const data = await res.json();
        hits = (data.hits || []).map((m) => ({
          project_id: m.project_id,
          title: m.title,
          description: m.description,
          icon_url: m.icon_url,
          downloads: m.downloads,
          follows: m.follows,
          provider: "modrinth",
        }));
        state.browserTotalResults = data.total_hits || 0;
      } else {
        let classId = 6;
        if (state.browserMode === "resourcepack") classId = 12;
        else if (state.browserMode === "shader") classId = 6552;
        else if (state.browserMode === "modpack") classId = 4471;
        const gameVerStr =
          mp && state.browserMode !== "modpack"
            ? `&gameVersion=${mp.mcVersion}`
            : "";
        const res = await fetch(
          `https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=${classId}&searchFilter=${encodeURIComponent(query)}${gameVerStr}&sortField=2&sortOrder=desc&pageSize=${pageSize}&index=${offset}`,
        );
        if (!res.ok) throw new Error(`CurseForge API error: ${res.status}`);
        const data = await res.json();
        hits = (data.data || []).map((m) => ({
          project_id: m.id.toString(),
          title: m.name,
          description: m.summary,
          icon_url: m.logo ? m.logo.thumbnailUrl : "",
          downloads: m.downloadCount,
          follows: 0,
          provider: "curseforge",
        }));
        state.browserTotalResults = data.pagination?.totalCount || 0;
      }
      results.innerHTML = "";
      if (!hits.length) {
        results.innerHTML = `<div class="mp-loading">No results found for "${query}" | Debug: classId ${classId}, provider ${state.currentProvider}</div>`;
        return;
      }

      // Add pagination controls to the header (next to Modrinth pill)
      const totalPages = Math.ceil(state.browserTotalResults / pageSize);
      const currentPage = state.browserPage + 1;

      const paginationContainer = document.getElementById(
        "pagination-controls",
      );
      paginationContainer.innerHTML = "";

      if (totalPages > 1) {
        // Previous button
        if (state.browserPage > 0) {
          const prevBtn = document.createElement("button");
          prevBtn.textContent = "\u2190 Previous";
          prevBtn.style.cssText =
            "padding:8px 14px;background:rgba(var(--theme-accent-rgb),0.5);border:1px solid rgba(var(--theme-accent-rgb),0.9);color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.2s;box-shadow:0 2px 8px rgba(var(--theme-accent-rgb),0.3);";
          prevBtn.addEventListener(
            "mouseover",
            () =>
              (prevBtn.style.background = "rgba(var(--theme-accent-rgb),0.8)"),
          );
          prevBtn.addEventListener(
            "mouseout",
            () =>
              (prevBtn.style.background = "rgba(var(--theme-accent-rgb),0.5)"),
          );
          prevBtn.addEventListener("click", () =>
            mpBrowse(state.browserQuery, state.browserPage - 1),
          );
          paginationContainer.appendChild(prevBtn);
        }

        // Page info - more visible
        const pageInfo = document.createElement("span");
        pageInfo.textContent = `${currentPage}/${totalPages}`;
        pageInfo.style.cssText =
          "color:#fff;font-size:13px;font-weight:700;min-width:50px;text-align:center;background:rgba(var(--theme-accent-rgb),0.4);padding:6px 12px;border-radius:4px;border:1px solid rgba(var(--theme-accent-rgb),0.6);";
        paginationContainer.appendChild(pageInfo);

        // Next button
        if (currentPage < totalPages) {
          const nextBtn = document.createElement("button");
          nextBtn.textContent = "Next \u2192";
          nextBtn.style.cssText =
            "padding:8px 14px;background:rgba(var(--theme-accent-rgb),0.5);border:1px solid rgba(var(--theme-accent-rgb),0.9);color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.2s;box-shadow:0 2px 8px rgba(var(--theme-accent-rgb),0.3);";
          nextBtn.addEventListener(
            "mouseover",
            () =>
              (nextBtn.style.background = "rgba(var(--theme-accent-rgb),0.8)"),
          );
          nextBtn.addEventListener(
            "mouseout",
            () =>
              (nextBtn.style.background = "rgba(var(--theme-accent-rgb),0.5)"),
          );
          nextBtn.addEventListener("click", () =>
            mpBrowse(state.browserQuery, state.browserPage + 1),
          );
          paginationContainer.appendChild(nextBtn);
        }
      }

      // Get installed mod IDs - handle both modpacks and versions
      let installedIds = [];
      if (state.browserMode === "modpack") {
        installedIds = [];
      } else if (mp) {
        if (mp.isVersion) {
          // For versions, get from versionSettings
          const versionMods =
            state.versionSettings?.[state.activeVersionForMods]?.mods || [];
          installedIds = versionMods.map((m) => m.modrinthId || m.filename);
        } else {
          // For modpacks, get from modpack object
          if (state.browserMode === "mod") {
            installedIds = (Array.isArray(mp.mods) ? mp.mods : []).map(
              (m) => m.modrinthId,
            );
          } else if (state.browserMode === "resourcepack") {
            installedIds = (
              Array.isArray(mp.resourcepacks) ? mp.resourcepacks : []
            ).map((r) => r.modrinthId);
          } else {
            installedIds = (Array.isArray(mp.shaders) ? mp.shaders : []).map(
              (s) => s.modrinthId,
            );
          }
        }
      }

      hits.forEach((mod) => {
        const installed = installedIds.includes(mod.project_id);
        const el = document.createElement("div");
        el.className = "mod-result-card";
        // Get first letter of title for placeholder
        const firstLetter = (mod.title || "M").charAt(0).toUpperCase();
        el.innerHTML = `
        ${mod.icon_url ? `<img class="mod-result-icon" src="${mod.icon_url}" onerror="this.style.display='none'" />` : `<div class="mod-result-icon mod-icon-placeholder" style="width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px;color:rgba(255,255,255,0.6);">${firstLetter}</div>`}
        <div class="mod-result-info">
          <strong>${mod.title}</strong><span>${mod.description}</span>
          <div class="mod-result-meta"><span>\u2193 ${mod.downloads >= 1000 ? (mod.downloads / 1000).toFixed(0) + "K" : mod.downloads}</span></div>
        </div>
        <button class="add-mod-btn ${installed ? "installed" : ""}" ${installed ? "disabled" : ""}>${installed ? "\u2713 Added" : state.browserMode === "modpack" ? "+ Import" : "+ Add"}</button>`;
        if (!installed)
          el.querySelector(".add-mod-btn").addEventListener("click", () =>
            mpAddItem(mod, el.querySelector(".add-mod-btn")),
          );
        results.appendChild(el);
      });

      // Add centered pagination at the bottom
      if (totalPages > 1) {
        const bottomPaginationDiv = document.createElement("div");
        bottomPaginationDiv.style.cssText =
          "grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:12px;margin-top:24px;padding:20px;width:100%;";

        // Previous button
        if (state.browserPage > 0) {
          const prevBtn = document.createElement("button");
          prevBtn.textContent = "\u2190 Previous Page";
          prevBtn.style.cssText =
            "padding:8px 16px;background:rgba(var(--theme-accent-rgb),0.3);border:1px solid rgba(var(--theme-accent-rgb),0.7);color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s;";
          prevBtn.addEventListener(
            "mouseover",
            () =>
              (prevBtn.style.background = "rgba(var(--theme-accent-rgb),0.6)"),
          );
          prevBtn.addEventListener(
            "mouseout",
            () =>
              (prevBtn.style.background = "rgba(var(--theme-accent-rgb),0.3)"),
          );
          prevBtn.addEventListener("click", () =>
            mpBrowse(state.browserQuery, state.browserPage - 1),
          );
          bottomPaginationDiv.appendChild(prevBtn);
        }

        // Page info - centered and visible
        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.style.cssText =
          "color:#fff;font-size:13px;font-weight:700;background:rgba(var(--theme-accent-rgb),0.2);padding:8px 16px;border-radius:4px;border:1px solid rgba(var(--theme-accent-rgb),0.5);";
        bottomPaginationDiv.appendChild(pageInfo);

        // Next button
        if (currentPage < totalPages) {
          const nextBtn = document.createElement("button");
          nextBtn.textContent = "Next Page \u2192";
          nextBtn.style.cssText =
            "padding:8px 16px;background:rgba(var(--theme-accent-rgb),0.3);border:1px solid rgba(var(--theme-accent-rgb),0.7);color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s;";
          nextBtn.addEventListener(
            "mouseover",
            () =>
              (nextBtn.style.background = "rgba(var(--theme-accent-rgb),0.6)"),
          );
          nextBtn.addEventListener(
            "mouseout",
            () =>
              (nextBtn.style.background = "rgba(var(--theme-accent-rgb),0.3)"),
          );
          nextBtn.addEventListener("click", () =>
            mpBrowse(state.browserQuery, state.browserPage + 1),
          );
          bottomPaginationDiv.appendChild(nextBtn);
        }

        results.appendChild(bottomPaginationDiv);
      }
    } catch (e) {
      results.innerHTML = `<div class="mp-loading" style="color:red;font-size:12px;">Error: ${e.message} <br/> ${e.stack}</div>`;
    }
  }

  async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {
    // ---- MODPACK IMPORT FLOW ----
    if (state.browserMode === "modpack" && !isDependency) {
      if (btn) {
        btn.textContent = "Fetching...";
        btn.disabled = true;
      }
      showImportOverlay("Resolving modpack metadata...", 2);
      try {
        const projectId = typeof mod === "string" ? mod : mod.project_id;
        const modName = typeof mod === "string" ? "Modpack" : mod.title;
        const provider =
          typeof mod === "string" ? "modrinth" : mod.provider || "modrinth";

        // Fetch modpack details to get icon
        let modpackIcon = "";
        try {
          const modDetailsRes = await fetch(
            `https://api.curse.tools/v1/cf/mods/${projectId}`,
          );
          const modDetails = await modDetailsRes.json();
          if (modDetails.data?.logo?.thumbnailUrl) {
            modpackIcon = modDetails.data.logo.thumbnailUrl;
          }
        } catch (e) {
          console.warn("Could not fetch modpack icon:", e);
        }

        const filesRes = await fetch(
          `https://api.curse.tools/v1/cf/mods/${projectId}/files`,
        );
        const filesData = await filesRes.json();
        let files = filesData.data || [];
        files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate));
        if (!files.length) {
          hideImportOverlay();
          actions.showWarningToast("No downloadable files found.");
          if (btn) {
            btn.textContent = "+ Import";
            btn.disabled = false;
          }
          return;
        }
        const fileObj = files[0];
        let dlUrl = fileObj.downloadUrl;
        if (!dlUrl) {
          const p1 = Math.floor(fileObj.id / 1000);
          const p2 = (fileObj.id % 1000).toString().padStart(3, "0");
          dlUrl = `https://edge.forgecdn.net/files/${p1}/${p2}/${encodeURIComponent(fileObj.fileName)}`;
        }
        document.getElementById("mod-browser").classList.remove("active");
        showImportOverlay("Downloading modpack archive...", 5);
        if (!window.electronAPI) {
          hideImportOverlay();
          actions.showWarningToast("Only available in the desktop app.");
          return;
        }
        const importRes = await window.electronAPI.downloadCurseforgeModpack({
          downloadUrl: dlUrl,
        });
        if (!importRes.success)
          throw new Error(importRes.error || "Import failed");
        const manifest = importRes.manifest;
        const rawLoaderId = manifest.minecraft?.modLoaders?.[0]?.id || "";
        const loaderStr = rawLoaderId.toLowerCase();
        const loader = loaderStr.includes("fabric")
          ? "Fabric"
          : loaderStr.includes("forge")
            ? "Forge"
            : loaderStr.includes("neoforge")
              ? "NeoForge"
              : "Vanilla";
        // Extract pinned version: 'forge-14.23.5.2860' \u2192 '14.23.5.2860', 'fabric-0.15.11' \u2192 '0.15.11'
        const loaderVerMatch = rawLoaderId.match(/^[a-z]+-(.+)$/i);
        const loaderVersion = loaderVerMatch ? loaderVerMatch[1] : "";
        const mcVersion = manifest.minecraft?.version || "1.20.4";
        const newMp = {
          id: importRes.modpackId,
          name: manifest.name || modName,
          iconUrl: modpackIcon,
          mcVersion,
          loader,
          loaderVersion,
          mods: [],
          resourcepacks: [],
          shaders: [],
        };
        const mpData = JSON.parse(localStorage.getItem("idk_modpacks") || "[]");
        mpData.push(newMp);
        localStorage.setItem("idk_modpacks", JSON.stringify(mpData));
        state.modpacks.push(newMp);
        state.activeModpackId = newMp.id;
        mpRenderList();
        mpRenderDetail();

        // Profile metadata is managed by the main process via IPC
        // No need to save to disk here - the main process handles profile.json files

        const manifestFiles = manifest.files || [];
        let completedCount = 0;
        const concurrencyLimit = 4; // Download mods in parallel (reduced from 12 to prevent memory issues)

        const downloadTask = async (f) => {
          try {
            // Fetch file metadata + project category in parallel
            const [fRes, projRes] = await Promise.all([
              fetch(
                `https://api.curse.tools/v1/cf/mods/${f.projectID}/files/${f.fileID}`,
              ),
              fetch(`https://api.curse.tools/v1/cf/mods/${f.projectID}`),
            ]);
            const fData = await fRes.json();
            if (!fData.data) return;
            const mf = fData.data;
            let mUrl = mf.downloadUrl;
            if (!mUrl) {
              const mp1 = Math.floor(mf.id / 1000),
                mp2 = (mf.id % 1000).toString().padStart(3, "0");
              mUrl = `https://edge.forgecdn.net/files/${mp1}/${mp2}/${encodeURIComponent(mf.fileName)}`;
            }
            // Determine type from classId: 6=Mod, 12=ResourcePack, 6552=Shader
            let classId = 6;
            let projectIcon = ""; // Fetch icon from project data
            try {
              const pj = await projRes.json();
              classId = pj.data?.classId ?? 6;
              projectIcon = pj.data?.logo?.thumbnailUrl || ""; // Get icon from project
            } catch (_) {}

            if (classId === 12) {
              // Resource Pack
              newMp.resourcepacks.push({
                modrinthId: f.projectID.toString(),
                name: mf.fileName.replace(/\.(zip|jar)$/, ""),
                version: mf.displayName,
                filename: mf.fileName,
                downloadUrl: mUrl,
                iconUrl: projectIcon,
              });
              await window.electronAPI.installResourcepack({
                modpackId: newMp.id,
                downloadUrl: mUrl,
                filename: mf.fileName,
              });
            } else if (classId === 6552) {
              // Shader Pack
              newMp.shaders.push({
                modrinthId: f.projectID.toString(),
                name: mf.fileName.replace(/\.(zip|jar)$/, ""),
                version: mf.displayName,
                filename: mf.fileName,
                downloadUrl: mUrl,
                iconUrl: projectIcon,
              });
              await window.electronAPI.installShader({
                modpackId: newMp.id,
                downloadUrl: mUrl,
                filename: mf.fileName,
              });
            } else {
              // Default: Mod
              newMp.mods.push({
                modrinthId: f.projectID.toString(),
                name: mf.fileName.replace(/\.jar$/, ""),
                version: mf.displayName,
                filename: mf.fileName,
                downloadUrl: mUrl,
                iconUrl: projectIcon,
              });
              await window.electronAPI.installMod({
                modpackId: newMp.id,
                downloadUrl: mUrl,
                filename: mf.fileName,
              });
            }
          } catch (me) {
            console.warn("Failed file", f.projectID, me);
          } finally {
            completedCount++;
            const percent = manifestFiles.length
              ? 5 + (completedCount / manifestFiles.length) * 90
              : 95;
            setImportProgress(
              `Downloading file ${completedCount} / ${manifestFiles.length}...`,
              percent,
            );
          }
        };

        // Process parallel workers
        const queue = [...manifestFiles];
        const workers = Array(concurrencyLimit)
          .fill(null)
          .map(async () => {
            while (queue.length > 0) {
              const item = queue.shift();
              if (item) await downloadTask(item);
            }
          });
        await Promise.all(workers);
        // --- Catalog resource packs / shaders / extra mods from overrides -----
        setImportProgress("Cataloging overrides...", 96);
        (importRes.resourcepackFiles || []).forEach((rp) => {
          newMp.resourcepacks.push({
            modrinthId: "override-" + rp.filename,
            name: rp.name,
            version: "bundled",
            filename: rp.filename,
            iconUrl: "",
          });
        });
        (importRes.shaderpackFiles || []).forEach((sp) => {
          newMp.shaders.push({
            modrinthId: "override-" + sp.filename,
            name: sp.name,
            version: "bundled",
            filename: sp.filename,
            iconUrl: "",
          });
        });
        (importRes.extraModFiles || []).forEach((em) => {
          if (!newMp.mods.find((m) => m.filename === em.filename)) {
            newMp.mods.push({
              modrinthId: "override-" + em.filename,
              name: em.name,
              version: "bundled",
              filename: em.filename,
              downloadUrl: "",
              iconUrl: "",
            });
          }
        });
        // -----------------------------------------------------------------------
        const mpData2 = JSON.parse(
          localStorage.getItem("idk_modpacks") || "[]",
        );
        const idx = mpData2.findIndex((m) => m.id === newMp.id);
        if (idx >= 0) mpData2[idx] = newMp;
        else mpData2.push(newMp);
        localStorage.setItem("idk_modpacks", JSON.stringify(mpData2));
        mpRenderDetail();
        setImportProgress("Import complete.", 100);
        hideImportOverlay();
        actions.showWarningToast(`"${newMp.name}" imported successfully!`);
      } catch (e) {
        hideImportOverlay();
        actions.showWarningToast("Import failed: " + e.message);
        if (btn) {
          btn.textContent = "+ Import";
          btn.disabled = false;
        }
      }
      return;
    }

    // ---- MODRINTH MODPACK IMPORT FLOW ----
    if (
      state.browserMode === "modpack" &&
      mod.provider === "modrinth" &&
      !isDependency
    ) {
      if (btn) {
        btn.textContent = "Fetching...";
        btn.disabled = true;
      }
      showImportOverlay("Resolving modpack metadata...", 2);
      try {
        const projectId = typeof mod === "string" ? mod : mod.project_id;
        const modName = typeof mod === "string" ? "Modpack" : mod.title;
        const modpackIcon = mod.icon_url || "";

        // Fetch Modrinth modpack versions
        const versionsRes = await fetch(
          `https://api.modrinth.com/v2/project/${projectId}/versions`,
        );
        const versions = await versionsRes.json();
        if (!Array.isArray(versions) || !versions.length) {
          hideImportOverlay();
          actions.showWarningToast("No versions found.");
          if (btn) {
            btn.textContent = "+ Import";
            btn.disabled = false;
          }
          return;
        }

        // Get latest version
        const latestVersion = versions[0];
        const files = latestVersion.files || [];
        const primaryFile = files.find((f) => f.primary) || files[0];
        if (!primaryFile) {
          hideImportOverlay();
          actions.showWarningToast("No downloadable file found.");
          if (btn) {
            btn.textContent = "+ Import";
            btn.disabled = false;
          }
          return;
        }

        const dlUrl = primaryFile.url;
        document.getElementById("mod-browser").classList.remove("active");
        showImportOverlay("Downloading modpack archive...", 5);
        if (!window.electronAPI) {
          hideImportOverlay();
          actions.showWarningToast("Only available in the desktop app.");
          return;
        }

        const importRes = await window.electronAPI.downloadModrinthModpack({
          downloadUrl: dlUrl,
        });
        if (!importRes.success)
          throw new Error(importRes.error || "Import failed");
        const manifest = importRes.manifest;
        const mcVersion = manifest.minecraft?.version || "1.20.4";
        const rawLoaderId = manifest.minecraft?.modLoaders?.[0]?.id || "";
        const loaderStr = rawLoaderId.toLowerCase();
        const loader = loaderStr.includes("fabric")
          ? "Fabric"
          : loaderStr.includes("forge")
            ? "Forge"
            : loaderStr.includes("neoforge")
              ? "NeoForge"
              : "Vanilla";
        const loaderVerMatch = rawLoaderId.match(/^[a-z]+-(.+)$/i);
        const loaderVersion = loaderVerMatch ? loaderVerMatch[1] : "";

        const newMp = {
          id: importRes.modpackId,
          name: manifest.name || modName,
          iconUrl: modpackIcon,
          mcVersion,
          loader,
          loaderVersion,
          mods: [],
          resourcepacks: [],
          shaders: [],
        };
        const mpData = JSON.parse(localStorage.getItem("idk_modpacks") || "[]");
        mpData.push(newMp);
        localStorage.setItem("idk_modpacks", JSON.stringify(mpData));
        state.modpacks.push(newMp);
        state.activeModpackId = newMp.id;
        mpRenderList();
        mpRenderDetail();

        // Profile metadata is managed by the main process via IPC
        // No need to save to disk here - the main process handles profile.json files

        const manifestFiles = manifest.files || [];
        let completedCount = 0;
        const concurrencyLimit = 4; // Download mods in parallel (reduced from 12 to prevent memory issues)

        const downloadTask = async (f) => {
          try {
            const fUrl = f.downloads?.[0] || f.url;
            if (!fUrl) return;

            let fileType = "mod";
            if (f.path?.includes("resourcepacks/")) fileType = "resourcepack";
            else if (f.path?.includes("shaderpacks/")) fileType = "shader";

            const filename =
              f.path?.split("/").pop() || f.filename || "file.jar";

            // Try to fetch project icon from Modrinth API if we have a project ID
            let projectIcon = "";
            if (f.project_id) {
              try {
                const projRes = await fetch(
                  `https://api.modrinth.com/v2/project/${f.project_id}`,
                );
                if (projRes.ok) {
                  const projData = await projRes.json();
                  projectIcon = projData.icon_url || "";
                }
              } catch (e) {
                console.warn(
                  `Failed to fetch icon for project ${f.project_id}:`,
                  e,
                );
              }
            }

            if (fileType === "resourcepack") {
              newMp.resourcepacks.push({
                modrinthId: f.hashes?.sha1 || filename,
                name: filename.replace(/\.(zip|jar)$/, ""),
                version: "bundled",
                filename,
                downloadUrl: fUrl,
                iconUrl: projectIcon,
              });
              await window.electronAPI.installResourcepack({
                modpackId: newMp.id,
                downloadUrl: fUrl,
                filename,
              });
            } else if (fileType === "shader") {
              newMp.shaders.push({
                modrinthId: f.hashes?.sha1 || filename,
                name: filename.replace(/\.(zip|jar)$/, ""),
                version: "bundled",
                filename,
                downloadUrl: fUrl,
                iconUrl: projectIcon,
              });
              await window.electronAPI.installShader({
                modpackId: newMp.id,
                downloadUrl: fUrl,
                filename,
              });
            } else {
              newMp.mods.push({
                modrinthId: f.hashes?.sha1 || filename,
                name: filename.replace(/\.jar$/, ""),
                version: "bundled",
                filename,
                downloadUrl: fUrl,
                iconUrl: projectIcon,
              });
              await window.electronAPI.installMod({
                modpackId: newMp.id,
                downloadUrl: fUrl,
                filename,
              });
            }
          } catch (me) {
            console.warn("Failed file", f.path, me);
          } finally {
            completedCount++;
            const percent = manifestFiles.length
              ? 5 + (completedCount / manifestFiles.length) * 90
              : 95;
            setImportProgress(
              `Downloading file ${completedCount} / ${manifestFiles.length}...`,
              percent,
            );
          }
        };

        const queue = [...manifestFiles];
        const workers = Array(concurrencyLimit)
          .fill(null)
          .map(async () => {
            while (queue.length > 0) {
              const item = queue.shift();
              if (item) await downloadTask(item);
            }
          });
        await Promise.all(workers);

        const mpData2 = JSON.parse(
          localStorage.getItem("idk_modpacks") || "[]",
        );
        const idx = mpData2.findIndex((m) => m.id === newMp.id);
        if (idx >= 0) mpData2[idx] = newMp;
        else mpData2.push(newMp);
        localStorage.setItem("idk_modpacks", JSON.stringify(mpData2));
        mpRenderDetail();
        setImportProgress("Import complete.", 100);
        hideImportOverlay();
        actions.showWarningToast(`"${newMp.name}" imported successfully!`);
      } catch (e) {
        hideImportOverlay();
        actions.showWarningToast("Import failed: " + e.message);
        if (btn) {
          btn.textContent = "+ Import";
          btn.disabled = false;
        }
      }
      return;
    }

    // ---- NORMAL MOD/RP/SHADER FLOW ----
    // Get modpack OR create a virtual modpack for version
    let mp = passedMp || mpGet();
    const isViewingVersion =
      state.activeVersionForMods && !state.activeModpackId;

    if (!mp && isViewingVersion) {
      // Create a virtual modpack object for the version
      const versionData = state.allVersions?.find(
        (v) => v.id === state.activeVersionForMods,
      );
      const versionSettings = state.versionSettings?.[
        state.activeVersionForMods
      ] || { loader: "Vanilla" };

      mp = {
        id: `version-${state.activeVersionForMods}`,
        name: state.activeVersionForMods,
        mcVersion: state.activeVersionForMods,
        loader: versionSettings.loader,
        mods: [],
        resourcepacks: [],
        shaders: [],
        isVersion: true, // Flag to indicate this is a version, not a real modpack
      };
    }

    if (!mp) return;
    if (btn) {
      btn.textContent = "\u2193 Fetching...";
      btn.disabled = true;
    }
    try {
      let versions, fileObj, entry;

      const projectId = typeof mod === "string" ? mod : mod.project_id;
      const modTitle = typeof mod === "string" ? "Dependency" : mod.title;
      const modIcon = typeof mod === "string" ? "" : mod.icon_url || "";
      const provider =
        typeof mod === "string" ? "modrinth" : mod.provider || "modrinth";

      // ---- CURSEFORGE FLOW ----
      if (provider === "curseforge") {
        if (state.browserMode === "mod") {
          if (mp.mods.find((m) => m.modrinthId === projectId)) {
            if (btn) {
              btn.textContent = "\u2713 Added";
              btn.classList.add("installed");
            }
            return;
          }

          const filesRes = await fetch(
            `https://api.curse.tools/v1/cf/mods/${projectId}/files`,
          );
          if (!filesRes.ok)
            throw new Error(`CurseForge API error: ${filesRes.status}`);
          const filesData = await filesRes.json();

          let files = filesData.data || [];
          files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate));

          console.log(
            `[CurseForge] Fetching ${modTitle} for MC ${mp.mcVersion} + ${mp.loader}`,
          );
          console.log(`[CurseForge] Found ${files.length} files`);

          // Normalize loader name for comparison
          const loaderName = mp.loader.toLowerCase();

          // Filter by MC version AND loader (check filename for loader)
          let compatibleFile = files.find((f) => {
            const hasVersion = f.gameVersions?.includes(mp.mcVersion);
            const fileName = f.fileName.toLowerCase();
            const hasLoader = fileName.includes(loaderName);
            console.log(
              `[CurseForge] Checking: ${f.fileName} - Version: ${hasVersion}, Loader: ${hasLoader}`,
            );
            return hasVersion && hasLoader;
          });

          if (compatibleFile) {
            console.log(
              `[CurseForge] \u2713 Found exact match: ${compatibleFile.fileName}`,
            );
          } else {
            console.log(
              `[CurseForge] No exact match found, trying fallbacks...`,
            );

            // If no exact match with loader, try just MC version
            compatibleFile = files.find((f) =>
              f.gameVersions?.includes(mp.mcVersion),
            );
            if (compatibleFile) {
              console.log(
                `[CurseForge] Found version match (no loader): ${compatibleFile.fileName}`,
              );
            }
          }

          if (!compatibleFile) {
            // If no exact match, try to find any file for the same major version
            const majorVersion = mp.mcVersion.split(".").slice(0, 2).join(".");
            compatibleFile = files.find((f) =>
              f.gameVersions?.some((v) => v.startsWith(majorVersion)),
            );
            if (compatibleFile) {
              console.log(
                `[CurseForge] Found major version match: ${compatibleFile.fileName}`,
              );
            }
          }

          if (!compatibleFile) {
            console.log(`[CurseForge] No version match, using latest file`);
            compatibleFile = files[0];
          }

          if (!compatibleFile) {
            if (btn) {
              actions.showWarningToast(
                `${modTitle} has no downloadable version`,
              );
              btn.textContent = "+ Add";
              btn.disabled = false;
            }
            return;
          }

          console.log(`[CurseForge] Selected file: ${compatibleFile.fileName}`);

          // Fetch project icon from CurseForge API if not already available
          let projectIcon = modIcon;
          if (!projectIcon) {
            try {
              const projRes = await fetch(
                `https://api.curse.tools/v1/cf/mods/${projectId}`,
              );
              if (projRes.ok) {
                const projData = await projRes.json();
                projectIcon = projData.data?.logo?.thumbnailUrl || "";
              }
            } catch (e) {
              console.warn("[CurseForge] Failed to fetch project icon:", e);
            }
          }

          entry = {
            modrinthId: projectId,
            name: modTitle,
            version: compatibleFile.displayName,
            filename: compatibleFile.fileName,
            downloadUrl: compatibleFile.downloadUrl,
            iconUrl: projectIcon,
          };

          if (mp.isVersion) {
            // For versions, install directly and track in versionSettings
            if (btn) btn.textContent = "\u2193 Installing...";

            // Initialize versionSettings if needed
            if (!state.versionSettings[state.activeVersionForMods]) {
              state.versionSettings[state.activeVersionForMods] = {};
            }
            if (!state.versionSettings[state.activeVersionForMods].mods) {
              state.versionSettings[state.activeVersionForMods].mods = [];
            }

            // Add mod metadata to versionSettings
            const modEntry = {
              modrinthId: projectId,
              name: modTitle,
              version: compatibleFile.displayName,
              filename: compatibleFile.fileName,
              downloadUrl: compatibleFile.downloadUrl,
              iconUrl: projectIcon,
            };

            // Check if already added
            if (
              !state.versionSettings[state.activeVersionForMods].mods.find(
                (m) => m.filename === compatibleFile.fileName,
              )
            ) {
              state.versionSettings[state.activeVersionForMods].mods.push(
                modEntry,
              );
              localStorage.setItem(
                "idk_version_settings",
                JSON.stringify(state.versionSettings),
              );
            }

            if (window.electronAPI) {
              await window.electronAPI.installModToVersion({
                version: state.activeVersionForMods,
                downloadUrl: compatibleFile.downloadUrl,
                filename: compatibleFile.fileName,
              });
            }
          } else {
            // For modpacks, save and install
            mp.mods.push(entry);
            mpSave();
            if (btn) btn.textContent = "\u2193 Installing...";
            if (window.electronAPI)
              await window.electronAPI.installMod({
                modpackId: mp.id,
                downloadUrl: compatibleFile.downloadUrl,
                filename: compatibleFile.fileName,
              });
          }
        } else if (state.browserMode === "resourcepack") {
          if (mp.resourcepacks.find((r) => r.modrinthId === projectId)) {
            if (btn) {
              btn.textContent = "\u2713 Added";
              btn.classList.add("installed");
            }
            return;
          }

          const filesRes = await fetch(
            `https://api.curse.tools/v1/cf/mods/${projectId}/files`,
          );
          if (!filesRes.ok)
            throw new Error(`CurseForge API error: ${filesRes.status}`);
          const filesData = await filesRes.json();

          let files = filesData.data || [];
          files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate));

          // Try to find exact version match
          let compatibleFile = files.find((f) =>
            f.gameVersions?.includes(mp.mcVersion),
          );

          // If no exact match, try to find any file for the same major version
          if (!compatibleFile) {
            const majorVersion = mp.mcVersion.split(".").slice(0, 2).join(".");
            compatibleFile = files.find((f) =>
              f.gameVersions?.some((v) => v.startsWith(majorVersion)),
            );
          }

          // If still no match, just use the latest file
          if (!compatibleFile) {
            compatibleFile = files[0];
          }

          if (!compatibleFile) {
            if (btn) {
              actions.showWarningToast(
                `${modTitle} has no downloadable version`,
              );
              btn.textContent = "+ Add";
              btn.disabled = false;
            }
            return;
          }

          entry = {
            modrinthId: projectId,
            name: modTitle,
            version: compatibleFile.displayName,
            filename: compatibleFile.fileName,
            downloadUrl: compatibleFile.downloadUrl,
            iconUrl: modIcon,
          };
          mp.resourcepacks.push(entry);
          mpSave();
          if (btn) btn.textContent = "\u2193 Installing...";
          if (window.electronAPI)
            await window.electronAPI.installResourcepack({
              modpackId: mp.id,
              downloadUrl: compatibleFile.downloadUrl,
              filename: compatibleFile.fileName,
            });
        } else if (state.browserMode === "shader") {
          if (mp.shaders.find((s) => s.modrinthId === projectId)) {
            if (btn) {
              btn.textContent = "\u2713 Added";
              btn.classList.add("installed");
            }
            return;
          }

          const filesRes = await fetch(
            `https://api.curse.tools/v1/cf/mods/${projectId}/files`,
          );
          if (!filesRes.ok)
            throw new Error(`CurseForge API error: ${filesRes.status}`);
          const filesData = await filesRes.json();

          let files = filesData.data || [];
          files.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate));

          const compatibleFile = files[0]; // Shaders might not have version filtering
          if (!compatibleFile) {
            if (btn) {
              actions.showWarningToast(
                `${modTitle} has no downloadable version`,
              );
              btn.textContent = "+ Add";
              btn.disabled = false;
            }
            return;
          }

          entry = {
            modrinthId: projectId,
            name: modTitle,
            version: compatibleFile.displayName,
            filename: compatibleFile.fileName,
            downloadUrl: compatibleFile.downloadUrl,
            iconUrl: modIcon,
          };
          mp.shaders.push(entry);
          mpSave();
          if (btn) btn.textContent = "\u2193 Installing...";
          if (window.electronAPI)
            await window.electronAPI.installShader({
              modpackId: mp.id,
              downloadUrl: compatibleFile.downloadUrl,
              filename: compatibleFile.fileName,
            });
        }
      } else {
        // ---- MODRINTH FLOW ----
        if (state.browserMode === "mod" || isDependency) {
          if (mp.mods.find((m) => m.modrinthId === projectId)) {
            if (btn) {
              btn.textContent = "\u2713 Added";
              btn.classList.add("installed");
            }
            return;
          }

          const res = await fetch(
            `https://api.modrinth.com/v2/project/${projectId}/version?loaders=${encodeURIComponent(JSON.stringify([mp.loader.toLowerCase()]))}&game_versions=${encodeURIComponent(JSON.stringify([mp.mcVersion]))}`,
          );
          if (!res.ok)
            throw new Error(
              `Modrinth API error: ${res.status} ${res.statusText}`,
            );
          versions = await res.json();
          if (!versions.length) {
            if (btn) {
              actions.showWarningToast(
                `${modTitle} has no version for MC ${mp.mcVersion} + ${mp.loader}`,
              );
              btn.textContent = "+ Add";
              btn.disabled = false;
            }
            return;
          }
          const versionObj = versions[0];
          fileObj =
            versionObj.files.find((f) => f.primary) || versionObj.files[0];

          // Fetch project icon from Modrinth API if not already available
          let projectIcon = modIcon;
          if (!projectIcon) {
            try {
              const projRes = await fetch(
                `https://api.modrinth.com/v2/project/${projectId}`,
              );
              if (projRes.ok) {
                const projData = await projRes.json();
                projectIcon = projData.icon_url || "";
              }
            } catch (e) {
              console.warn("[Modrinth] Failed to fetch project icon:", e);
            }
          }

          entry = {
            modrinthId: projectId,
            name:
              modTitle === "Dependency"
                ? fileObj.filename.split("-")[0]
                : modTitle,
            version: versionObj.version_number,
            filename: fileObj.filename,
            downloadUrl: fileObj.url,
            iconUrl: projectIcon,
          };

          if (mp.isVersion) {
            // For versions, install directly and track in versionSettings
            if (btn) btn.textContent = "\u2193 Installing...";

            // Initialize versionSettings if needed
            if (!state.versionSettings[state.activeVersionForMods]) {
              state.versionSettings[state.activeVersionForMods] = {};
            }
            if (!state.versionSettings[state.activeVersionForMods].mods) {
              state.versionSettings[state.activeVersionForMods].mods = [];
            }

            // Add mod metadata to versionSettings
            const modEntry = {
              modrinthId: projectId,
              name:
                modTitle === "Dependency"
                  ? fileObj.filename.split("-")[0]
                  : modTitle,
              version: versionObj.version_number,
              filename: fileObj.filename,
              downloadUrl: fileObj.url,
              iconUrl: projectIcon,
            };

            // Check if already added
            if (
              !state.versionSettings[state.activeVersionForMods].mods.find(
                (m) => m.filename === fileObj.filename,
              )
            ) {
              state.versionSettings[state.activeVersionForMods].mods.push(
                modEntry,
              );
              localStorage.setItem(
                "idk_version_settings",
                JSON.stringify(state.versionSettings),
              );
            }

            if (window.electronAPI) {
              await window.electronAPI.installModToVersion({
                version: state.activeVersionForMods,
                downloadUrl: fileObj.url,
                filename: fileObj.filename,
              });
            }
          } else {
            // For modpacks, save and install
            mp.mods.push(entry);
            mpSave();
            if (btn) btn.textContent = "\u2193 Installing...";
            if (window.electronAPI)
              await window.electronAPI.installMod({
                modpackId: mp.id,
                downloadUrl: fileObj.url,
                filename: fileObj.filename,
              });
          }

          if (versionObj.dependencies) {
            for (const dep of versionObj.dependencies) {
              if (dep.dependency_type === "required" && dep.project_id) {
                await mpAddItem(dep.project_id, null, true, mp);
              }
            }
          }
        } else if (state.browserMode === "resourcepack") {
          const res = await fetch(
            `https://api.modrinth.com/v2/project/${projectId}/version?game_versions=${encodeURIComponent(JSON.stringify([mp.mcVersion]))}`,
          );
          if (!res.ok)
            throw new Error(
              `Modrinth API error: ${res.status} ${res.statusText}`,
            );
          versions = await res.json();
          if (!versions.length) {
            actions.showWarningToast(
              `${modTitle} has no version for MC ${mp.mcVersion}`,
            );
            if (btn) {
              btn.textContent = "+ Add";
              btn.disabled = false;
            }
            return;
          }
          const versionObj = versions[0];
          fileObj =
            versionObj.files.find((f) => f.primary) || versionObj.files[0];
          entry = {
            modrinthId: projectId,
            name: modTitle,
            version: versionObj.version_number,
            filename: fileObj.filename,
            downloadUrl: fileObj.url,
            iconUrl: modIcon,
          };
          mp.resourcepacks.push(entry);
          mpSave();
          if (btn) btn.textContent = "\u2193 Installing...";
          if (window.electronAPI)
            await window.electronAPI.installResourcepack({
              modpackId: mp.id,
              downloadUrl: fileObj.url,
              filename: fileObj.filename,
            });
        } else {
          const res = await fetch(
            `https://api.modrinth.com/v2/project/${projectId}/version`,
          );
          if (!res.ok)
            throw new Error(
              `Modrinth API error: ${res.status} ${res.statusText}`,
            );
          versions = await res.json();
          if (!versions.length) {
            actions.showWarningToast(
              `${modTitle} has no downloadable version.`,
            );
            if (btn) {
              btn.textContent = "+ Add";
              btn.disabled = false;
            }
            return;
          }
          const versionObj = versions[0];
          fileObj =
            versionObj.files.find((f) => f.primary) || versionObj.files[0];
          entry = {
            modrinthId: projectId,
            name: modTitle,
            version: versionObj.version_number,
            filename: fileObj.filename,
            downloadUrl: fileObj.url,
            iconUrl: modIcon,
          };
          mp.shaders.push(entry);
          mpSave();
          if (btn) btn.textContent = "\u2193 Installing...";
          if (window.electronAPI)
            await window.electronAPI.installShader({
              modpackId: mp.id,
              downloadUrl: fileObj.url,
              filename: fileObj.filename,
            });
        }
      }
      if (btn) {
        btn.textContent = "\u2713 Added";
        btn.classList.add("installed");
      }

      // Reload version mods if viewing a version
      if (mp.isVersion && state.activeVersionForMods) {
        await loadVersionMods(state.activeVersionForMods);
      }

      mpRenderDetail();
      mpRenderList();
    } catch (e) {
      if (btn && !isDependency) {
        actions.showWarningToast(
          `Failed to add ${typeof mod === "string" ? mod : mod.title}: ${e.message}`,
        );
        btn.textContent = "+ Add";
        btn.disabled = false;
      }
    }
  }

  // --- Play Modpack ---
  // IPC listeners are already registered globally above \u2014 no setup needed here.
  document.getElementById("btn-play-modpack").addEventListener("click", () => {
    const mp = mpGet();
    const isViewingVersion =
      state.activeVersionForMods && !state.activeModpackId;

    if (!mp && !isViewingVersion) return;

    switchView("main");
    actions.beginLaunchOverlay?.("Launching...");
    const authData =
      state.authMode === "elyby"
        ? JSON.parse(localStorage.getItem("craftlaunch_elybydata") || "{}")
        : null;

    if (isViewingVersion) {
      // Launch the version with its settings
      const version = state.activeVersionForMods;
      const versionSettings = state.versionSettings[version] || {
        loader: "Vanilla",
        loaderVersion: "",
        javaArgs: "",
        windowWidth: 1024,
        windowHeight: 768,
      };

      if (window.electronAPI) {
        window.electronAPI.launchModpack({
          username: state.currentUser,
          modpackId: `version-${version}`,
          modpackName: version,
          mcVersion: version,
          loader: versionSettings.loader,
          loaderVersion: versionSettings.loaderVersion || "",
          javaPath: state.javaPath,
          maxMemory: `${state.maxMemoryGB}G`,
          authData,
        });
      }
    } else if (window.electronAPI) {
      window.electronAPI.launchModpack({
        username: state.currentUser,
        modpackId: mp.id,
        modpackName: mp.name,
        mcVersion: mp.mcVersion,
        loader: mp.loader,
        loaderVersion: mp.loaderVersion || "",
        javaPath: state.javaPath,
        maxMemory: `${state.maxMemoryGB}G`,
        authData,
      });
    }
  });

  // --- Back to Modpacks List ---
  document.getElementById("btn-back-modpacks").addEventListener("click", () => {
    state.activeModpackId = null;
    state.activeVersionForMods = null;
    mpRenderList();
    mpRenderDetail();
  });

  // --- Refresh Profiles ---
  document
    .getElementById("btn-refresh-profiles")
    .addEventListener("click", async () => {
      const btn = document.getElementById("btn-refresh-profiles");
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
      // Rotate icon
      btn.querySelector("svg").style.animation = "spin 0.8s linear infinite";
      await loadProfilesFromDisk();
      btn.style.opacity = "";
      btn.style.pointerEvents = "";
      btn.querySelector("svg").style.animation = "";
      actions.showWarningToast("Profiles refreshed from disk!");
    });

  actions.modpacks = {
    mpGet,
    mpSave,
    mpRenderList,
    mpRenderDetail,
    loadProfilesFromDisk,
  };
}
