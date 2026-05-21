import { state } from '../../core/app-state.js';

/**
 * Mod Update Checker Feature
 * Checks for updates on Modrinth and CurseForge
 */

export function initModUpdatesFeature() {
  console.log('[ModUpdates] Feature initialized');
}

/**
 * Check for mod updates across all modpacks
 * Returns array of mods with available updates
 */                                                                                                     
export async function checkModUpdates(modpackId) {
  console.log('[ModUpdates] checkModUpdates called for:', modpackId);
  const mp = state.modpacks.find(m => m.id === modpackId);
  console.log('[ModUpdates] Modpack found:', !!mp, 'Name:', mp?.name);
  
  if (!mp) {
    console.warn('[ModUpdates] Modpack not found');
    return [];
  }

  const updates = [];
  const withModpackContext = item => ({
    ...item,
    modpackMcVersion: mp.mcVersion,
    modpackLoader: mp.loader
  });
  const allMods = [
    ...(mp.mods || []).map(m => withModpackContext({ ...m, type: 'mod' })),
    ...(mp.resourcepacks || []).map(r => withModpackContext({ ...r, type: 'resourcepack' })),
    ...(mp.shaders || []).map(s => withModpackContext({ ...s, type: 'shader' }))
  ];

  console.log('[ModUpdates] Total items to check:', allMods.length, '(mods:', mp.mods?.length, 'rp:', mp.resourcepacks?.length, 'shaders:', mp.shaders?.length, ')');

  for (const item of allMods) {
    try {
      const update = await checkSingleModUpdate(item, mp);
      if (update) {
        console.log('[ModUpdates] Update found:', update.name, update.currentVersion, '->', update.latestVersion);
        updates.push(update);
      }
    } catch (e) {
      console.warn(`[ModUpdates] Failed to check update for ${item.name}:`, e);
    }
  }

  console.log('[ModUpdates] Total updates found:', updates.length);
  return updates;
}

/**
 * Check if a single mod has an update available
 */
async function checkSingleModUpdate(item) {
  try {
    const modName = extractProjectSearchName(item);
    const currentVersion = getCurrentVersion(item);
    
    if (!modName || modName.length < 2) {
      console.log('[ModUpdates] Skipping', item.name, '- could not extract mod name');
      return null;
    }
    
    console.log('[ModUpdates] Checking', item.name, 'extracted name:', modName, 'current version:', currentVersion);
    
    const project = isLikelyModrinthProjectRef(item.modrinthId)
      ? { project_id: item.modrinthId, title: item.name || modName }
      : await findModrinthProject(item, modName);
    if (!project) return null;

    const projectId = project.project_id || project.id || project.slug;
    console.log('[ModUpdates] Found project:', project.title, 'project_id:', projectId);
    
    const versions = await fetchProjectVersions(projectId, item);
    console.log('[ModUpdates] Got versions for', item.name, '- count:', versions.length);
    
    if (!Array.isArray(versions) || versions.length === 0) {
      console.warn('[ModUpdates] No versions found for', item.name);
      return null;
    }

    // Get the latest version
    const latest = versions[0];
    const latestVersion = latest.version_number;
    const latestFile = latest.files?.find(f => f.primary) || latest.files?.[0];
    console.log('[ModUpdates] Latest version for', item.name, ':', latestVersion, 'Current:', currentVersion);

    if (!latestVersion || !latestFile?.url || !latestFile?.filename) {
      console.warn('[ModUpdates] No downloadable version in latest version for', item.name);
      return null;
    }

    if (isSameInstalledFile(item.filename, latestFile.filename) || versionsAreEquivalent(currentVersion, latestVersion, item)) {
      console.log('[ModUpdates] No update for', item.name, '- versions match');
      return null;
    }

    if (currentVersion) {
      console.log('[ModUpdates] UPDATE AVAILABLE:', item.name, currentVersion, '->', latestVersion);
      return {
        name: project.title,
        filename: item.filename,
        currentVersion: currentVersion || 'Unknown',
        latestVersion: latestVersion,
        latestFilename: latestFile.filename,
        downloadUrl: latestFile.url,
        modrinthId: projectId,
        iconUrl: item.iconUrl || project.icon_url || '',
        installedItem: item,
        type: item.type,
        hasUpdate: true,
        changelog: latest.changelog || 'No changelog available'
      };
    }
  } catch (e) {
    console.warn(`[ModUpdates] Error checking ${item.name}:`, e);
  }

  return null;
}

export async function installModUpdate(modpackId, update) {
  const mp = state.modpacks.find(m => m.id === modpackId);
  if (!mp) throw new Error('Modpack not found');
  if (!window.electronAPI) throw new Error('Desktop install API is not available');
  if (!update?.downloadUrl || !update?.latestFilename) throw new Error('Update is missing download metadata');

  const target = getUpdateTarget(update.type);
  const list = mp[target.listKey] || [];
  const index = findInstalledItemIndex(list, update);
  if (index === -1) throw new Error('Installed item was not found in this modpack');

  const previous = list[index];
  await window.electronAPI[target.installApi]({
    modpackId: mp.id,
    downloadUrl: update.downloadUrl,
    filename: update.latestFilename
  });

  if (previous.filename && previous.filename !== update.latestFilename) {
    await window.electronAPI[target.removeApi]({
      modpackId: mp.id,
      filename: previous.filename
    });
  }

  list[index] = {
    ...previous,
    modrinthId: update.modrinthId || previous.modrinthId,
    name: update.name || previous.name,
    version: update.latestVersion,
    filename: update.latestFilename,
    downloadUrl: update.downloadUrl,
    iconUrl: update.iconUrl || previous.iconUrl || ''
  };

  mp[target.listKey] = list;
  localStorage.setItem('idk_modpacks', JSON.stringify(state.modpacks));
  return list[index];
}

async function findModrinthProject(item, modName) {
  const params = new URLSearchParams({
    query: modName,
    limit: '5'
  });
  const facets = buildSearchFacets(item);
  if (facets.length) params.set('facets', JSON.stringify(facets));

  const searchRes = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`);
  if (!searchRes.ok) {
    console.warn('[ModUpdates] Search failed for', modName, '- status:', searchRes.status);
    return null;
  }

  const searchData = await searchRes.json();
  if (!searchData.hits || searchData.hits.length === 0) {
    console.log('[ModUpdates] No search results for', modName);
    return null;
  }

  return pickBestProjectMatch(searchData.hits, modName);
}

function buildSearchFacets(item) {
  const facets = [];
  if (item.type === 'mod') {
    facets.push(['project_type:mod']);
    const loader = getLoader(item);
    if (loader) facets.push([`categories:${loader}`]);
  } else if (item.type === 'resourcepack') {
    facets.push(['project_type:resourcepack']);
  } else if (item.type === 'shader') {
    facets.push(['project_type:shader']);
  }

  const mcVersion = getMinecraftVersion(item);
  if (mcVersion) facets.push([`versions:${mcVersion}`]);
  return facets;
}

function buildVersionsUrl(projectId, item) {
  const params = new URLSearchParams();
  const mcVersion = item.versionFilter || getMinecraftVersion(item);
  const loader = getLoader(item);

  if (mcVersion) params.set('game_versions', JSON.stringify([mcVersion]));
  if (item.type === 'mod' && loader) params.set('loaders', JSON.stringify([loader]));

  const query = params.toString();
  return `https://api.modrinth.com/v2/project/${projectId}/version${query ? `?${query}` : ''}`;
}

async function fetchProjectVersions(projectId, item) {
  const versions = await requestProjectVersions(projectId, item);
  if (versions.length > 0) return versions;

  const mcVersion = getMinecraftVersion(item);
  const majorMinor = mcVersion.split('.').slice(0, 2).join('.');
  if (majorMinor && majorMinor !== mcVersion) {
    return requestProjectVersions(projectId, { ...item, versionFilter: majorMinor });
  }

  return versions;
}

async function requestProjectVersions(projectId, item) {
  // Modrinth uses the singular "/version" route for a project's version list.
  const res = await fetch(buildVersionsUrl(projectId, item));
  if (!res.ok) {
    console.warn('[ModUpdates] API error for', item.name, '- status:', res.status);
    return [];
  }

  const versions = await res.json();
  return Array.isArray(versions) ? versions : [];
}

function getMinecraftVersion(item) {
  const version = item.mcVersion || item.modpackMcVersion;
  return isMinecraftVersion(version) ? version : '';
}

function getLoader(item) {
  const loader = (item.loader || item.modpackLoader || '').toLowerCase();
  return ['fabric', 'forge', 'neoforge', 'quilt'].includes(loader) ? loader : '';
}

function extractProjectSearchName(item) {
  let name = stripMinecraftFormatting(item.name || item.filename || '');
  if (!name && item.filename) name = item.filename;
  name = name.replace(/\.(jar|zip)$/i, '');
  name = name.replace(/[_-](forge|fabric|quilt|neoforge)([_-].*)?$/i, '');
  name = name.replace(/[_-]mc\d+\.\d+(?:\.\d+)?/i, '');
  name = name.replace(/[_-]v?\d+\.\d+(?:\.\d+)?(?:[-+._][a-z0-9.]+)*$/i, '');
  name = name.replace(/\+.*$/i, '');
  return name.replace(/[_-]+/g, ' ').trim();
}

function getCurrentVersion(item) {
  const stored = stripMinecraftFormatting(item.version || '');
  const source = stripMinecraftFormatting(item.filename || item.name || '').replace(/\.(jar|zip)$/i, '');
  const filenameVersion = extractBestVersionCandidate(source, item);

  if (filenameVersion && (!stored || stored === 'Unknown' || isCompatibilityOnlyVersion(stored, item))) {
    return filenameVersion;
  }

  if (stored && stored !== 'Unknown') return stored;
  return filenameVersion;
}

function pickBestProjectMatch(hits, modName) {
  const wanted = normalizeName(modName);
  const exact = hits.find(hit => normalizeName(hit.title) === wanted || normalizeName(hit.slug) === wanted);
  if (exact) return exact;

  const partial = hits.find(hit => {
    const title = normalizeName(hit.title);
    const slug = normalizeName(hit.slug);
    return wanted.length >= 4 && (title.includes(wanted) || slug.includes(wanted) || wanted.includes(title));
  });

  if (!partial) {
    console.log('[ModUpdates] Search results did not confidently match', modName);
  }

  return partial || null;
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeVersion(value) {
  return String(value || '').toLowerCase().replace(/^v/, '').trim();
}

function stripMinecraftFormatting(value) {
  return String(value || '').replace(/\u00a7[0-9a-fk-or]/gi, '').trim();
}

function extractBestVersionCandidate(source, item) {
  const candidates = [...source.matchAll(/(?:^|[-+_\s])v?(\d+\.\d+(?:\.\d+)*(?:[-+._][a-z0-9]+(?:\.[a-z0-9]+)*)?)/gi)]
    .map(match => match[1])
    .filter(candidate => !isCompatibilityOnlyVersion(candidate, item));

  if (candidates.length === 0) return '';
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function isCompatibilityOnlyVersion(version, item) {
  const normalized = stripMinecraftFormatting(version).toLowerCase().replace(/^mc/, '').replace(/^minecraft/, '');
  const mcVersion = getMinecraftVersion(item);
  const mcMajorMinor = mcVersion.split('.').slice(0, 2).join('.');
  return normalized === mcVersion || normalized === mcMajorMinor;
}

function isMinecraftVersion(version) {
  return /^\d+\.\d+(?:\.\d+)?$/.test(String(version || ''));
}

function isLikelyModrinthProjectRef(value) {
  const ref = String(value || '').trim();
  if (!ref || ref.startsWith('override-')) return false;
  if (/^\d+$/.test(ref)) return false;
  if (/^[a-f0-9]{40}$/i.test(ref)) return false;
  return true;
}

function getUpdateTarget(type) {
  if (type === 'resourcepack') {
    return { listKey: 'resourcepacks', installApi: 'installResourcepack', removeApi: 'removeResourcepack' };
  }
  if (type === 'shader') {
    return { listKey: 'shaders', installApi: 'installShader', removeApi: 'removeShader' };
  }
  return { listKey: 'mods', installApi: 'installMod', removeApi: 'removeMod' };
}

function findInstalledItemIndex(list, update) {
  const filename = update.filename || update.installedItem?.filename;
  const modrinthId = update.installedItem?.modrinthId || update.modrinthId;
  let index = list.findIndex(item => filename && item.filename === filename);
  if (index !== -1) return index;
  index = list.findIndex(item => modrinthId && item.modrinthId === modrinthId);
  return index;
}

function isSameInstalledFile(currentFilename, latestFilename) {
  return normalizeFileName(currentFilename) === normalizeFileName(latestFilename);
}

function versionsAreEquivalent(currentVersion, latestVersion, item) {
  const current = normalizeComparableVersion(currentVersion, item);
  const latest = normalizeComparableVersion(latestVersion, item);
  return !!current && !!latest && current === latest;
}

function normalizeComparableVersion(version, item) {
  const mcVersion = getMinecraftVersion(item);
  const mcMajorMinor = mcVersion.split('.').slice(0, 2).join('.');
  return stripMinecraftFormatting(version)
    .toLowerCase()
    .replace(/\.(jar|zip)$/i, '')
    .replace(/^v(?=\d)/, '')
    .split(/[-+_\s]+/)
    .filter(token => {
      const clean = token.replace(/^mc/, '').replace(/^minecraft/, '');
      if (!clean) return false;
      if (['fabric', 'forge', 'neoforge', 'quilt', 'all'].includes(clean)) return false;
      if (mcVersion && clean === mcVersion) return false;
      if (mcMajorMinor && clean === mcMajorMinor) return false;
      return true;
    })
    .join('-')
    .replace(/^v(?=\d)/, '');
}

function normalizeFileName(filename) {
  return stripMinecraftFormatting(filename)
    .toLowerCase()
    .replace(/\.(jar|zip)$/i, '');
}

/**
 * Get changelog for a mod update
 */
export async function getModChangelog(modrinthId) {
  try {
    const res = await fetch(`https://api.modrinth.com/v2/project/${modrinthId}`);
    if (!res.ok) return null;

    const data = await res.json();
    return {
      name: data.title,
      description: data.description,
      body: data.body,
      updated: data.updated,
      downloads: data.downloads,
      followers: data.followers
    };
  } catch (e) {
    console.error('[ModUpdates] Failed to get changelog:', e);
    return null;
  }
}

/**
 * Format version string for display
 */
export function formatVersion(version) {
  if (!version) return 'Unknown';
  // Remove common prefixes
  return version.replace(/^v/, '').substring(0, 20);
}
