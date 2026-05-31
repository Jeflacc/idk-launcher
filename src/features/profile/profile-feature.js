import { state, actions } from "../../core/app-state.js";
import {
  getSkinTextureUrl,
  resolveSkinTextureBase64,
  loadAvatarForUser,
} from "../../core/skin-texture.js";

let skinViewerInstance = null;
let skinResizeObserver = null;
let homeSkinViewerInstance = null;
let homeSkinResizeObserver = null;
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

function disposeHomeSkinViewer() {
  if (homeSkinResizeObserver) {
    homeSkinResizeObserver.disconnect();
    homeSkinResizeObserver = null;
  }
  if (homeSkinViewerInstance) {
    try {
      homeSkinViewerInstance.dispose();
    } catch {
      /* already disposed */
    }
    homeSkinViewerInstance = null;
  }
}

function fitCanvasToStage(canvasEl, stageEl) {
  const maxW = 600;
  const maxH = 800;
  const width = Math.max(300, Math.min(maxW, stageEl.clientWidth));
  const height = Math.max(400, Math.min(maxH, stageEl.clientHeight));
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  canvasEl.style.margin = "0 auto";
  canvasEl.style.display = "block";
  return { width, height };
}

function applyViewerCamera(viewer) {
  viewer.autoRotate = false;
  viewer.autoRotateSpeed = 0.8;

  if (viewer.controls) {
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;
  }

  if (viewer.camera) {
    viewer.camera.fov = 16;
    viewer.camera.zoom = 0.92;
    viewer.camera.position.set(2, 8, 30);
    viewer.camera.lookAt(0, 0, 0);
    viewer.camera.updateProjectionMatrix();
  }

  if (viewer.playerObject) {
    viewer.playerObject.rotation.y = 0.3;
  }

  if (typeof viewer.zoom === "number") {
    viewer.zoom = 1.0;
  }
}

// === Player Pose System ===
// Uses skinview3d animations for character poses
const POSE_ANIMATIONS = {};
const POSE_SPEEDS = {
  idle: 0.55,
  walking: 0.7,
  running: 1.0,
  flying: 0.6,
  wave: 0.8,
  crouch: 0.5,
  swim: 0.5,
};

function getSavedPose() {
  return localStorage.getItem("idk_player_pose") || "idle";
}

function savePose(poseName) {
  localStorage.setItem("idk_player_pose", poseName);
}

async function ensureAnimationsLoaded() {
  if (Object.keys(POSE_ANIMATIONS).length > 0) return;
  const {
    IdleAnimation,
    WalkingAnimation,
    RunningAnimation,
    FlyingAnimation,
    WaveAnimation,
    CrouchAnimation,
    SwimAnimation,
    FunctionAnimation,
  } = await import("skinview3d");

  POSE_ANIMATIONS.idle = () => {
    const anim = new FunctionAnimation((player, progress, delta) => {
      const headLook = Math.sin(progress * Math.PI * 0.5) * 0.06;
      const sway = Math.sin(progress * Math.PI * 0.4) * 0.02;
      player.skin.head.rotation.y = headLook;
      player.skin.head.rotation.x = Math.sin(progress * Math.PI * 0.3 + 1) * 0.04;
      player.skin.leftArm.rotation.x = -0.04 + sway;
      player.skin.leftArm.rotation.z = -0.02;
      player.skin.rightArm.rotation.x = 0.04 - sway;
      player.skin.rightArm.rotation.z = 0.02;
      player.skin.leftLeg.rotation.x = -sway * 0.3;
      player.skin.rightLeg.rotation.x = sway * 0.3;
    });
    anim.speed = 0.4;
    return anim;
  };
  POSE_ANIMATIONS.walking = () => new WalkingAnimation();
  POSE_ANIMATIONS.running = () => new RunningAnimation();
  POSE_ANIMATIONS.flying = () => new FlyingAnimation();
  POSE_ANIMATIONS.wave = () => new WaveAnimation("right");
  POSE_ANIMATIONS.crouch = () => new CrouchAnimation();
  POSE_ANIMATIONS.swim = () => new SwimAnimation();
}

function applyPose(viewer, poseName) {
  if (!viewer) return;
  if (!POSE_ANIMATIONS[poseName]) {
    viewer.animation = null;
    return;
  }
  const poseAnim = POSE_ANIMATIONS[poseName]();
  if (poseAnim) {
    poseAnim.speed = POSE_SPEEDS[poseName] || 0.5;
    viewer.animation = poseAnim;
  }
}

function setupPoseSelector(viewer) {
  const selector = document.getElementById("pose-selector");
  if (!selector) return;

  const savedPose = getSavedPose();

  selector.querySelectorAll(".pose-btn").forEach((btn) => {
    const pose = btn.dataset.pose;
    if (pose === savedPose) {
      selector.querySelectorAll(".pose-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      selector.querySelectorAll(".pose-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyPose(viewer, pose);
      savePose(pose);
    });
  });
}

function fitHomeCanvasToStage(canvasEl, stageEl) {
  const maxW = 400;
  const maxH = 600;
  const width = Math.max(200, Math.min(maxW, stageEl.clientWidth));
  const height = Math.max(300, Math.min(maxH, stageEl.clientHeight));
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  canvasEl.style.margin = "0 auto";
  canvasEl.style.display = "block";
  return { width, height };
}

function applyHomeViewerCamera(viewer) {
  viewer.autoRotate = false;
  viewer.autoRotateSpeed = 0.6;

  if (viewer.controls) {
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;
  }

  if (viewer.camera) {
    viewer.camera.fov = 24;
    viewer.camera.position.set(0, 13.5, 20);
    viewer.camera.lookAt(0, 12.5, 0);
    viewer.camera.updateProjectionMatrix();
  }

  if (viewer.playerObject) {
    viewer.playerObject.rotation.y = -0.28;
  }

  if (typeof viewer.zoom === "number") {
    viewer.zoom = 1.0;
  }
}

async function initHomeSkinViewer() {
  const isAdvanced = document.body.dataset.uiMode === "advanced";
  const isMainActive = document
    .getElementById("view-main")
    ?.classList.contains("active");
  const stage = document.getElementById("advanced-home-skin-stage");
  const canvasEl = document.getElementById("advanced-home-skin-canvas");
  const loaderEl = document.getElementById("advanced-home-skin-loading");
  const nameEl = document.getElementById("advanced-home-username");

  if (!stage || !canvasEl || !isAdvanced || !isMainActive) {
    disposeHomeSkinViewer();
    return;
  }

  if (nameEl)
    nameEl.textContent = (state.currentUser || "Player").toUpperCase();

  disposeHomeSkinViewer();

  if (loaderEl) {
    loaderEl.style.display = "flex";
    loaderEl.textContent = "Loading skin…";
  }
  canvasEl.classList.remove("is-ready");

  const username = state.currentUser || "Steve";
  const skinUrl = await getSkinTextureUrl(username, state.authMode);
  const texture = await resolveSkinTextureBase64(skinUrl);
  const { width, height } = fitHomeCanvasToStage(canvasEl, stage);

  try {
    const { SkinViewer } = await import("skinview3d");
    const THREE = await import("three");

    homeSkinViewerInstance = new SkinViewer({
      canvas: canvasEl,
      width,
      height,
      skin: texture,
    });

    canvasEl.width = width;
    canvasEl.height = height;
    canvasEl.style.width = `${width}px`;
    canvasEl.style.height = `${height}px`;

    if (homeSkinViewerInstance.scene) {
      const existingLights = homeSkinViewerInstance.scene.children.filter(
        (child) => child.isLight,
      );
      existingLights.forEach((light) =>
        homeSkinViewerInstance.scene.remove(light),
      );

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
      homeSkinViewerInstance.scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.05);
      mainLight.position.set(4, 8, 7);
      homeSkinViewerInstance.scene.add(mainLight);

      const rimLight = new THREE.DirectionalLight(0x9f7aea, 0.45);
      rimLight.position.set(-5, 5, -3);
      homeSkinViewerInstance.scene.add(rimLight);
    }

    applyHomeViewerCamera(homeSkinViewerInstance);

    await ensureAnimationsLoaded();
    const savedPose = getSavedPose();
    applyPose(homeSkinViewerInstance, savedPose);

    if (loaderEl) loaderEl.style.display = "none";
    canvasEl.classList.add("is-ready");

    homeSkinResizeObserver = new ResizeObserver(() => {
      if (!homeSkinViewerInstance || !canvasEl.isConnected) return;
      const next = fitHomeCanvasToStage(canvasEl, stage);
      homeSkinViewerInstance.setSize(next.width, next.height);
      applyHomeViewerCamera(homeSkinViewerInstance);
    });
    homeSkinResizeObserver.observe(stage);
  } catch (err) {
    console.error("[Profile] Advanced home skin viewer error:", err);
    if (loaderEl) {
      loaderEl.style.display = "flex";
      loaderEl.textContent = "Could not load 3D preview";
    }
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
    const { SkinViewer } = await import("skinview3d");

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

    await ensureAnimationsLoaded();
    const savedPose = getSavedPose();
    applyPose(skinViewerInstance, savedPose);
    setupPoseSelector(skinViewerInstance);

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
  const achievementsEl = document.getElementById("profile-stat-achievements");
  const changeSkinBtn = document.getElementById("profile-btn-change-skin");
  const sidebarName = document.getElementById("profile-sidebar-name");
  const sidebarAcct = document.getElementById("profile-sidebar-acct");

  if (nameEl) nameEl.textContent = name.toUpperCase();
  if (accountStat)
    accountStat.textContent = state.authMode === "elyby" ? "Ely.by" : "Offline";
  if (playtimeEl) playtimeEl.textContent = formatPlaytimeHours();
  if (modpacksEl) modpacksEl.textContent = String(state.modpacks?.length || 0);
  if (achievementsEl) {
    achievementsEl.textContent = "Loading...";
    if (window.electronAPI && window.electronAPI.scanAllAchievements) {
      window.electronAPI.scanAllAchievements().then(result => {
        if (result && result.success) {
          achievementsEl.textContent = String(result.count);
        } else {
          achievementsEl.textContent = "0";
        }
      }).catch(() => {
        achievementsEl.textContent = "0";
      });
    } else {
      achievementsEl.textContent = "0";
    }
  }
  // Change skin button removed - no longer needed
  if (sidebarName) sidebarName.textContent = name.toUpperCase();
  if (sidebarAcct)
    sidebarAcct.textContent =
      state.authMode === "elyby" ? "Ely.by account" : "Offline account";

  const sidebarAvatarCanvas = document.getElementById("profile-sidebar-avatar");
  if (sidebarAvatarCanvas) {
    loadAvatarForUser(sidebarAvatarCanvas, name, state.authMode);
  }

  loadProfileFriendsList();
  initProfileSkinViewer();
}

async function loadProfileFriendsList() {
  const friendsListEl = document.getElementById("profile-friends-list");
  if (!friendsListEl) return;

  try {
    // Get friends from the IDK Connect sidebar (same source as the main friends list)
    const friendsContainer = document.getElementById("friends-list");
    
    if (!friendsContainer) {
      friendsListEl.innerHTML = '<div class="profile-friends-empty">No friends</div>';
      return;
    }

    // Get all friend cards from the IDK Connect sidebar
    const friendCards = friendsContainer.querySelectorAll(".friend-card");
    
    if (friendCards.length === 0) {
      friendsListEl.innerHTML = '<div class="profile-friends-empty">No friends</div>';
      return;
    }

    // Extract friend data from the existing friend cards
    const friends = [];
    friendCards.forEach(card => {
      const nameEl = card.querySelector(".friend-info strong");
      const statusEl = card.querySelector(".friend-status-text");
      const removeBtn = card.querySelector(".friend-remove-btn");
      const unreadBadge = card.querySelector(".friend-unread-badge");
      
      // Extract friend ID from data-id on remove button or from canvas id
      let friendId = removeBtn ? removeBtn.getAttribute("data-id") : null;
      if (!friendId) {
        const canvas = card.querySelector(".friend-avatar canvas");
        if (canvas) {
          const canvasId = canvas.id;
          if (canvasId && canvasId.startsWith("friend-avatar-")) {
            friendId = canvasId.replace("friend-avatar-", "");
          }
        }
      }

      if (nameEl) {
        friends.push({
          id: friendId,
          username: nameEl.textContent.trim(),
          status: statusEl ? statusEl.textContent.trim() : "Offline",
          element: card,
          unreadCount: unreadBadge ? parseInt(unreadBadge.innerText) || 0 : 0
        });
      }
    });

    if (friends.length === 0) {
      friendsListEl.innerHTML = '<div class="profile-friends-empty">No friends</div>';
      return;
    }

    // Render friends in profile sidebar (limit to 8)
    friendsListEl.innerHTML = friends.slice(0, 8).map(friend => `
      <div class="profile-friend-item" title="${friend.username}" data-friend-id="${friend.id || ""}">
        <div class="profile-friend-avatar">
          <canvas width="24" height="24" data-friend-username="${friend.username}"></canvas>
        </div>
        <div class="profile-friend-info">
          <span class="profile-friend-name">${friend.username}</span>
          <span class="profile-friend-status ${friend.status.toLowerCase().includes("playing") || friend.status.toLowerCase().includes("hosting") ? "online" : "offline"}">${friend.status}</span>
        </div>
        ${friend.unreadCount > 0 ? `<span class="profile-friend-unread">${friend.unreadCount}</span>` : ""}
      </div>
    `).join("");

    // Load friend avatars and attach click handlers
    friends.slice(0, 8).forEach(friend => {
      const canvas = friendsListEl.querySelector(`canvas[data-friend-username="${friend.username}"]`);
      if (canvas) {
        loadAvatarForUser(canvas, friend.username, "elyby");
      }

      // Attach click handler to open chat with this friend
      const item = friendsListEl.querySelector(`.profile-friend-item[data-friend-id="${friend.id}"]`);
      if (item) {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          // Open the friends sidebar
          actions.openFriendsSidebar?.();
          // Build the friend object for enterChat
          const friendData = {
            id: friend.id,
            username: friend.username,
            status: friend.status === "Offline" ? "offline" : "online",
          };
          // Copy status-related fields from the original friend card's data
          const card = friend.element;
          if (card) {
            const joinBtn = card.querySelector(".friend-join-btn");
            const statusEl = card.querySelector(".friend-status-text");
            if (joinBtn) friendData.cloudflaredUrl = true;
            if (statusEl && statusEl.classList.contains("playing")) {
              friendData.playingVersion = "Minecraft";
            } else if (statusEl && statusEl.classList.contains("hosting")) {
              friendData.playingVersion = "Minecraft";
            }
          }
          setTimeout(() => actions.openChatWithFriend?.(friendData), 200);
        });
      }
    });
  } catch (err) {
    console.error("[Profile] Failed to load friends:", err);
    friendsListEl.innerHTML = '<div class="profile-friends-empty">No friends</div>';
  }
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
  actions.refreshHomeSkin = initHomeSkinViewer;

  document.addEventListener("idk:view-changed", (event) => {
    if (event.detail?.viewName === "main") {
      initHomeSkinViewer();
    } else {
      disposeHomeSkinViewer();
    }
  });

  if (document.getElementById("view-main")?.classList.contains("active")) {
    initHomeSkinViewer();
  }

  function openSkinManager() {
    const url = "https://ely.by/profile";
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  }

  async function exportCurrentSkin() {
    try {
      const username = state.currentUser || "Steve";
      const skinUrl = await getSkinTextureUrl(username, state.authMode);
      const texture = await resolveSkinTextureBase64(skinUrl);
      const link = document.createElement("a");
      link.href = texture;
      link.download = `${username || "skin"}-skin.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("[Profile] Failed to export skin:", err);
      actions.showWarningToast?.("Failed to export skin");
    }
  }

  document
    .getElementById("profile-btn-change-skin")
    ?.addEventListener("click", openSkinManager);

  document
    .getElementById("profile-stage-change-skin")
    ?.addEventListener("click", openSkinManager);

  document
    .getElementById("profile-stage-export-skin")
    ?.addEventListener("click", exportCurrentSkin);

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

      const achievementsEl = document.getElementById("profile-stat-achievements");
      if (achievementsEl && window.electronAPI.scanAllAchievements) {
        window.electronAPI.scanAllAchievements().then(result => {
          if (result && result.success) {
            achievementsEl.textContent = String(result.count);
          }
        }).catch(console.error);
      }
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
