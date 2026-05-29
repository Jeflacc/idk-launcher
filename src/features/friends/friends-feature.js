import { state, actions } from "../../core/app-state.js";
import { loadAvatarForUser } from "../../core/skin-texture.js";

export function initFriendsFeature() {
  // === IDK CONNECT - PREMIUM FRIENDS & CLOUDFLARED LAN SHARING CLIENT ENGINE ===
  // ============================================================================
  (function initFriendsSystem() {
    let IDK_BACKEND_URL = "https://api.somniac.me";
    let idkToken = localStorage.getItem("idk_connect_token") || "";
    let idkUser = JSON.parse(
      localStorage.getItem("idk_connect_user") || "null",
    );
    let idkAuthTab = "login";
    let activeTunnelUrl = null;
    let activeSharePort = null;
    let presenceInterval = null;
    let refreshInterval = null;
    let cloudflaredInstallInProgress = false;

    // DOM Elements
    const btnToggleSidebar = document.getElementById("btn-friends-toggle");
    const sidebar = document.getElementById("friends-sidebar");
    const btnCloseSidebar = document.getElementById(
      "btn-friends-sidebar-close",
    );
    const badgePending = document.getElementById("friends-pending-badge");

    const authPanel = document.getElementById("friends-auth-panel");
    const mainPanel = document.getElementById("friends-main-panel");

    const tabLogin = document.getElementById("tab-friends-login");
    const tabRegister = document.getElementById("tab-friends-register");
    const authError = document.getElementById("friends-auth-error");
    const inputUsername = document.getElementById("friends-auth-username");
    const inputPassword = document.getElementById("friends-auth-password");
    const btnAuthSubmit = document.getElementById("btn-friends-auth-submit");

    const myUsernameLabel = document.getElementById("friends-my-username");
    const myAvatarCanvas = document.getElementById("friends-my-avatar");
    const btnDisconnect = document.getElementById("btn-friends-disconnect");

    const shareCard = document.getElementById("friends-share-card");
    const shareInstructions = document.getElementById(
      "friends-share-instructions",
    );
    const shareInputRow = document.getElementById("friends-share-input-row");
    const inputSharePort = document.getElementById("friends-share-port");
    const btnShare = document.getElementById("btn-friends-share");
    const btnFriendsShareCancel = document.getElementById(
      "btn-friends-share-cancel",
    );
    const tunnelLink = document.getElementById("friends-share-tunnel-link");

    let isCancellingHost = false;

    const progressPanel = document.getElementById("frpc-progress-panel");
    const statusText = document.getElementById("frpc-status-text");
    const percentText = document.getElementById("frpc-percent-text");
    const progressFill = document.getElementById("frpc-progress-fill");

    const requestsSection = document.getElementById("friends-requests-section");
    const requestsList = document.getElementById("friends-requests-list");
    const inputAddFriend = document.getElementById("friends-add-username");
    const btnAddFriend = document.getElementById("btn-friends-add");
    const friendsList = document.getElementById("friends-list");

    // Chat Variables
    let activeChatFriendId = null;
    let activeChatFriendUsername = null;
    let chatPollInterval = null;

    // Chat DOM Elements
    const chatPanel = document.getElementById("friends-chat-panel");
    const btnFriendsChatBack = document.getElementById("btn-friends-chat-back");
    const chatAvatarCanvas = document.getElementById("friends-chat-avatar");
    const chatNameLabel = document.getElementById("friends-chat-name");
    const chatStatusLabel = document.getElementById("friends-chat-status");
    const chatMessagesContainer = document.getElementById("friends-chat-messages");
    const chatInput = document.getElementById("friends-chat-input");
    const btnFriendsChatSend = document.getElementById("btn-friends-chat-send");

    // --- SIDEBAR TOGGLE ---
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener("click", (e) => {
        e.stopPropagation();
        sidebar.classList.toggle("active");
        btnToggleSidebar.classList.toggle(
          "active",
          sidebar.classList.contains("active"),
        );
        if (sidebar.classList.contains("active")) {
          refreshFriendsData();
        } else {
          exitChat();
        }
      });
    }

    if (btnCloseSidebar) {
      btnCloseSidebar.addEventListener("click", () => {
        sidebar.classList.remove("active");
        btnToggleSidebar.classList.remove("active");
        exitChat();
      });
    }

    // Close sidebar on outer click
    document.addEventListener("click", (e) => {
      if (
        sidebar &&
        sidebar.classList.contains("active") &&
        !sidebar.contains(e.target) &&
        e.target !== btnToggleSidebar &&
        !btnToggleSidebar.contains(e.target)
      ) {
        sidebar.classList.remove("active");
        btnToggleSidebar.classList.remove("active");
        exitChat();
      }
    });

    // --- AVATAR RENDERING HELPERS ---
    function drawSteveFace(canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#3c3c3d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function renderSkinFaceOnFriendsCanvas(canvas, username, authMode) {
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        const scale = img.naturalWidth / 64;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        // Head face layer
        ctx.drawImage(
          img,
          8 * scale,
          8 * scale,
          8 * scale,
          8 * scale,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        // Outer accessory layer (hats/masks)
        ctx.drawImage(
          img,
          40 * scale,
          8 * scale,
          8 * scale,
          8 * scale,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      };

      let fallbackStage = 0;
      img.onerror = () => {
        fallbackStage++;
        if (fallbackStage === 1) {
          // Try official Mojang/Minotar skins next
          img.src = `https://minotar.net/skin/${username}`;
        } else {
          // Draw standard letter avatar
          const accentDark = getComputedStyle(document.documentElement)
            .getPropertyValue("--theme-accent-dark")
            .trim();
          ctx.fillStyle = accentDark || "#16a34a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "white";
          ctx.font = "bold 12px Inter";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            username.substring(0, 2).toUpperCase(),
            canvas.width / 2,
            canvas.height / 2,
          );
        }
      };

      if (authMode === "offline") {
        img.src = `https://minotar.net/skin/${username}`;
      } else {
        // Ely.by or unknown (e.g. friend) - check Ely.by first, fallback to minotar
        img.src = `https://skinsystem.ely.by/skins/${username}.png`;
      }
    }

    // --- HTTP BACKEND REQUEST WRAPPER ---
    async function idkRequest(endpoint, method = "GET", body = null) {
      const headers = { "Content-Type": "application/json" };
      if (idkToken) headers["Authorization"] = `Bearer ${idkToken}`;

      const res = await fetch(`${IDK_BACKEND_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server request failed");
      return json;
    }

    // --- UI CONTROLLERS ---
    function updateFriendsAuthUI() {
      if (idkToken && idkUser) {
        authPanel.style.display = "none";
        mainPanel.style.display = "block";
        myUsernameLabel.innerText = idkUser.username;

        // Draw client avatar
        loadAvatarForUser(myAvatarCanvas, state.currentUser || idkUser.username, state.authMode);

        // Initialize intervals
        startHeartbeats();
        refreshFriendsData();
      } else {
        authPanel.style.display = "block";
        mainPanel.style.display = "none";
        stopHeartbeats();
        exitChat();
      }
    }

    // --- AUTH PORTAL ACTIONS ---
    tabLogin.addEventListener("click", () => {
      idkAuthTab = "login";
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      btnAuthSubmit.innerText = "Connect Account";
      authError.style.display = "none";
    });

    tabRegister.addEventListener("click", () => {
      idkAuthTab = "register";
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      btnAuthSubmit.innerText = "Create Account";
      authError.style.display = "none";
    });

    btnAuthSubmit.addEventListener("click", handleAuth);
    [inputUsername, inputPassword].forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleAuth();
      });
    });

    async function handleAuth() {
      const username = inputUsername.value.trim();
      const password = inputPassword.value;

      if (!username || !password) {
        showAuthError("Please fill out all fields.");
        return;
      }

      btnAuthSubmit.disabled = true;
      btnAuthSubmit.innerText =
        idkAuthTab === "login" ? "Connecting..." : "Registering...";
      authError.style.display = "none";

      try {
        const endpoint =
          idkAuthTab === "login" ? "/api/auth/login" : "/api/auth/register";
        const data = await idkRequest(endpoint, "POST", { username, password });

        idkToken = data.token;
        idkUser = data.user;
        localStorage.setItem("idk_connect_token", idkToken);
        localStorage.setItem("idk_connect_user", JSON.stringify(idkUser));

        inputUsername.value = "";
        inputPassword.value = "";

        updateFriendsAuthUI();
        actions.showWarningToast(
          `Connected to IDK Network as ${idkUser.username}!`,
        );
      } catch (err) {
        showAuthError(err.message);
      } finally {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.innerText =
          idkAuthTab === "login" ? "Connect Account" : "Create Account";
      }
    }

    function showAuthError(msg) {
      authError.innerText = msg;
      authError.style.display = "block";
    }

    btnDisconnect.addEventListener("click", () => {
      if (activeTunnelUrl) {
        btnShare.click(); // Stop sharing first
      }
      if (window.electronAPI) {
        // window.electronAPI.stopCloudflaredAccess(); // No longer needed
      }

      idkToken = "";
      idkUser = null;
      localStorage.removeItem("idk_connect_token");
      localStorage.removeItem("idk_connect_user");

      updateFriendsAuthUI();
      actions.showWarningToast("Disconnected from IDK Network.");
    });

    // --- CLOUDFLARED MULTIPLAYER SHARING ---
    btnShare.addEventListener("click", async () => {
      if (activeTunnelUrl) {
        // STOP SHARING TUNNEL
        btnShare.disabled = true;
        btnShare.innerText = "Stopping...";
        try {
          if (window.electronAPI) {
            await window.electronAPI.stopFrpcTunnel();
          }
          activeTunnelUrl = null;
          activeSharePort = null;

          // Restore sharing Card elements
          shareCard.classList.remove("active");
          shareInstructions.innerText =
            'Open your Minecraft singleplayer world, click "Open to LAN", then enter the port below to invite your friends!';
          shareInputRow.style.display = "flex";
          tunnelLink.style.display = "none";

          btnShare.innerText = "Share";
          btnShare.classList.remove("stop-sharing");

          // Update presence immediately
          await sendPresenceHeartbeat();
          actions.showWarningToast(
            "Multi-player tunnel closed. World is private again.",
          );
        } catch (err) {
          actions.showWarningToast("Failed to stop tunnel cleanly.");
        } finally {
          btnShare.disabled = false;
        }
        return;
      }

      // START SHARING TUNNEL
      const portVal = parseInt(inputSharePort.value);
      if (isNaN(portVal) || portVal < 1024 || portVal > 65535) {
        actions.showWarningToast("Please enter a valid LAN port (1024-65535)");
        return;
      }

      isCancellingHost = false;
      btnShare.disabled = true;
      btnShare.innerText = "Starting...";
      btnFriendsShareCancel.style.display = "inline-flex";
      btnFriendsShareCancel.innerText = "Cancel";
      btnFriendsShareCancel.disabled = false;

      if (!window.electronAPI) {
        // Fallback/Mock for Web Browsers
        setTimeout(() => {
          if (isCancellingHost) return;
          activeTunnelUrl = `tcp://mock-tunnel-${Math.random().toString(36).substring(3, 8)}.trycloudflare.com:54321`;
          activeSharePort = portVal;
          shareCard.classList.add("active");
          shareInstructions.innerText =
            "Sharing Active! Click below to copy your IP Address. Friends can join you now:";
          shareInputRow.style.display = "none";

          tunnelLink.innerText = activeTunnelUrl;
          tunnelLink.style.display = "block";
          btnShare.innerText = "Stop";
          btnShare.classList.add("stop-sharing");
          btnShare.disabled = false;

          navigator.clipboard.writeText(activeTunnelUrl);
          sendPresenceHeartbeat();
          actions.showWarningToast(
            "Mock Tunnel active! Copied IP address to clipboard.",
          );
        }, 1500);
        return;
      }

      try {
        // 1. Ensure FRPC binary exists (downloads if not)
        progressPanel.style.display = "block";
        statusText.innerText = "Preparing frpc.exe...";
        percentText.innerText = "0%";
        progressFill.style.width = "0%";

        const cfStatus = await window.electronAPI.ensureFrpc();
        if (!cfStatus.success) {
          throw new Error(cfStatus.error || "Failed to download frpc");
        }

        progressPanel.style.display = "none";

        // 2. Start FRPC TCP tunnel forwarding LAN port
        statusText.innerText = "Connecting tunnel...";
        const tunnelStatus = await window.electronAPI.startFrpcTunnel(portVal);
        if (!tunnelStatus.success) {
          throw new Error(
            tunnelStatus.error || "Failed to establish TCP tunnel",
          );
        }

        activeTunnelUrl = tunnelStatus.url;
        activeSharePort = portVal;

        // Render shared status
        shareCard.classList.add("active");
        shareInstructions.innerText =
          "Sharing Active! Click below to copy your IP Address. Friends can join you now:";
        shareInputRow.style.display = "none";

        tunnelLink.innerText = activeTunnelUrl;
        tunnelLink.style.display = "block";

        btnShare.innerText = "Stop";
        btnShare.classList.add("stop-sharing");

        navigator.clipboard.writeText(activeTunnelUrl);

        // Update presence immediately
        await sendPresenceHeartbeat();
        actions.showWarningToast(
          "LAN world successfully shared! IP address copied to clipboard.",
        );
      } catch (err) {
        if (!isCancellingHost) {
          actions.showWarningToast(`Tunnel Error: ${err.message}`);
        }
        progressPanel.style.display = "none";
        btnShare.innerText = "Share";
      } finally {
        btnShare.disabled = false;
        btnFriendsShareCancel.style.display = "none";
      }
    });

    // Cancel host button event listener
    btnFriendsShareCancel.addEventListener("click", async () => {
      btnFriendsShareCancel.disabled = true;
      btnFriendsShareCancel.innerText = "Cancelling...";
      isCancellingHost = true;
      try {
        if (window.electronAPI) {
          await window.electronAPI.stopFrpcTunnel();
        }
      } catch (err) {
        console.error("[Friends] Failed to cancel host:", err);
      } finally {
        btnFriendsShareCancel.disabled = false;
        btnFriendsShareCancel.innerText = "Cancel";
        btnFriendsShareCancel.style.display = "none";
        btnShare.disabled = false;
        btnShare.innerText = "Share";
        progressPanel.style.display = "none";
      }
    });

    // Listen to frpc download progress
    if (window.electronAPI) {
      window.electronAPI.onFrpcInstallProgress((data) => {
        progressPanel.style.display = "block";
        statusText.innerText = data.status || "Downloading...";
        percentText.innerText = `${data.percent}%`;
        progressFill.style.width = `${data.percent}%`;
      });

      window.electronAPI.onFrpcTunnelClosed(() => {
        if (activeTunnelUrl) {
          // Tunnel closed from outside
          activeTunnelUrl = null;
          activeSharePort = null;

          shareCard.classList.remove("active");
          shareInstructions.innerText =
            'Open your Minecraft singleplayer world, click "Open to LAN", then enter the port below to invite your friends!';
          shareInputRow.style.display = "flex";
          tunnelLink.style.display = "none";

          btnShare.innerText = "Share";
          btnShare.classList.remove("stop-sharing");
          sendPresenceHeartbeat();
          actions.showWarningToast("Tunnel connection closed unexpected.");
        }
      });
    }

    // Copy IP on link click
    tunnelLink.addEventListener("click", () => {
      if (activeTunnelUrl) {
        navigator.clipboard.writeText(activeTunnelUrl);
        actions.showWarningToast("IP Address copied to clipboard!");
      }
    });

    // --- ADD FRIEND ACTION ---
    btnAddFriend.addEventListener("click", handleAddFriend);
    inputAddFriend.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleAddFriend();
    });

    async function handleAddFriend() {
      const friendName = inputAddFriend.value.trim();
      if (!friendName) return;

      btnAddFriend.disabled = true;
      try {
        const res = await idkRequest("/api/friends/request", "POST", {
          username: friendName,
        });
        inputAddFriend.value = "";
        actions.showWarningToast(res.message);
        refreshFriendsData();
      } catch (err) {
        actions.showWarningToast(err.message);
      } finally {
        btnAddFriend.disabled = false;
      }
    }

    // --- HEARTBEATS & SYNC ENGINE ---
    function startHeartbeats() {
      stopHeartbeats();

      // Heartbeat every 10 seconds to update presence
      sendPresenceHeartbeat(); // Immediate
      presenceInterval = setInterval(sendPresenceHeartbeat, 10000);

      // Refresh friends list & pending requests every 7 seconds
      refreshFriendsData();
      refreshInterval = setInterval(refreshFriendsData, 7000);
    }

    function stopHeartbeats() {
      if (presenceInterval) clearInterval(presenceInterval);
      if (refreshInterval) clearInterval(refreshInterval);
      presenceInterval = null;
      refreshInterval = null;
    }

    async function sendPresenceHeartbeat() {
      if (!idkToken) return;

      // Determine playing state from playBtn class!
      const playBtn = actions.getPlayButton?.();
      const isPlaying = playBtn?.classList.contains("running");
      const playingVersion = isPlaying
        ? `${state.selectedLoader} ${state.selectedVersion}`
        : null;

      try {
        await idkRequest("/api/presence", "POST", {
          status: "online",
          playingVersion,
          cloudflaredUrl: activeTunnelUrl,
        });
      } catch (err) {
        console.warn("[IDK Connect] Heartbeat failed", err.message);
      }
    }

    // --- REFRESH FRIENDS & RENDER LISTS ---
    async function refreshFriendsData() {
      if (!idkToken) return;

      try {
        // 1. Fetch friend list
        const friendsData = await idkRequest("/api/friends");
        renderFriendsList(friendsData.friends);

        // 2. Fetch pending requests
        const reqData = await idkRequest("/api/friends/requests");
        renderFriendRequests(reqData.requests);

        // Update badge count
        const reqCount = reqData.requests.length;
        badgePending.innerText = reqCount;
        badgePending.style.display = reqCount > 0 ? "flex" : "none";
      } catch (err) {
        console.warn("[IDK Connect] Sync failed", err.message);
      }
    }

    function renderFriendRequests(requests) {
      if (!requests || requests.length === 0) {
        requestsSection.style.display = "none";
        requestsList.innerHTML = "";
        return;
      }

      requestsSection.style.display = "flex";
      requestsList.innerHTML = "";

      requests.forEach((req) => {
        const card = document.createElement("div");
        card.className = "friend-request-card";
        card.innerHTML = `
        <div class="friend-request-info">
          <strong>${req.username}</strong>
          <span>Wants to be friends</span>
        </div>
        <div class="friend-request-actions">
          <button class="friend-request-btn accept" data-id="${req.requestId}" title="Accept Request">&#x2713;</button>
          <button class="friend-request-btn decline" data-id="${req.requestId}" title="Decline Request">&times;</button>
        </div>
      `;

        card.querySelector(".accept").onclick = () =>
          handleFriendRequest(req.requestId, true);
        card.querySelector(".decline").onclick = () =>
          handleFriendRequest(req.requestId, false);
        requestsList.appendChild(card);
      });
    }

    async function handleFriendRequest(requestId, accept) {
      try {
        const res = await idkRequest("/api/friends/requests/handle", "POST", {
          requestId,
          accept,
        });
        actions.showWarningToast(res.message);
        refreshFriendsData();
      } catch (err) {
        actions.showWarningToast(err.message);
      }
    }

    function renderFriendsList(friends) {
      if (!friends || friends.length === 0) {
        friendsList.innerHTML =
          '<div class="friends-list-empty">Your friends list is empty.</div>';
        return;
      }

      friendsList.innerHTML = "";

      // Sort friends: Hosting first, then Online, then Offline
      const sorted = [...friends].sort((a, b) => {
        if (a.cloudflaredUrl && !b.cloudflaredUrl) return -1;
        if (!a.cloudflaredUrl && b.cloudflaredUrl) return 1;
        if (a.status !== "offline" && b.status === "offline") return -1;
        if (a.status === "offline" && b.status !== "offline") return 1;
        return a.username.localeCompare(b.username);
      });

      sorted.forEach((friend) => {
        const card = document.createElement("div");
        card.className = "friend-card";

        const isOnline = friend.status !== "offline";
        const isHosting = !!friend.cloudflaredUrl;
        const isPlaying = !!friend.playingVersion && !isHosting;

        let statusText = "Offline";
        let statusClass = "";
        if (isHosting) {
          statusText = `Hosting ${friend.playingVersion || ""}`;
          statusClass = "hosting";
        } else if (isPlaying) {
          statusText = `Playing ${friend.playingVersion}`;
          statusClass = "playing";
        } else if (isOnline) {
          statusText = "Online";
          statusClass = "online";
        }

        const badgeHtml = (friend.unreadCount && friend.unreadCount > 0)
          ? `<div class="friend-unread-badge">${friend.unreadCount}</div>`
          : "";

        card.innerHTML = `
        <div class="friend-card-left">
          <div class="friend-avatar ${isOnline ? "online" : ""}">
            <canvas id="friend-avatar-${friend.id}" width="28" height="28" style="image-rendering:pixelated;width:100%;height:100%;"></canvas>
          </div>
          <div class="friend-info">
            <strong>${friend.username}</strong>
            <span class="friend-status-text ${statusClass}">
              <span class="friend-status-dot ${isOnline ? "online" : ""}"></span>
              ${statusText}
            </span>
          </div>
        </div>
        <div class="friend-card-right">
          ${badgeHtml}
          ${isHosting ? `<button class="friend-join-btn" title="Join Friend's LAN game!">JOIN</button>` : ""}
          <button class="friend-remove-btn" title="Unfriend" data-id="${friend.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="11" x2="23" y2="11"></line></svg>
          </button>
        </div>
      `;

        // Render canvas face async
        const canvas = card.querySelector(`#friend-avatar-${friend.id}`);
        if (canvas) {
          loadAvatarForUser(canvas, friend.username, "elyby");
        }

        // Hook Enter Chat on left click
        card.querySelector(".friend-card-left").onclick = () => {
          enterChat(friend);
        };

        // Hook Remove Friend
        card.querySelector(".friend-remove-btn").onclick = async (e) => {
          e.stopPropagation();
          const confirmFn = actions.showConfirmDialog;
          if (!confirmFn) {
            if (confirm(`Remove ${friend.username} from your friends list?`))
              unfriend(friend.id);
            return;
          }
          const ok = await confirmFn({
            title: "Remove friend",
            message: `Remove ${friend.username} from your friends list? You can send them a new request later.`,
            confirmText: "Unfriend",
            cancelText: "Keep friend",
            variant: "danger",
          });
          if (ok) unfriend(friend.id);
        };

        // Hook Join World
        if (isHosting) {
          card.querySelector(".friend-join-btn").onclick = (e) => {
            e.stopPropagation();
            joinFriendWorld(friend);
          };
        }

        friendsList.appendChild(card);
      });
    }

    async function unfriend(friendId) {
      try {
        const res = await idkRequest(`/api/friends/${friendId}`, "DELETE");
        actions.showWarningToast(res.message);
        refreshFriendsData();
      } catch (err) {
        actions.showWarningToast(err.message);
      }
    }

    // --- JOIN GAME ACTION ---
    function joinFriendWorld(friend) {
      if (!friend.cloudflaredUrl) return;

      let host, port;
      let connectAddressText;

      const hostPort = friend.cloudflaredUrl.replace(/^(tcp|https?):\/\//i, "");
      const parts = hostPort.split(":");
      host = parts[0];
      port = parseInt(parts[1]);
      if (isNaN(port)) {
        port = 25565;
        connectAddressText = `${host}:${port}`;
      } else {
        connectAddressText = hostPort;
      }

      if (isNaN(port)) {
        actions.showWarningToast("Failed to parse friend's server port.");
        return;
      }

      // Copy IP as fallback
      navigator.clipboard.writeText(connectAddressText);

      // If game is already running, show a notification that IP is copied
      if (actions.getPlayButton?.()?.classList.contains("running")) {
        actions.showWarningToast(
          `IP copied to clipboard! Paste it in Minecraft Multiplayer Direct Connect to join ${friend.username}.`,
        );
        return;
      }

      // Set state.quickConnectTarget details
      state.quickConnectTarget = { host, port };

      // Auto-switch Version & Loader if they mismatch!
      let mustSwitch = false;
      let playingVer = friend.playingVersion || "";

      let friendLoader = state.selectedLoader;
      let friendVersion = state.selectedVersion;

      if (playingVer) {
        let parts = playingVer.split(" ");
        if (parts.length > 1) {
          friendLoader = parts[0];
          friendVersion = parts[1];
        } else {
          // Fallback for single word playingVersion
          if (
            ["Vanilla", "Fabric", "Forge", "NeoForge", "Quilt"].includes(
              parts[0],
            )
          ) {
            friendLoader = parts[0];
          } else {
            friendVersion = parts[0];
          }
        }
      }

      if (
        state.selectedVersion !== friendVersion ||
        state.selectedLoader !== friendLoader
      ) {
        mustSwitch = true;

        // Auto switch loader dropdown selection
        state.selectedLoader = friendLoader;
        const loaderTriggerText = document.getElementById(
          "selected-loader-text",
        );
        if (loaderTriggerText) {
          loaderTriggerText.innerHTML = `<span style="display: flex; align-items: center; gap: 8px;">${friendLoader}</span>`;
        }
        document
          .querySelectorAll("#loader-dropdown .custom-option")
          .forEach((opt) => {
            opt.classList.toggle(
              "selected",
              opt.dataset.loader === friendLoader,
            );
          });

        // Auto switch version dropdown selection
        state.selectedVersion = friendVersion;
        actions.renderVersions?.();
      }

      if (mustSwitch) {
        actions.showWarningToast(
          `Auto-switched to ${friendLoader} ${friendVersion} to match ${friend.username}! Launching game...`,
        );
      } else {
        actions.showWarningToast(
          `Launching Minecraft to join ${friend.username}'s world!`,
        );
      }

      // Programmatically launch the game!
      setTimeout(() => {
        actions.playGame?.();
      }, 800);
    }

    function formatChatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);

      if (diffMin < 1) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;

      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (isToday) return `Today ${time}`;
      if (isYesterday) return `Yesterday ${time}`;
      return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
    }

    // --- DIRECT MESSAGING / CHAT SYSTEM ---
    async function enterChat(friend) {
      activeChatFriendId = friend.id;
      activeChatFriendUsername = friend.username;

      // Update UI Views
      mainPanel.style.display = "none";
      chatPanel.style.display = "flex";

      // Set friend details in header
      chatNameLabel.innerText = friend.username;

      const isOnline = friend.status !== "offline";
      const isHosting = !!friend.cloudflaredUrl;
      const isPlaying = !!friend.playingVersion && !isHosting;
      let statusText = "Offline";
      let statusClass = "";
      if (isHosting) {
        statusText = `Hosting ${friend.playingVersion || ""}`;
        statusClass = "hosting";
      } else if (isPlaying) {
        statusText = `Playing ${friend.playingVersion}`;
        statusClass = "playing";
      } else if (isOnline) {
        statusText = "Online";
        statusClass = "online";
      }

      chatStatusLabel.innerHTML = `
        <span class="friend-status-dot ${isOnline ? "online" : ""}"></span>
        ${statusText}
      `;
      chatStatusLabel.className = `friend-status-text ${statusClass}`;

      // Load avatar
      loadAvatarForUser(chatAvatarCanvas, friend.username, "elyby");

      // Load messages initially
      chatMessagesContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:11px;padding:20px 0;">Loading chat history...</div>';
      await loadChatMessages(true);

      // Start message polling every 3 seconds
      if (chatPollInterval) clearInterval(chatPollInterval);
      chatPollInterval = setInterval(() => loadChatMessages(false), 3000);
    }

    function exitChat() {
      if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
      }
      activeChatFriendId = null;
      activeChatFriendUsername = null;

      chatPanel.style.display = "none";
      if (idkToken && idkUser) {
        mainPanel.style.display = "block";
        refreshFriendsData(); // Refresh friends list to clear unread counts instantly
      }
    }

    let lastMessagesJson = "";
    async function loadChatMessages(isInitial = false) {
      if (!idkToken || !activeChatFriendId) return;

      try {
        const res = await idkRequest(`/api/messages/${activeChatFriendId}`);
        const messages = res.messages || [];

        // Check if messages actually changed to avoid unnecessary re-rendering
        const currentJson = JSON.stringify(messages);
        if (currentJson === lastMessagesJson && !isInitial) {
          return;
        }
        lastMessagesJson = currentJson;

        const shouldScroll = isInitial || (chatMessagesContainer.scrollHeight - chatMessagesContainer.scrollTop - chatMessagesContainer.clientHeight < 60);

        if (messages.length === 0) {
          chatMessagesContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:11px;padding:20px 0;">No messages yet. Say hello!</div>';
          return;
        }

        chatMessagesContainer.innerHTML = "";

        // Group consecutive messages by sender within a 2-minute window
        const GROUP_WINDOW = 2 * 60 * 1000;
        const groups = [];
        let cur = null;

        messages.forEach(msg => {
          const isMe = msg.senderId === idkUser.id;
          const ts = new Date(msg.timestamp).getTime();
          if (cur && cur.isMe === isMe && ts - cur.lastTime < GROUP_WINDOW) {
            cur.messages.push(msg);
            cur.lastTime = ts;
          } else {
            cur = { isMe, messages: [msg], lastTime: ts };
            groups.push(cur);
          }
        });

        groups.forEach(group => {
          group.messages.forEach((msg, i) => {
            const msgRow = document.createElement("div");
            const isFirst = i === 0;
            msgRow.className = `chat-message-row ${group.isMe ? "me" : "friend"}${!isFirst ? " grouped" : ""}`;
            const isLast = i === group.messages.length - 1;

            msgRow.innerHTML = `
              <div class="chat-message-bubble">${escapeHtml(msg.text)}</div>
              ${isLast ? `<div class="chat-message-time">${formatChatTime(group.lastTime)}</div>` : ""}
            `;
            chatMessagesContainer.appendChild(msgRow);
          });
        });

        if (shouldScroll) {
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
      } catch (err) {
        console.warn("[Chat] Failed to load messages", err.message);
      }
    }

    async function handleSendMessage() {
      const text = chatInput.value.trim();
      if (!text || !activeChatFriendId) return;

      chatInput.value = "";
      chatInput.focus();

      // Optimistic locally rendered bubble for premium instant feedback feel
      const msgRow = document.createElement("div");
      msgRow.className = "chat-message-row me";
      msgRow.innerHTML = `<div class="chat-message-bubble">${escapeHtml(text)}</div>`;
      chatMessagesContainer.appendChild(msgRow);
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

      try {
        await idkRequest(`/api/messages/${activeChatFriendId}`, "POST", { text });
        // Refresh messages to sync IDs and states
        loadChatMessages(false);
      } catch (err) {
        actions.showWarningToast(err.message);
      }
    }

    function escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Hook DOM Event Listeners for Chat Panel
    if (btnFriendsChatBack) {
      btnFriendsChatBack.addEventListener("click", exitChat);
    }
    if (btnFriendsChatSend) {
      btnFriendsChatSend.addEventListener("click", handleSendMessage);
    }
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSendMessage();
      });
    }

    // --- INITIAL CHECK ---
    updateFriendsAuthUI();

    // Register action to allow updating from outside
    actions.updateFriendsAuthUI = updateFriendsAuthUI;

    // Expose enterChat so profile sidebar can open chat with a friend
    actions.openChatWithFriend = enterChat;
    actions.openFriendsSidebar = () => {
      sidebar.classList.add("active");
      btnToggleSidebar.classList.add("active");
      mainPanel.style.display = "block";
      chatPanel.style.display = "none";
      refreshFriendsData();
      // Hide unread dot immediately — next poll will re-show if new messages arrive
      const dot = document.getElementById("friends-unread-dot");
      if (dot) dot.style.display = "none";
    };
    actions.exitChat = exitChat;

    // Background unread message notification polling
    let lastUnreadTotals = {};
    let isFirstUnreadPoll = true;
    const unreadDot = document.getElementById("friends-unread-dot");
    setInterval(async () => {
      if (!idkToken || !idkUser) return;
      try {
        const res = await idkRequest("/api/friends");
        const friends = res.friends || [];
        let totalUnread = 0;
        for (const friend of friends) {
          const prev = lastUnreadTotals[friend.id] || 0;
          if (friend.unreadCount > prev && !isFirstUnreadPoll) {
            const newCount = friend.unreadCount - prev;
            const plural = newCount > 1 ? "messages" : "message";
            actions.showWarningToast(`${friend.username} sent ${newCount} new ${plural}!`);
          }
          lastUnreadTotals[friend.id] = friend.unreadCount || 0;
          totalUnread += friend.unreadCount || 0;
        }
        if (unreadDot) {
          unreadDot.style.display = totalUnread > 0 ? "block" : "none";
        }
        isFirstUnreadPoll = false;
      } catch (_) {}
    }, 15000);
  })();
}
