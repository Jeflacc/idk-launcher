/**
 * Mod Dependency Resolver Feature
 * Detects and auto-installs mod dependencies
 */

import { state } from '../../core/app-state.js';

/**
 * Scan mods for missing dependencies
 */
export async function scanMissingDependencies(modpackId) {
  const mp = state.modpacks.find(m => m.id === modpackId);
  if (!mp) return [];

  const missingDeps = [];
  const installedIds = new Set((mp.mods || []).map(m => m.modrinthId));

  for (const mod of mp.mods || []) {
    try {
      const deps = await getModDependencies(mod.modrinthId);
      for (const dep of deps) {
        if (!installedIds.has(dep.projectId)) {
          missingDeps.push({
            dependentMod: mod.name,
            dependencyName: dep.name,
            dependencyId: dep.projectId,
            dependencyType: dep.type, // 'required', 'optional', 'incompatible'
            version: dep.version
          });
        }
      }
    } catch (e) {
      console.warn(`[ModResolver] Failed to check deps for ${mod.name}:`, e);
    }
  }

  return missingDeps;
}

/**
 * Get dependencies for a mod from Modrinth
 */
async function getModDependencies(modrinthId) {
  try {
    const deps = await window.electronAPI.getModDependencies(modrinthId);
    if (!Array.isArray(deps)) return [];
    return deps
      .filter((d) => d.project_id)
      .map((d) => ({
        projectId: d.project_id,
        name: d.project_id,
        type: d.dependency_type || 'required',
        version: d.version_id || 'latest',
      }));
  } catch (e) {
    console.error('[ModResolver] Failed to get dependencies:', e);
    return [];
  }
}

/**
 * Resolve and auto-install dependencies
 */
export async function resolveDependencies(modpackId, modId) {
  const mp = state.modpacks.find(m => m.id === modpackId);
  if (!mp) return { success: false, error: 'Modpack not found' };

  try {
    const deps = await getModDependencies(modId);
    const installed = [];
    const failed = [];

    for (const dep of deps) {
      if (dep.type === 'required' || dep.type === 'optional') {
        try {
          const modData = await window.electronAPI.getModProject(dep.projectId);
          if (!modData) {
            failed.push({ name: dep.projectId, reason: 'Not found' });
            continue;
          }

          const versions = await window.electronAPI.getModVersions(dep.projectId);
          if (!versions || versions.length === 0) {
            failed.push({ name: modData.title, reason: 'No versions available' });
            continue;
          }

          const latestVersion = versions[0];
          const file = latestVersion.files[0];

          if (!file) {
            failed.push({ name: modData.title, reason: 'No download available' });
            continue;
          }

          // Add to modpack
          mp.mods.push({
            modrinthId: dep.projectId,
            name: modData.title,
            version: latestVersion.version_number,
            filename: file.filename,
            downloadUrl: file.url,
            iconUrl: modData.icon_url || ''
          });

          installed.push({
            name: modData.title,
            version: latestVersion.version_number
          });

          // Download the mod
          if (window.electronAPI?.installMod) {
            await window.electronAPI.installMod({
              modpackId: mp.id,
              downloadUrl: file.url,
              filename: file.filename
            });
          }
        } catch (e) {
          console.error('[ModResolver] Failed to install dependency:', e);
          failed.push({ name: dep.projectId, reason: e.message });
        }
      }
    }

    // Save modpack
    localStorage.setItem('idk_modpacks', JSON.stringify(state.modpacks));

    return {
      success: true,
      installed,
      failed,
      message: `Installed ${installed.length} dependencies${failed.length > 0 ? `, ${failed.length} failed` : ''}`
    };
  } catch (e) {
    console.error('[ModResolver] Resolution failed:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Check for incompatible mods
 */
export async function checkIncompatibilities(modpackId) {
  const mp = state.modpacks.find(m => m.id === modpackId);
  if (!mp) return [];

  const incompatibilities = [];
  const mods = mp.mods || [];

  // Common known incompatibilities
  const knownIncompatibilities = [
    { mod1: 'optifine', mod2: 'sodium', reason: 'Both are graphics mods and conflict' },
    { mod1: 'optifine', mod2: 'iris', reason: 'Both are graphics mods and conflict' },
    { mod1: 'sodium', mod2: 'iris', reason: 'Iris requires Sodium, but may have version conflicts' },
    { mod1: 'fabric-api', mod2: 'forge', reason: 'Fabric and Forge are incompatible loaders' }
  ];

  for (const incomp of knownIncompatibilities) {
    const has1 = mods.some(m => m.name.toLowerCase().includes(incomp.mod1));
    const has2 = mods.some(m => m.name.toLowerCase().includes(incomp.mod2));

    if (has1 && has2) {
      incompatibilities.push({
        mod1: incomp.mod1,
        mod2: incomp.mod2,
        reason: incomp.reason,
        severity: 'high'
      });
    }
  }

  return incompatibilities;
}
