import './overlay.css';

document.addEventListener('DOMContentLoaded', async () => {
  const overlayContainer = document.getElementById('overlay-container');
  const activePanel = document.getElementById('idk-active-panel');
  const loggedOutPanel = document.getElementById('idk-logged-out');

  // Header & Close
  const btnCloseOverlay = document.getElementById('btn-close-overlay');

  // Profile Card
  const overlayUsername = document.getElementById('overlay-username');
  const myAvatarCanvas = document.getElementById('overlay-avatar-canvas');
  const btnLogout = document.getElementById('btn-logout');

  // LAN Sharing
  const lanShareForm = document.getElementById('lan-share-form');
  const lanActiveStatus = document.getElementById('lan-active-status');
  const overlayTunnelLink = document.getElementById('overlay-tunnel-link');
  const inputSharePort = document.getElementById('lan-port-input');
  const btnShare = document.getElementById('btn-lan-share');
  const btnShareCancel = document.getElementById('btn-lan-share-cancel');
  let isCancellingHost = false;

  // Add Friend
  const inputAddFriend = document.getElementById('friends-add-username');
  const btnAddFriend = document.getElementById('btn-friends-add');

  // Lists
  const friendsList = document.getElementById('friends-list');
  const requestsSection = document.getElementById('requests-section');
  const requestsList = document.getElementById('requests-list');

  // State
  let IDK_BACKEND_URL = 'https://api.somniac.me';
  let idkToken = localStorage.getItem('idk_connect_token') || '';
  let idkUser = JSON.parse(localStorage.getItem('idk_connect_user') || 'null');

  let activeTunnelUrl = null;
  let activeSharePort = null;
  let presenceInterval = null;
  let refreshInterval = null;
  let currentPlayingVersion = 'Vanilla';

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- AVATAR RENDERING HELPER ---
  function renderSkinFace(canvas, username) {
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const scale = img.naturalWidth / 64;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      // Face base
      ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, canvas.width, canvas.height);
      // Accessory layer
      ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, canvas.width, canvas.height);
    };

    let fallbackStage = 0;
    img.onerror = () => {
      fallbackStage++;
      if (fallbackStage === 1) {
        img.src = `https://minotar.net/skin/${username}`;
      } else {
        ctx.fillStyle = '#4cb837';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.substring(0, 2).toUpperCase(), canvas.width / 2, canvas.height / 2);
      }
    };

    img.src = `https://skinsystem.ely.by/skins/${username}.png`;
  }

  // --- API HELPER ---
  async function idkRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (idkToken) headers['Authorization'] = `Bearer ${idkToken}`;

    const res = await fetch(`${IDK_BACKEND_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  // --- AUTH UI SYNC ---
  function updateAuthUI() {
    idkToken = localStorage.getItem('idk_connect_token') || '';
    idkUser = JSON.parse(localStorage.getItem('idk_connect_user') || 'null');

    if (idkToken && idkUser) {
      loggedOutPanel.style.display = 'none';
      activePanel.style.display = 'block';
      overlayUsername.textContent = idkUser.username;
      renderSkinFace(myAvatarCanvas, idkUser.username);
      startHeartbeats();
    } else {
      activePanel.style.display = 'none';
      loggedOutPanel.style.display = 'block';
      stopHeartbeats();
    }
  }

  // --- LOGOUT ACTION ---
  btnLogout.addEventListener('click', async () => {
    if (activeTunnelUrl) {
      await stopSharingTunnel();
    }
    if (window.electronAPI) {
      // window.electronAPI.stopCloudflaredAccess(); // No longer needed
    }

    localStorage.removeItem('idk_connect_token');
    localStorage.removeItem('idk_connect_user');
    showToast("Disconnected from IDK Network.");
    updateAuthUI();
  });

  // --- SYNC ENGINE ---
  function startHeartbeats() {
    stopHeartbeats();
    sendPresenceHeartbeat();
    presenceInterval = setInterval(sendPresenceHeartbeat, 10000);

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
    try {
      await idkRequest('/api/presence', 'POST', {
        status: 'online',
        playingVersion: currentPlayingVersion,
        cloudflaredUrl: activeTunnelUrl
      });
    } catch (e) {
      console.warn('[Overlay] Heartbeat failed:', e.message);
    }
  }

  async function refreshFriendsData() {
    if (!idkToken) return;
    try {
      const friendsData = await idkRequest('/api/friends');
      renderFriendsList(friendsData.friends);

      const reqData = await idkRequest('/api/friends/requests');
      renderFriendRequests(reqData.requests);
    } catch (e) {
      console.warn('[Overlay] Sync failed:', e.message);
    }
  }

  // --- FRIENDS LIST ---
  function renderFriendsList(friends) {
    if (!friends || friends.length === 0) {
      friendsList.innerHTML = '<div class="friends-list-empty">Your friends list is empty.</div>';
      return;
    }

    friendsList.innerHTML = '';

    const sorted = [...friends].sort((a, b) => {
      if (a.cloudflaredUrl && !b.cloudflaredUrl) return -1;
      if (!a.cloudflaredUrl && b.cloudflaredUrl) return 1;
      if (a.status !== 'offline' && b.status === 'offline') return -1;
      if (a.status === 'offline' && b.status !== 'offline') return 1;
      return a.username.localeCompare(b.username);
    });

    sorted.forEach(friend => {
      const card = document.createElement('div');
      card.className = 'friend-card';

      const isOnline = friend.status !== 'offline';
      const isHosting = !!friend.cloudflaredUrl;
      const isPlaying = !!friend.playingVersion && !isHosting;

      let statusText = 'Offline';
      let statusClass = '';
      if (isHosting) {
        statusText = `Hosting ${friend.playingVersion || ''}`;
        statusClass = 'hosting';
      } else if (isPlaying) {
        statusText = `Playing ${friend.playingVersion}`;
        statusClass = 'playing';
      } else if (isOnline) {
        statusText = 'Online';
        statusClass = 'online';
      }

      card.innerHTML = `
        <div class="friend-card-left">
          <div class="friend-avatar ${isOnline ? 'online' : ''}">
            <canvas id="friend-avatar-${friend.id}" width="32" height="32"></canvas>
          </div>
          <div class="friend-info">
            <strong>${friend.username}</strong>
            <span class="friend-status-text ${statusClass}">
              <span class="friend-status-dot ${isOnline ? 'online' : ''}"></span>
              ${statusText}
            </span>
          </div>
        </div>
        <div class="friend-card-right">
          ${isHosting ? `<button class="friend-join-btn">JOIN</button>` : ''}
          <button class="friend-remove-btn" title="Unfriend">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="17" y1="11" x2="23" y2="11"></line>
            </svg>
          </button>
        </div>
      `;

      const canvas = card.querySelector(`#friend-avatar-${friend.id}`);
      if (canvas) renderSkinFace(canvas, friend.username);

      card.querySelector('.friend-remove-btn').onclick = async (e) => {
        e.stopPropagation();
        const confirmFn = window.IdkApp?.actions?.showConfirmDialog;
        let proceed = false;
        if (confirmFn) {
          proceed = await confirmFn({
            title: 'Remove friend',
            message: `Remove ${friend.username} from your friends list? You can send them a new request later.`,
            confirmText: 'Unfriend',
            cancelText: 'Keep friend',
            variant: 'danger',
          });
        } else {
          proceed = confirm(`Remove ${friend.username} from your friends list?`);
        }
        if (!proceed) return;
        try {
          await idkRequest(`/api/friends/${friend.id}`, 'DELETE');
          showToast(`Removed ${friend.username}.`);
          refreshFriendsData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      };

      if (isHosting) {
        card.querySelector('.friend-join-btn').onclick = () => joinFriendWorld(friend);
      }

      friendsList.appendChild(card);
    });
  }

  // --- FRIEND REQUESTS ---
  function renderFriendRequests(requests) {
    if (!requests || requests.length === 0) {
      requestsSection.style.display = 'none';
      requestsList.innerHTML = '';
      return;
    }

    requestsSection.style.display = 'block';
    requestsList.innerHTML = '';

    requests.forEach(req => {
      const card = document.createElement('div');
      card.className = 'friend-request-card';
      card.innerHTML = `
        <div class="friend-request-info">
          <strong>${req.username}</strong>
          <span>Wants to be friends</span>
        </div>
        <div class="friend-request-actions">
          <button class="friend-request-btn accept" title="Accept">&#x2713;</button>
          <button class="friend-request-btn decline" title="Decline">&times;</button>
        </div>
      `;

      card.querySelector('.accept').onclick = () => handleFriendRequest(req.requestId, true);
      card.querySelector('.decline').onclick = () => handleFriendRequest(req.requestId, false);
      requestsList.appendChild(card);
    });
  }

  async function handleFriendRequest(requestId, accept) {
    try {
      const res = await idkRequest('/api/friends/requests/handle', 'POST', { requestId, accept });
      showToast(res.message);
      refreshFriendsData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // --- ADD FRIEND ---
  btnAddFriend.addEventListener('click', handleAddFriend);
  inputAddFriend.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddFriend();
  });

  async function handleAddFriend() {
    const friendName = inputAddFriend.value.trim();
    if (!friendName) return;

    btnAddFriend.disabled = true;
    try {
      const res = await idkRequest('/api/friends/request', 'POST', { username: friendName });
      inputAddFriend.value = '';
      showToast(res.message);
      refreshFriendsData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnAddFriend.disabled = false;
    }
  }

  // --- LAN SHARING ---
  btnShare.addEventListener('click', async () => {
    if (activeTunnelUrl) {
      await stopSharingTunnel();
      return;
    }

    const portVal = parseInt(inputSharePort.value);
    if (isNaN(portVal) || portVal < 1024 || portVal > 65535) {
      showToast("Please enter a valid LAN port (1024-65535)", 'error');
      return;
    }

    isCancellingHost = false;
    btnShare.disabled = true;
    btnShare.innerText = 'STARTING...';
    btnShareCancel.style.display = 'inline-flex';
    btnShareCancel.innerText = 'CANCEL';
    btnShareCancel.disabled = false;

    if (!window.electronAPI) {
      // Mock for development in browser
      setTimeout(() => {
        if (isCancellingHost) return;
        activeTunnelUrl = `tcp://mock-tunnel-${Math.random().toString(36).substring(3, 8)}.trycloudflare.com:54321`;
        activeSharePort = portVal;
        renderSharingActive();
        btnShare.disabled = false;
        navigator.clipboard.writeText(activeTunnelUrl);
        sendPresenceHeartbeat();
        showToast("Mock Tunnel active! IP address copied to clipboard.");
      }, 1000);
      return;
    }

    try {
      const cfStatus = await window.electronAPI.ensureFrpc();
      if (!cfStatus.success) throw new Error(cfStatus.error || "Failed to download frpc");

      const tunnelStatus = await window.electronAPI.startFrpcTunnel(portVal);
      if (!tunnelStatus.success) throw new Error(tunnelStatus.error || "Failed to start tunnel");

      activeTunnelUrl = tunnelStatus.url;
      activeSharePort = portVal;

      renderSharingActive();
      navigator.clipboard.writeText(activeTunnelUrl);
      await sendPresenceHeartbeat();
      showToast("LAN world shared! IP copied to clipboard.");
    } catch (err) {
      if (!isCancellingHost) {
        showToast(`Tunnel Error: ${err.message}`, 'error');
      }
      btnShare.innerText = 'SHARE';
    } finally {
      btnShare.disabled = false;
      btnShareCancel.style.display = 'none';
    }
  });

  // Cancel sharing tunnel connection/download
  btnShareCancel.addEventListener('click', async () => {
    btnShareCancel.disabled = true;
    btnShareCancel.innerText = 'CANCELLING...';
    isCancellingHost = true;
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopFrpcTunnel();
      }
    } catch (err) {
      console.error('[Overlay] Failed to cancel host:', err);
    } finally {
      btnShareCancel.disabled = false;
      btnShareCancel.innerText = 'CANCEL';
      btnShareCancel.style.display = 'none';
      btnShare.disabled = false;
      btnShare.innerText = 'SHARE';
    }
  });

  async function stopSharingTunnel() {
    btnShare.disabled = true;
    btnShare.innerText = 'STOPPING...';
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopFrpcTunnel();
      }
      activeTunnelUrl = null;
      activeSharePort = null;
      renderSharingInactive();
      await sendPresenceHeartbeat();
      showToast("LAN sharing tunnel closed.");
    } catch (err) {
      showToast("Failed to stop tunnel cleanly.", 'error');
    } finally {
      btnShare.disabled = false;
    }
  }

  function renderSharingActive() {
    lanShareForm.style.display = 'none';
    lanActiveStatus.style.display = 'block';
    overlayTunnelLink.textContent = activeTunnelUrl;
    btnShare.innerText = 'STOP';
    btnShare.classList.add('stop-sharing');
  }

  function renderSharingInactive() {
    lanActiveStatus.style.display = 'none';
    lanShareForm.style.display = 'flex';
    btnShare.innerText = 'SHARE';
    btnShare.classList.remove('stop-sharing');
  }

  overlayTunnelLink.addEventListener('click', () => {
    if (activeTunnelUrl) {
      navigator.clipboard.writeText(activeTunnelUrl);
      showToast("IP Address copied to clipboard!");
    }
  });

  // --- JOIN GAME ACTION ---
  function joinFriendWorld(friend) {
    if (!friend.cloudflaredUrl) return;

    let connectAddressText;
    if (friend.cloudflaredUrl.startsWith('https://')) {
      connectAddressText = '127.0.0.1:25565';
      showToast("Legacy HTTPS tunnels are no longer supported. Please ask your friend to update their launcher.");
    } else {
      connectAddressText = friend.cloudflaredUrl.replace('tcp://', '');
    }

    navigator.clipboard.writeText(connectAddressText);
    showToast(`IP copied! Paste it in Minecraft Direct Connect to join ${friend.username}.`);
  }

  // --- ELECTRON EVENT LISTENERS ---
  if (window.electronAPI) {
    window.electronAPI.onFrpcTunnelClosed(() => {
      if (activeTunnelUrl) {
        activeTunnelUrl = null;
        activeSharePort = null;
        renderSharingInactive();
        sendPresenceHeartbeat();
        showToast("Tunnel connection closed unexpectedly.", 'error');
      }
    });

    window.electronAPI.onFrpcInstallProgress((data) => {
      if (!activeTunnelUrl && btnShare.disabled) {
        btnShare.innerText = `${data.status.toUpperCase()} (${data.percent}%)`;
      }
    });

    btnCloseOverlay.addEventListener('click', () => {
      window.electronAPI.resumeGame();
    });
  } else {
    // Dev close fallback
    btnCloseOverlay.addEventListener('click', () => {
      overlayContainer.classList.remove('active');
      closeBrowserView();
    });
  }

  // --- SESSION INIT ---
  function applySessionData(data) {
    if (!data) return;
    currentPlayingVersion = `${data.loader || 'Vanilla'} ${data.version || ''}`.trim();
    updateAuthUI();
  }

  if (window.electronAPI) {
    try {
      const data = await window.electronAPI.getOverlayData();
      if (data) applySessionData(data);
    } catch (e) {
      console.warn('[Overlay] getOverlayData failed:', e);
    }

    window.electronAPI.onOverlayInit((data) => applySessionData(data));
    window.electronAPI.onToggleOverlay((active) => {
      overlayContainer.classList.toggle('active', active);
      if (active) {
        updateAuthUI();
      } else {
        closeBrowserView();
      }
    });
  } else {
    updateAuthUI();
  }

  // --- BROWSER FUNCTIONALITY ---
  const browserIframe = document.getElementById('browser-iframe');
  const browserUrlInput = document.getElementById('browser-url-input');
  const btnBrowserBack = document.getElementById('btn-browser-back');
  const btnBrowserForward = document.getElementById('btn-browser-forward');
  const btnBrowserReload = document.getElementById('btn-browser-reload');
  const btnBrowserHome = document.getElementById('btn-browser-home');
  const browserWindow = document.getElementById('browser-window');
  const overlayToolbar = document.getElementById('overlay-toolbar');
  const btnOpenBrowser = document.getElementById('btn-open-browser');
  const btnBrowserCloseView = document.getElementById('btn-browser-close-view');

  const defaultHomeUrl = 'https://google.com/search?igu=1';

  function openBrowserView() {
    if (browserWindow && overlayToolbar) {
      browserWindow.classList.add('browser-open');
      overlayToolbar.classList.add('hidden');
    }
  }

  function closeBrowserView() {
    if (browserWindow && overlayToolbar) {
      browserWindow.classList.remove('browser-open');
      overlayToolbar.classList.remove('hidden');
    }
  }

  if (btnOpenBrowser) {
    btnOpenBrowser.addEventListener('click', openBrowserView);
  }

  if (btnBrowserCloseView) {
    btnBrowserCloseView.addEventListener('click', closeBrowserView);
  }

  if (browserUrlInput && browserIframe) {
    browserUrlInput.value = browserIframe.src;
  }

  function navigateBrowser(queryOrUrl) {
    if (!browserIframe) return;
    const target = queryOrUrl.trim();
    if (!target) return;

    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?($|\?|#)/i;
    const ipPattern = /^(https?:\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/;

    if (target.startsWith('http://') || target.startsWith('https://')) {
      browserIframe.src = target;
    } else if (urlPattern.test(target) || ipPattern.test(target)) {
      browserIframe.src = 'https://' + target;
    } else {
      browserIframe.src = `https://google.com/search?q=${encodeURIComponent(target)}&igu=1`;
    }
    browserUrlInput.value = browserIframe.src;
  }

  if (browserUrlInput) {
    browserUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        navigateBrowser(browserUrlInput.value);
        browserUrlInput.blur();
      }
    });

    browserUrlInput.addEventListener('focus', () => {
      browserUrlInput.select();
    });
  }

  if (btnBrowserBack && browserIframe) {
    btnBrowserBack.addEventListener('click', () => {
      try {
        if (browserIframe.contentWindow && browserIframe.contentWindow.history) {
          browserIframe.contentWindow.history.back();
        }
      } catch (e) {
        console.warn('[Browser] Back navigation failed:', e.message);
      }
    });
  }

  if (btnBrowserForward && browserIframe) {
    btnBrowserForward.addEventListener('click', () => {
      try {
        if (browserIframe.contentWindow && browserIframe.contentWindow.history) {
          browserIframe.contentWindow.history.forward();
        }
      } catch (e) {
        console.warn('[Browser] Forward navigation failed:', e.message);
      }
    });
  }

  if (btnBrowserReload && browserIframe) {
    btnBrowserReload.addEventListener('click', () => {
      try {
        if (browserIframe.contentWindow && browserIframe.contentWindow.location) {
          browserIframe.contentWindow.location.reload();
        } else {
          browserIframe.src = browserIframe.src;
        }
      } catch (e) {
        browserIframe.src = browserIframe.src;
      }
    });
  }

  if (btnBrowserHome && browserIframe && browserUrlInput) {
    btnBrowserHome.addEventListener('click', () => {
      browserIframe.src = defaultHomeUrl;
      browserUrlInput.value = defaultHomeUrl;
    });
  }

  if (browserIframe && browserUrlInput) {
    browserIframe.addEventListener('load', () => {
      try {
        if (browserIframe.contentWindow && browserIframe.contentWindow.location) {
          const currentUrl = browserIframe.contentWindow.location.href;
          if (currentUrl && currentUrl !== 'about:blank') {
            browserUrlInput.value = currentUrl;
          }
        }
      } catch (e) {
        console.log('[Browser] Could not read cross-origin location (normal for default iframe security/origins):', e.message);
      }
    });
  }
});
