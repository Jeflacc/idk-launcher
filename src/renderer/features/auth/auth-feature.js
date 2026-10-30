import { state, actions } from "../../core/app-state.js";
import { loadAvatarForUser } from "../../core/skin-texture.js";

export function initAuthFeature({ switchView }) {
  // --- LOGIN LOGIC ---
  const btnOfflineLogin = document.getElementById("btn-offline-login");
  const offlineForm = document.getElementById("offline-form");
  const loginInput = document.getElementById("login-username");
  const btnSubmitLogin = document.getElementById("btn-submit-login");

  const btnElybyLogin = document.getElementById("btn-elyby-login");
  const btnMicrosoftLogin = document.getElementById("btn-microsoft-login");

  if (state.currentUser) {
    // Auto-login
    updateUserDisplay(state.currentUser);
    handleOnboardingFlow(switchView);
  }

  btnOfflineLogin.addEventListener("click", () => {
    offlineForm.classList.add("open");
    // Delay focus slightly so the pointer-events transition completes
    setTimeout(() => loginInput.focus(), 50);
  });

  btnElybyLogin.addEventListener("click", async () => {
    offlineForm.classList.remove("open");

    btnElybyLogin.innerText = "Logging in...";
    try {
      if (window.electronAPI && window.electronAPI.elybyOAuthAuthenticate) {
        const res = await window.electronAPI.elybyOAuthAuthenticate();
        if (res && res.ok && res.data && res.data.accessToken) {
          state.currentUser = res.data.selectedProfile.name;
          state.authMode = "elyby";
          localStorage.setItem("craftlaunch_username", state.currentUser);
          localStorage.setItem("craftlaunch_authmode", state.authMode);
          if (window.electronAPI) {
            window.electronAPI
              .saveSettings({
                session: { currentUser: state.currentUser, authMode: state.authMode },
                elybyData: res.data,
              })
              .catch(console.error);
          }
          updateUserDisplay(state.currentUser);
          handleOnboardingFlow(switchView);
        } else {
          alert("Ely.by login failed or was cancelled.");
        }
      }
    } catch (e) {
      console.error("[Auth] Ely.by login error:", e);
      const msg = e?.message || String(e);
      if (msg.includes("decrypt")) {
        alert("Login failed: the stored credentials are corrupted and have been cleared. Please try logging in again.");
      } else if (msg.includes("timed out")) {
        alert("Login timed out. Please try again.");
      } else if (msg.includes("Failed to start local OAuth server")) {
        alert("Login failed: the local authentication server could not start. Please close other launcher instances and try again.");
      } else {
        alert("Error during Ely.by login: " + msg);
      }
    }
    btnElybyLogin.innerHTML = '<img src="./elyby.jpg" alt="Ely.by Logo" width="22" height="22" style="border-radius: 4px; object-fit: cover;" /> Ely.by Account';
  });

  btnMicrosoftLogin.addEventListener("click", async () => {
    offlineForm.classList.remove("open");

    btnMicrosoftLogin.innerText = "Logging in...";
    try {
      if (window.electronAPI && window.electronAPI.microsoftAuthenticate) {
        const res = await window.electronAPI.microsoftAuthenticate();
        if (res && res.success && res.data && res.data.profile) {
          state.currentUser = res.data.profile.name;
          state.authMode = "microsoft";
          localStorage.setItem("craftlaunch_username", state.currentUser);
          localStorage.setItem("craftlaunch_authmode", state.authMode);
          
          window.electronAPI.saveSettings({
            session: { currentUser: state.currentUser, authMode: state.authMode },
            microsoftData: res.data
          }).catch(console.error);

          updateUserDisplay(state.currentUser);
          handleOnboardingFlow(switchView);
        } else {
          alert(res?.error || "Microsoft login failed or cancelled.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error during Microsoft login.");
    }
    btnMicrosoftLogin.innerHTML = '<img src="./microsoft.png" alt="Microsoft Logo" width="24" height="24" style="object-fit: contain;" /> Microsoft Account';
  });

  loginInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  btnSubmitLogin.addEventListener("click", login);

  function login() {
    const val = loginInput.value.trim();
    if (!val) return;
    state.currentUser = val;
    state.authMode = "offline";
    localStorage.setItem("craftlaunch_username", val);
    localStorage.setItem("craftlaunch_authmode", state.authMode);

    // Multi-account: track this offline account in the account list
    const accounts = Array.isArray(state.offlineAccounts) ? state.offlineAccounts : [];
    if (!accounts.includes(val)) {
      accounts.push(val);
    }
    state.offlineAccounts = accounts;
    state.selectedOfflineAccount = val;
    localStorage.setItem("craftlaunch_offline_accounts", JSON.stringify(accounts));
    localStorage.setItem("craftlaunch_selected_offline_account", val);

    if (window.electronAPI) {
      window.electronAPI
        .saveSettings({
          session: { currentUser: val, authMode: "offline" },
        })
        .catch(console.error);
    }
    updateUserDisplay(val);
    handleOnboardingFlow(switchView);
  }

  async function handleOnboardingFlow(switchViewFn) {
    const { showConfirmDialog } = await import("../../components/confirm-dialog.js");
    
    // 1. EULA & Privacy Policy
    if (!localStorage.getItem("idk_agreed_eula")) {
      const agreed = await showConfirmDialog({
        title: "GAME ACCESS & LEGALITY",
        message: `By continuing, you agree to our End User License Agreement and Privacy Policy.

• Mojang/Microsoft Account Compliance: This launcher uses official OAuth authentication for Mojang and Microsoft accounts. We DO NOT store your passwords.
• Offline / Custom Access (Cracked): As a compatibility option, this launcher allows you to play offline or use custom credentials. This feature is experimental and only recommended for use on unofficial servers or testing purposes.
• Minecraft EULA Compliance: We are fully committed to respecting and complying with the Minecraft EULA. Using this launcher with custom accounts is entirely your responsibility and is not endorsed or supported by Mojang or Microsoft.

Please review and accept these terms to continue.`,
        confirmText: "AGREE & CONTINUE",
        cancelText: "DECLINE",
        variant: "neutral"
      });
      
      if (!agreed) {
        state.currentUser = "";
        localStorage.removeItem("craftlaunch_username");
        localStorage.removeItem("craftlaunch_authmode");
        if (window.electronAPI) {
          window.electronAPI.saveSettings({ session: { currentUser: "", authMode: "offline" }, elybyData: null }).catch(console.error);
        }
        actions.updateFriendsAuthUI?.();
        switchViewFn("login");
        return;
      }
      localStorage.setItem("idk_agreed_eula", "true");
    }

    // 2. IDK Connect Prompt
    if (!localStorage.getItem("idk_connect_prompted_v2")) {
      const wantIdkConnect = await showConfirmDialog({
        title: "IDK Connect",
        message: "Sign in to IDK Connect to get extra features! Multiplayer, chat, profiles, etc.",
        confirmText: "Login / Sign Up",
        cancelText: "Continue Without",
        variant: "neutral"
      });
      
      localStorage.setItem("idk_connect_prompted_v2", "true");
      
      if (wantIdkConnect) {
        switchViewFn("main");
        setTimeout(() => {
          document.getElementById('btn-friends-toggle')?.click();
        }, 100);
        return;
      }
    }

    // Proceed as normal
    switchViewFn("main");
  }

  function updateUserDisplay(name) {
    document.getElementById("display-username").innerText = name;
    const ddName = document.getElementById("profile-dd-username");
    if (ddName) ddName.innerText = name;
    const ddAccount = document.getElementById("profile-dropdown")?.querySelector(".profile-dropdown-user-account");
    if (ddAccount) {
      if (state.authMode === "elyby") ddAccount.innerText = "Ely.by Account";
      else if (state.authMode === "microsoft") ddAccount.innerText = "Microsoft Account";
      else ddAccount.innerText = "Offline Account";
    }
    const advancedHomeName = document.getElementById("advanced-home-username");
    if (advancedHomeName) advancedHomeName.innerText = name.toUpperCase();
    const accountEl = document.querySelector(".user-details-account");
    if (accountEl) {
      if (state.authMode === "elyby") accountEl.innerText = "Ely.by Account";
      else if (state.authMode === "microsoft") accountEl.innerText = "Microsoft Account";
      else accountEl.innerText = "Offline Account";
    }

    const skinBtn = document.getElementById("btn-dropdown-skin");
    if (skinBtn) {
      skinBtn.style.display = state.authMode === "elyby" ? "flex" : "none";
    }

    const avatarCanvas = document.getElementById("avatar-canvas");
    if (avatarCanvas) {
      if (state.authMode === "elyby") {
        const ctx = avatarCanvas.getContext("2d");
        ctx.fillStyle = "#2d2d2e";
        ctx.fillRect(0, 0, avatarCanvas.width, avatarCanvas.height);
      }
      loadAvatarForUser(avatarCanvas, name, state.authMode);
    }

    const ddAvatarCanvas = document.getElementById("dropdown-avatar-canvas");
    if (ddAvatarCanvas) {
      loadAvatarForUser(ddAvatarCanvas, name, state.authMode);
    }

    // Sync IDK Connect UI
    actions.updateFriendsAuthUI?.();
  }

  // --- Offline account switcher ---

  function renderOfflineAccountList() {
    const listEl = document.getElementById("profile-dd-account-list");
    const sectionEl = document.getElementById("profile-dd-account-section");
    const dividerEl = document.getElementById("profile-dd-divider");
    if (!listEl || !sectionEl || !dividerEl) return;

    const accounts = Array.isArray(state.offlineAccounts) ? state.offlineAccounts : [];
    const isOffline = state.authMode === "offline";

    if (!isOffline || accounts.length === 0) {
      sectionEl.style.display = "none";
      dividerEl.style.display = "none";
      return;
    }

    sectionEl.style.display = "block";
    dividerEl.style.display = "block";
    listEl.innerHTML = "";

    accounts.forEach((acct) => {
      const item = document.createElement("div");
      item.className = `profile-dropdown-account ${acct === state.selectedOfflineAccount ? "active" : ""}`;
      item.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18 21L12 17.77L6 21L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
        <span>${escHtml(acct)}</span>
      `;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        switchOfflineAccount(acct);
        profileDropdown.classList.remove("active");
      });
      listEl.appendChild(item);
    });
  }

  function escHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function switchOfflineAccount(username) {
    const val = username.trim();
    if (!val || val === state.selectedOfflineAccount) return;
    const accounts = Array.isArray(state.offlineAccounts) ? state.offlineAccounts : [];
    if (!accounts.includes(val)) {
      accounts.push(val);
    }
    state.offlineAccounts = accounts;
    state.selectedOfflineAccount = val;
    state.currentUser = val;
    state.authMode = "offline";
    localStorage.setItem("craftlaunch_username", val);
    localStorage.setItem("craftlaunch_authmode", "offline");
    localStorage.setItem("craftlaunch_offline_accounts", JSON.stringify(accounts));
    localStorage.setItem("craftlaunch_selected_offline_account", val);
    if (window.electronAPI) {
      await window.electronAPI
        .saveSettings({ session: { currentUser: val, authMode: "offline" } })
        .catch(console.error);
    }
    updateUserDisplay(val);
  }

  // User Profile Dropdown Triggers
  const userProfileBtn = document.getElementById("user-profile-btn");
  const profileDropdown = document.getElementById("profile-dropdown");
  const btnDropdownSkin = document.getElementById("btn-dropdown-skin");
  const btnDropdownProfile = document.getElementById("btn-dropdown-profile");
  const btnDropdownLogout = document.getElementById("btn-dropdown-logout");

  // Toggle dropdown menu on click; double-click opens profile page
  userProfileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasActive = profileDropdown.classList.contains("active");
    profileDropdown.classList.toggle("active");
    if (!wasActive) {
      renderOfflineAccountList();
    }
  });

  // Add Account button in the profile dropdown
  const btnAddAccount = document.getElementById("btn-dd-add-account");
  if (btnAddAccount) {
    btnAddAccount.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.remove("active");
      // Open the login view / offline form so the user can enter a new account
      const offlineForm = document.getElementById("offline-form");
      const loginInput = document.getElementById("login-username");
      if (offlineForm) offlineForm.classList.add("open");
      if (loginInput) loginInput.focus();
      switchView("login");
    });
  }

  userProfileBtn.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    profileDropdown.classList.remove("active");
    actions.openProfile?.();
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    profileDropdown.classList.remove("active");
  });

  // "Change Skin" behavior: forwards user to Ely.by profile dashboard in their system browser!
  btnDropdownSkin.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.remove("active");
    const targetUrl = "https://ely.by/profile";
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(targetUrl);
    } else {
      window.open(targetUrl, "_blank");
    }
  });

  // Open full profile page (3D skin + stats)
  btnDropdownProfile.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.remove("active");
    actions.openProfile?.();
  });

  // Logout click behavior
  btnDropdownLogout.addEventListener("click", async (e) => {
    e.stopPropagation();
    profileDropdown.classList.remove("active");
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
    state.currentUser = "";
    state.selectedOfflineAccount = null;
    localStorage.removeItem("craftlaunch_username");
    localStorage.removeItem("craftlaunch_authmode");
    localStorage.removeItem("craftlaunch_selected_offline_account");
    
    // Logout from IDK Connect as well
    document.getElementById("btn-friends-disconnect")?.click();
    
    if (window.electronAPI) {
      window.electronAPI
        .saveSettings({
          session: { currentUser: "", authMode: "offline" },
          elybyData: null,
        })
        .catch(console.error);
    }
    // Sync IDK Connect UI
    actions.updateFriendsAuthUI?.();
    switchView("login");
  });
}
