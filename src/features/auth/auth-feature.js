import { state, actions } from '../../core/app-state.js';

export function initAuthFeature({ switchView }) {
// --- LOGIN LOGIC ---
const btnOfflineLogin = document.getElementById('btn-offline-login');
const offlineForm = document.getElementById('offline-form');
const loginInput = document.getElementById('login-username');
const btnSubmitLogin = document.getElementById('btn-submit-login');

const btnElybyLogin = document.getElementById('btn-elyby-login');
const elybyForm = document.getElementById('elyby-form');
const elybyUserInput = document.getElementById('elyby-username');
const elybyPassInput = document.getElementById('elyby-password');
const btnSubmitElyby = document.getElementById('btn-submit-elyby');
let profile3dViewer = null;

if (state.currentUser) {
  // Auto-login
  updateUserDisplay(state.currentUser);
  switchView('main');
}

btnOfflineLogin.addEventListener('click', () => {
  elybyForm.classList.remove('open');
  offlineForm.classList.add('open');
  loginInput.focus();
});

btnElybyLogin.addEventListener('click', () => {
  offlineForm.classList.remove('open');
  elybyForm.classList.add('open');
  elybyUserInput.focus();
});

loginInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
btnSubmitLogin.addEventListener('click', login);

function login() {
  const val = loginInput.value.trim();
  if (!val) return;
  state.currentUser = val;
  state.authMode = 'offline';
  localStorage.setItem('craftlaunch_username', state.currentUser);
  localStorage.setItem('craftlaunch_authmode', state.authMode);
  updateUserDisplay(state.currentUser);
  switchView('main');
}

btnSubmitElyby.addEventListener('click', async () => {
  const username = elybyUserInput.value.trim();
  const password = elybyPassInput.value;
  if(!username || !password) return;
  
  btnSubmitElyby.innerText = 'Logging in...';
  try {
    let ok = false;
    let data = {};
    if (window.electronAPI && window.electronAPI.elybyAuthenticate) {
      const res = await window.electronAPI.elybyAuthenticate({ username, password, clientToken: 'idklauncher-token-' + Date.now() });
      ok = res.ok;
      data = res.data;
    } else {
      const res = await fetch('https://authserver.ely.by/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: { name: 'Minecraft', version: 1 }, username, password, clientToken: 'idklauncher-token-' + Date.now() })
      });
      data = await res.json();
      ok = res.ok;
    }

    if(ok && data.accessToken) {
      state.currentUser = data.selectedProfile.name;
      state.authMode = 'elyby';
      localStorage.setItem('craftlaunch_username', state.currentUser);
      localStorage.setItem('craftlaunch_authmode', state.authMode);
      localStorage.setItem('craftlaunch_elybydata', JSON.stringify(data));
      updateUserDisplay(state.currentUser);
      switchView('main');
    } else {
      alert(data.errorMessage || 'Login failed');
    }
  } catch(e) {
    alert('Network error during login.');
  }
  btnSubmitElyby.innerText = 'Login via Ely.by';
});

function renderSkinFaceOnCanvas(skinUrl, fallbackUrl) {
  const canvas = document.getElementById('avatar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  // No crossOrigin here -- we only draw TO the canvas, never read pixels back,
  // so taint protection isn't needed. crossOrigin='anonymous' silently blocks
  // loading when the remote server doesn't send CORS headers.
  img.onload = () => {
    const scale = img.naturalWidth / 64; // handles both 64x64 and 64x32 skins
    ctx.clearRect(0, 0, 28, 28);
    ctx.imageSmoothingEnabled = false;
    // Face layer: x=8,y=8,w=8,h=8 on the skin sheet
    ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, 28, 28);
    // Hat/outer layer: x=40,y=8,w=8,h=8 on the skin sheet
    ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, 28, 28);
  };
  img.onerror = () => {
    if (fallbackUrl && img.src !== fallbackUrl) {
      img.src = fallbackUrl;
    } else if (img.src !== 'https://minotar.net/skin/Steve') {
      img.src = 'https://minotar.net/skin/Steve';
    } else {
      ctx.fillStyle = '#3c3c3d';
      ctx.fillRect(0, 0, 28, 28);
    }
  };
  img.src = skinUrl;
}

async function loadElybyAvatar(name) {
  // Try IPC route first (Node.js, no CORS)
  if (window.electronAPI && window.electronAPI.fetchElybyProfile) {
    try {
      const res = await window.electronAPI.fetchElybyProfile(name);
      if (res.ok && res.data) {
        const textureProp = res.data?.properties?.find(p => p.name === 'textures');
        if (textureProp) {
          const decoded = JSON.parse(atob(textureProp.value));
          const skinUrl = decoded?.textures?.SKIN?.url;
          if (skinUrl) {
            renderSkinFaceOnCanvas(skinUrl, `https://skinsystem.ely.by/skins/${name}.png`);
            return;
          } else {
            // The profile returned successfully, but textures are empty (user has no skin on Ely.by).
            // Fall back directly to premium Mojang or Steve to avoid querying skinsystem and throwing a 404!
            renderSkinFaceOnCanvas(
              `https://minotar.net/skin/${name}`,
              `https://minotar.net/skin/Steve`
            );
            return;
          }
        }
      }
    } catch(_) {}
  }

  // Fallback: render Ely.by skin directly, with Minotar and Steve as progressive fallbacks
  renderSkinFaceOnCanvas(
    `https://skinsystem.ely.by/skins/${name}.png`,
    `https://minotar.net/skin/${name}`
  );
}

function updateUserDisplay(name) {
  document.getElementById('display-username').innerText = name;
  document.getElementById('display-username').nextElementSibling.innerText = state.authMode === 'elyby' ? 'Ely.by Account' : 'Offline Account';
  
  const skinBtn = document.getElementById('btn-dropdown-skin');
  if (skinBtn) {
    skinBtn.style.display = state.authMode === 'elyby' ? 'flex' : 'none';
  }

  if (state.authMode === 'elyby') {
    // Show a placeholder immediately, then replace once the real skin loads
    const canvas = document.getElementById('avatar-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2d2d2e';
      ctx.fillRect(0, 0, 28, 28);
    }
    loadElybyAvatar(name);
  } else {
    renderSkinFaceOnCanvas(
      `https://minotar.net/skin/${name}`,
      `https://minotar.net/skin/Steve`
    );
  }

  // Trigger our premium 3D overlapping card render!
  updateUserDisplay3D(name);
}

async function updateUserDisplay3D(name) {
  const canvasEl = document.getElementById('profile-3d-canvas');
  if (!canvasEl) return;

  // 1. Get raw skin URL
  let skinUrl = `https://minotar.net/skin/${name}`;
  if (state.authMode === 'elyby') {
    if (window.electronAPI && window.electronAPI.fetchElybyProfile) {
      try {
        const res = await window.electronAPI.fetchElybyProfile(name);
        if (res.ok && res.data) {
          const textureProp = res.data?.properties?.find(p => p.name === 'textures');
          if (textureProp) {
            const decoded = JSON.parse(atob(textureProp.value));
            const realUrl = decoded?.textures?.SKIN?.url;
            if (realUrl) skinUrl = realUrl;
          }
        }
      } catch(_) {}
    } else {
      skinUrl = `https://skinsystem.ely.by/skins/${name}.png`;
    }
  }

  // 2. Fetch via Base64 CORS Bypass
  let localTextureUrl = skinUrl;
  if (window.electronAPI && window.electronAPI.fetchImageBase64) {
    try {
      const res = await window.electronAPI.fetchImageBase64(skinUrl);
      if (res && res.ok && res.data) {
        localTextureUrl = res.data;
      } else {
        const fallbackRes = await window.electronAPI.fetchImageBase64(`https://minotar.net/skin/Steve`);
        if (fallbackRes && fallbackRes.ok && fallbackRes.data) {
          localTextureUrl = fallbackRes.data;
        }
      }
    } catch(err) {
      console.error('[Profile 3D CORS] Failed to proxy image:', err);
    }
  }

  // 3. Render in Three.js
  if (profile3dViewer) {
    try { profile3dViewer.dispose(); } catch(e){}
  }

  import('skinview3d').then(({ SkinViewer, IdleAnimation }) => {
    if (!document.getElementById('profile-3d-canvas')) return;
    profile3dViewer = new SkinViewer({
      canvas: canvasEl,
      width: 50,
      height: 100,
      skin: localTextureUrl
    });

    profile3dViewer.autoRotate = false;
    
    // Rotate player slightly for a premium 3/4 angle
    profile3dViewer.playerObject.rotation.y = 0.5;
    
    // Disable controls
    profile3dViewer.controls.enabled = false;

    // Apply soft idle breathing animation so it feels organic and premium!
    const anim = new IdleAnimation();
    anim.speed = 0.55;
    profile3dViewer.animation = anim;
  }).catch((err) => {
    console.error('Error rendering profile 3D model:', err);
  });
}

// User Profile Dropdown Triggers
const userProfileBtn = document.getElementById('user-profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const btnDropdownSkin = document.getElementById('btn-dropdown-skin');
const btnDropdown3dSkin = document.getElementById('btn-dropdown-3d-skin');
const btnDropdownLogout = document.getElementById('btn-dropdown-logout');

// Toggle dropdown menu on click
userProfileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  profileDropdown.classList.remove('active');
});

// "Change Skin" behavior: forwards user to Ely.by profile dashboard in their system browser!
btnDropdownSkin.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  const targetUrl = 'https://ely.by/profile';
  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(targetUrl);
  } else {
    window.open(targetUrl, '_blank');
  }
});

// "View 3D Skin" click behavior
btnDropdown3dSkin.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  open3dSkinViewer();
});

// Logout click behavior
btnDropdownLogout.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  if (confirm("Log out?")) {
    state.currentUser = '';
    localStorage.removeItem('craftlaunch_username');
    switchView('login');
  }
});

// --- 3D SKIN VIEWER INTEGRATION ---
async function getSkinTextureUrl(name, mode) {
  if (mode === 'elyby') {
    if (window.electronAPI && window.electronAPI.fetchElybyProfile) {
      try {
        const res = await window.electronAPI.fetchElybyProfile(name);
        if (res.ok && res.data) {
          const textureProp = res.data?.properties?.find(p => p.name === 'textures');
          if (textureProp) {
            const decoded = JSON.parse(atob(textureProp.value));
            const skinUrl = decoded?.textures?.SKIN?.url;
            if (skinUrl) return skinUrl;
          }
        }
      } catch(_) {}
    }
    return `https://skinsystem.ely.by/skins/${name}.png`;
  }
  return `https://minotar.net/skin/${name}`;
}

function open3dSkinViewer() {
  const modal = document.createElement('div');
  modal.className = 'skin-3d-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(9, 9, 11, 0.7);
    backdrop-filter: blur(20px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  modal.innerHTML = `
    <div class="skin-3d-modal-card" style="
      background: rgba(24, 24, 27, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 30px;
      padding: 40px;
      width: 480px;
      max-width: 90%;
      text-align: center;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(34, 197, 94, 0.1);
      transform: scale(0.9);
      transition: transform 0.3s ease;
      position: relative;
    ">
      <div style="position: absolute; top: 24px; right: 24px; cursor: pointer; color: var(--text-muted); font-size: 20px;" id="btn-close-skin-3d">&times;</div>
      <h3 style="font-family: var(--font-title); font-size: 24px; margin-bottom: 8px; color: white;">3D Character Viewer</h3>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Interact, rotate, and animate your Minecraft skin</p>
      
      <div style="display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.3); border-radius: 20px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.03); position: relative; height: 400px;">
        <div id="skin-viewer-loading" style="position: absolute; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); z-index: 10;">
          <svg class="animate-spin" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="3" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"></path>
          </svg>
          <span style="font-size: 13px;">Fetching skin texture...</span>
        </div>
        <canvas id="skin-viewer-canvas" style="width: 280px; height: 360px; outline: none; opacity: 0; transition: opacity 0.5s ease;"></canvas>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <div style="text-align: left;">
          <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Animation</label>
          <select id="skin-anim-select" style="
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            color: white;
            padding: 10px;
            width: 100%;
            outline: none;
            cursor: pointer;
          ">
            <option value="walk" style="background: #18181b;">Walking</option>
            <option value="run" style="background: #18181b;">Running</option>
            <option value="idle" style="background: #18181b;">Breathing</option>
            <option value="fly" style="background: #18181b;">Flying</option>
            <option value="none" style="background: #18181b;">Static</option>
          </select>
        </div>
        
        <div style="text-align: left;">
          <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Rotation</label>
          <button id="btn-toggle-rotate" style="
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            color: var(--accent-green);
            border-radius: 10px;
            padding: 10px;
            width: 100%;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          ">Auto Rotation: ON</button>
        </div>
      </div>
      
      <button class="submit-btn" id="btn-skin-3d-close" style="width: 100%; padding: 14px; font-weight: 700; border-radius: 14px;">Done</button>
    </div>
  `;

  document.body.appendChild(modal);

  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('.skin-3d-modal-card').style.transform = 'scale(1)';
  }, 10);

  let viewerInstance = null;

  const closeModal = () => {
    modal.style.opacity = '0';
    modal.querySelector('.skin-3d-modal-card').style.transform = 'scale(0.9)';
    setTimeout(() => {
      if (viewerInstance) {
        try { viewerInstance.dispose(); } catch(e){}
      }
      modal.remove();
    }, 300);
  };

  document.getElementById('btn-close-skin-3d').addEventListener('click', closeModal);
  document.getElementById('btn-skin-3d-close').addEventListener('click', closeModal);

  const username = state.currentUser || 'Steve';
  getSkinTextureUrl(username, state.authMode).then(async (skinUrl) => {
    let localTextureUrl = skinUrl;

    if (window.electronAPI && window.electronAPI.fetchImageBase64) {
      try {
        const res = await window.electronAPI.fetchImageBase64(skinUrl);
        if (res && res.ok && res.data) {
          localTextureUrl = res.data;
        } else {
          const fallbackRes = await window.electronAPI.fetchImageBase64(`https://minotar.net/skin/Steve`);
          if (fallbackRes && fallbackRes.ok && fallbackRes.data) {
            localTextureUrl = fallbackRes.data;
          }
        }
      } catch (err) {
        console.error('[CORS Bypass] Failed to load skin texture through main process:', err);
      }
    }

    import('skinview3d').then(({ SkinViewer, WalkingAnimation, RunningAnimation, IdleAnimation, FlyingAnimation }) => {
      const canvasEl = document.getElementById('skin-viewer-canvas');
      const loaderEl = document.getElementById('skin-viewer-loading');
      
      if (!canvasEl) return;

      viewerInstance = new SkinViewer({
        canvas: canvasEl,
        width: 280,
        height: 360,
        skin: localTextureUrl
      });

      if (loaderEl) loaderEl.style.display = 'none';
      canvasEl.style.opacity = '1';

      viewerInstance.autoRotate = true;
      viewerInstance.autoRotateSpeed = 0.8;

      let currentAnim = new WalkingAnimation();
      currentAnim.speed = 0.8;
      viewerInstance.animation = currentAnim;

      const select = document.getElementById('skin-anim-select');
      if (select) {
        select.addEventListener('change', (e) => {
          const val = e.target.value;
          if (val === 'walk') {
            currentAnim = new WalkingAnimation();
          } else if (val === 'run') {
            currentAnim = new RunningAnimation();
          } else if (val === 'idle') {
            currentAnim = new IdleAnimation();
          } else if (val === 'fly') {
            currentAnim = new FlyingAnimation();
          } else {
            currentAnim = null;
          }
          if (currentAnim) currentAnim.speed = 0.8;
          viewerInstance.animation = currentAnim;
        });
      }

      const rotateBtn = document.getElementById('btn-toggle-rotate');
      if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
          viewerInstance.autoRotate = !viewerInstance.autoRotate;
          rotateBtn.innerText = viewerInstance.autoRotate ? 'Auto Rotation: ON' : 'Auto Rotation: OFF';
          rotateBtn.style.color = viewerInstance.autoRotate ? 'var(--accent-green)' : 'var(--text-muted)';
          rotateBtn.style.background = viewerInstance.autoRotate ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)';
          rotateBtn.style.borderColor = viewerInstance.autoRotate ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)';
        });
      }
    }).catch((err) => {
      console.error('[3D Viewer] Error loading skinview3d:', err);
      const loaderEl = document.getElementById('skin-viewer-loading');
      if (loaderEl) {
        loaderEl.innerHTML = `<span style="color: #ef4444; font-size: 13px;">Error rendering 3D skin model</span>`;
      }
    });
  }).catch((err) => {
    console.error('[3D Viewer] Error getting skin url:', err);
    const loaderEl = document.getElementById('skin-viewer-loading');
    if (loaderEl) {
      loaderEl.innerHTML = `<span style="color: #ef4444; font-size: 13px;">Error fetching skin URL</span>`;
    }
  });
}




}
