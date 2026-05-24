import { state, actions } from "../../core/app-state.js";
import {
  getSkinTextureUrl,
  resolveSkinTextureBase64,
  loadAvatarForUser,
} from "../../core/skin-texture.js";

let skinViewerInstance = null;
let skinResizeObserver = null;
let profileReturnView = "main";

function formatPlaytimeHours() {
  const totalMs = parseInt(localStorage.getItem("idk_playtime") || "0", 10);
  return `${(totalMs / (1000 * 60 * 60)).toFixed(1)}h`;
}

function disposeSkinViewer() {
  if (skinResizeObserver) {
    skinResizeObserver.disconnect();
    skinResizeObserver = null;
  }
  if (skinViewerInstance) {
    try {
      skinViewerInstance.dispose();
    } catch {
      /* already disposed */
    }
    skinViewerInstance = null;
  }
}

function fitCanvasToStage(canvasEl, stageEl) {
  const maxW = stageEl.clientWidth - 20;
  const maxH = stageEl.clientHeight - 16;
  let width = Math.min(840, maxW);
  let height = Math.min(900, maxH);
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  return { width, height };
}

function applyViewerCamera(viewer) {
  viewer.autoRotate = false;
  viewer.autoRotateSpeed = 1.0;

  if (viewer.controls) {
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;
  }

  if (viewer.camera) {
    viewer.camera.fov = 22;
    viewer.camera.position.set(0, 14, 19);
    viewer.camera.lookAt(0, 13, 0);
    viewer.camera.updateProjectionMatrix();
  }

  if (viewer.playerObject) {
    viewer.playerObject.rotation.y = -0.38;
    viewer.playerObject.position.y = 0;
  }

  if (typeof viewer.zoom === "number") {
    viewer.zoom = 1.0;
  }
}

async function initProfileSkinViewer() {
  const stage = document.getElementById("profile-skin-stage");
  const canvasEl = document.getElementById("profile-skin-canvas");
  const loaderEl = document.getElementById("profile-skin-loading");
  if (!stage || !canvasEl) return;

  disposeSkinViewer();

  if (loaderEl) {
    loaderEl.style.display = "flex";
    loaderEl.textContent = "Loading skin…";
  }
  canvasEl.classList.remove("is-ready");

  const username = state.currentUser || "Steve";
  const skinUrl = await getSkinTextureUrl(username, state.authMode);
  const texture = await resolveSkinTextureBase64(skinUrl);

  const { width, height } = fitCanvasToStage(canvasEl, stage);

  try {
    const { SkinViewer, IdleAnimation } = await import("skinview3d");

    skinViewerInstance = new SkinViewer({
      canvas: canvasEl,
      width,
      height,
      skin: texture,
    });

    canvasEl.width = width;
    canvasEl.height = height;
    canvasEl.style.width = `${width}px`;
    canvasEl.style.height = `${height}px`;

    // Improved lighting for better character visibility
    if (skinViewerInstance.scene) {
      const THREE = await import("three");

      // Clear existing lights
      const existingLights = skinViewerInstance.scene.children.filter(
        (child) => child.isLight,
      );
      existingLights.forEach((light) => skinViewerInstance.scene.remove(light));

      // Ambient light for base illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      skinViewerInstance.scene.add(ambientLight);

      // Main light from front
      const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
      mainLight.position.set(3, 8, 6);
      skinViewerInstance.scene.add(mainLight);

      // Fill light from side
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLight.position.set(-4, 4, 4);
      skinViewerInstance.scene.add(fillLight);
    }

    applyViewerCamera(skinViewerInstance);

    const ambientAnimation = new IdleAnimation();
    ambientAnimation.speed = 0.55;
    skinViewerInstance.animation = ambientAnimation;

    if (loaderEl) loaderEl.style.display = "none";
    canvasEl.classList.add("is-ready");

    skinResizeObserver = new ResizeObserver(() => {
      if (!skinViewerInstance || !canvasEl.isConnected) return;
      const next = fitCanvasToStage(canvasEl, stage);
      skinViewerInstance.setSize(next.width, next.height);
      applyViewerCamera(skinViewerInstance);
    });
    skinResizeObserver.observe(stage);
  } catch (err) {
    console.error("[Profile] Skin viewer error:", err);
    if (loaderEl) {
      loaderEl.style.display = "flex";
      loaderEl.textContent = "Could not load 3D preview";
    }
  }
}

function refreshProfilePage() {
  const name = state.currentUser || "Player";
  const nameEl = document.getElementById("profile-page-username");
  const accountStat = document.getElementById("profile-stat-account-type");
  const playtimeEl = document.getElementById("profile-stat-playtime");
  const modpacksEl = document.getElementById("profile-stat-modpacks");
  const changeSkinBtn = document.getElementById("profile-btn-change-skin");
  const sidebarName = document.getElementById("profile-sidebar-name");
  const sidebarAcct = document.getElementById("profile-sidebar-acct");

  if (nameEl) nameEl.textContent = name.toUpperCase();
  if (accountStat)
    accountStat.textContent = state.authMode === "elyby" ? "Ely.by" : "Offline";
  if (playtimeEl) playtimeEl.textContent = formatPlaytimeHours();
  if (modpacksEl) modpacksEl.textContent = String(state.modpacks?.length || 0);
  if (changeSkinBtn) {
    changeSkinBtn.style.display = state.authMode === "elyby" ? "flex" : "none";
  }
  if (sidebarName) sidebarName.textContent = name.toUpperCase();
  if (sidebarAcct)
    sidebarAcct.textContent =
      state.authMode === "elyby" ? "Ely.by account" : "Offline account";

  const sidebarAvatarCanvas = document.getElementById("profile-sidebar-avatar");
  if (sidebarAvatarCanvas) {
    loadAvatarForUser(sidebarAvatarCanvas, name, state.authMode);
  }

  initProfileSkinViewer();
}

export function initProfileFeature({ switchView, getReturnView }) {
  const openProfile = (returnTo) => {
    profileReturnView = returnTo || getReturnView?.() || "main";
    switchView("profile");
    refreshProfilePage();
  };

  const closeProfile = (nextView) => {
    disposeSkinViewer();
    const fallbackTarget =
      profileReturnView === "profile" ? "main" : profileReturnView;
    switchView(nextView || fallbackTarget);
  };

  actions.openProfile = openProfile;
  actions.closeProfile = closeProfile;

  document
    .getElementById("profile-btn-change-skin")
    ?.addEventListener("click", () => {
      const url = "https://ely.by/profile";
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
    });

  document
    .getElementById("profile-btn-friends")
    ?.addEventListener("click", () => {
      document.getElementById("btn-friends-toggle")?.click();
    });

  document
    .getElementById("profile-btn-settings")
    ?.addEventListener("click", () => {
      closeProfile("settings");
    });

  document
    .getElementById("profile-stage-open-main")
    ?.addEventListener("click", () => {
      closeProfile("main");
    });

  document
    .getElementById("profile-stage-open-settings")
    ?.addEventListener("click", () => {
      closeProfile("settings");
    });

  if (window.electronAPI?.onLaunchClosed) {
    window.electronAPI.onLaunchClosed(() => {
      if (
        !document.getElementById("view-profile")?.classList.contains("active")
      )
        return;
      const playtimeEl = document.getElementById("profile-stat-playtime");
      if (playtimeEl) playtimeEl.textContent = formatPlaytimeHours();
    });
  }

  document
    .getElementById("profile-btn-logout")
    ?.addEventListener("click", async () => {
      const { showConfirmDialog } =
        await import("../../components/confirm-dialog.js");
      const ok = await showConfirmDialog({
        title: "Log out",
        message: "Sign out of the launcher on this device?",
        confirmText: "Log out",
        cancelText: "Stay signed in",
        variant: "neutral",
      });
      if (!ok) return;
      disposeSkinViewer();
      state.currentUser = "";
      localStorage.removeItem("craftlaunch_username");
      // Sync IDK Connect UI
      actions.updateFriendsAuthUI?.();
      switchView("login");
    });
}
