import { state, actions } from '../../core/app-state.js';

export function initVersionModsFeature({ switchView }) {
  // This feature integrates version mods into the modpack manager
  // Versions are shown alongside modpacks in the sidebar
  
  const manageModsBtn = document.getElementById('manage-mods-btn');
  if (!manageModsBtn) {
    console.warn('[VersionMods] Manage Mods button not found');
    return;
  }
  
  // Show/hide button based on version selection
  function updateManageModsButton() {
    const isDownloaded = state.downloadedVersions.includes(state.selectedVersion);
    manageModsBtn.style.display = isDownloaded ? 'block' : 'none';
  }
  
  // Wrap renderVersions to update button visibility
  const originalRenderVersions = actions.renderVersions;
  if (originalRenderVersions) {
    actions.renderVersions = function() {
      originalRenderVersions.call(this);
      updateManageModsButton();
    };
  }
  
  // When button is clicked, switch to modpacks view with version selected
  manageModsBtn.addEventListener('click', () => {
    const version = state.selectedVersion;
    if (!version) return;
    
    console.log('[VersionMods] Manage Mods clicked for version:', version);
    
    // Set a flag to indicate we're viewing a version's mods
    state.activeVersionForMods = version;
    state.activeModpackId = null; // Clear any active modpack
    
    // Switch to modpacks view
    switchView('mods');
    
    // Trigger re-render after view switch
    setTimeout(() => {
      if (actions.modpacks?.mpRenderList) {
        actions.modpacks.mpRenderList();
      }
      if (actions.modpacks?.mpRenderDetail) {
        actions.modpacks.mpRenderDetail();
      }
    }, 100);
  });
  
  // Initial state
  setTimeout(() => {
    updateManageModsButton();
  }, 500);
}

