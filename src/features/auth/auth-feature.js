import { state, actions } from '../../core/app-state.js';
import { loadAvatarForUser } from '../../core/skin-texture.js';

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
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ currentUser: state.currentUser, authMode: state.authMode }).catch(console.error);
  }
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
      if (window.electronAPI) {
        window.electronAPI.saveSettings({ currentUser: state.currentUser, authMode: state.authMode, elybyData: data }).catch(console.error);
      }
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

function updateUserDisplay(name) {
  document.getElementById('display-username').innerText = name;
  const accountEl = document.querySelector('.user-details-account');
  if (accountEl) {
    accountEl.innerText = state.authMode === 'elyby' ? 'Ely.by Account' : 'Offline Account';
  }
  
  const skinBtn = document.getElementById('btn-dropdown-skin');
  if (skinBtn) {
    skinBtn.style.display = state.authMode === 'elyby' ? 'flex' : 'none';
  }

  const avatarCanvas = document.getElementById('avatar-canvas');
  if (avatarCanvas) {
    if (state.authMode === 'elyby') {
      const ctx = avatarCanvas.getContext('2d');
      ctx.fillStyle = '#2d2d2e';
      ctx.fillRect(0, 0, avatarCanvas.width, avatarCanvas.height);
    }
    loadAvatarForUser(avatarCanvas, name, state.authMode);
  }

  // Sync IDK Connect UI
  actions.updateFriendsAuthUI?.();
}

// User Profile Dropdown Triggers
const userProfileBtn = document.getElementById('user-profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const btnDropdownSkin = document.getElementById('btn-dropdown-skin');
const btnDropdownProfile = document.getElementById('btn-dropdown-profile');
const btnDropdownLogout = document.getElementById('btn-dropdown-logout');

// Toggle dropdown menu on click; double-click opens profile page
userProfileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('active');
});

userProfileBtn.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  actions.openProfile?.();
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

// Open full profile page (3D skin + stats)
btnDropdownProfile.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  actions.openProfile?.();
});

// Logout click behavior
btnDropdownLogout.addEventListener('click', async (e) => {
  e.stopPropagation();
  profileDropdown.classList.remove('active');
  const { showConfirmDialog } = await import('../../components/confirm-dialog.js');
  const ok = await showConfirmDialog({
    title: 'Log out',
    message: 'Sign out of the launcher on this device?',
    confirmText: 'Log out',
    cancelText: 'Stay signed in',
    variant: 'neutral',
  });
  if (!ok) return;
  state.currentUser = '';
  localStorage.removeItem('craftlaunch_username');
  if (window.electronAPI) {
    window.electronAPI.saveSettings({ currentUser: '', authMode: 'offline', elybyData: null }).catch(console.error);
  }
  // Sync IDK Connect UI
  actions.updateFriendsAuthUI?.();
  switchView('login');
});

}
