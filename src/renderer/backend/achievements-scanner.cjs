/**
 * Scans Minecraft profile directories for completed advancements / legacy achievements.
 * Each advancement ID is counted at most once per profile (across worlds and player UUIDs).
 */
const fs = require('fs');
const path = require('path');

const RECIPE_ADVANCEMENT_PREFIXES = [
  'minecraft:recipes/',
  'minecraft:recipe/',
];

function isRecipeAdvancement(advancementId) {
  const id = String(advancementId).toLowerCase();
  return RECIPE_ADVANCEMENT_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/**
 * Modern advancements: top-level keys are advancement IDs with { done: true }.
 */
function collectFromAdvancementsFile(data, completed) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;

  for (const [advancementId, entry] of Object.entries(data)) {
    if (advancementId === 'DataVersion' || advancementId === 'version') continue;
    if (!entry || typeof entry !== 'object') continue;
    if (entry.done !== true) continue;
    if (isRecipeAdvancement(advancementId)) continue;
    completed.add(advancementId);
  }
}

/**
 * Legacy achievements (pre-1.12): keys like achievement.openInventory in stats JSON.
 */
function collectFromStatsFile(data, completed) {
  if (!data || typeof data !== 'object') return;

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('achievement.') && (value === true || value === 1 || (typeof value === 'number' && value > 0))) {
        completed.add(key);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };

  visit(data);
}

function readJsonFile(filePath) {
  try {
    let raw = fs.readFileSync(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function scanJsonDirectory(dirPath, collector, parseFn) {
  if (!fs.existsSync(dirPath)) return;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const data = readJsonFile(path.join(dirPath, entry.name));
    if (data) parseFn(data, collector);
  }
}

function scanWorldFolder(worldPath, completed) {
  scanJsonDirectory(path.join(worldPath, 'advancements'), completed, collectFromAdvancementsFile);
  scanJsonDirectory(path.join(worldPath, 'stats'), completed, collectFromStatsFile);
}

function scanProfileFolderInternal(profilePath, completed) {
  if (!profilePath || !fs.existsSync(profilePath)) return;

  const savesPath = path.join(profilePath, 'saves');
  if (fs.existsSync(savesPath)) {
    let worlds;
    try {
      worlds = fs.readdirSync(savesPath, { withFileTypes: true });
    } catch {
      worlds = [];
    }

    for (const world of worlds) {
      if (!world.isDirectory()) continue;
      if (world.name === 'DEBUG' || world.name.startsWith('.')) continue;
      scanWorldFolder(path.join(savesPath, world.name), completed);
    }
  }

  // Some installs keep stats at profile root (older layouts)
  scanJsonDirectory(path.join(profilePath, 'stats'), completed, collectFromStatsFile);
  scanJsonDirectory(path.join(profilePath, 'advancements'), completed, collectFromAdvancementsFile);
}

/**
 * @param {string} profilePath - Modpack / version game directory (contains saves/)
 * @returns {{ count: number, advancements: string[] }}
 */
function scanProfileAchievements(profilePath) {
  const completed = new Set();
  scanProfileFolderInternal(profilePath, completed);
  const advancements = [...completed].sort();
  return { count: advancements.length, advancements };
}

function scanAllAchievements(rootPath) {
  const completed = new Set();
  if (!rootPath || !fs.existsSync(rootPath)) {
    return { count: 0, advancements: [] };
  }

  // 1. Scan root path itself
  scanProfileFolderInternal(rootPath, completed);

  // 2. Scan all subdirectories of profiles/
  const profilesPath = path.join(rootPath, 'profiles');
  if (fs.existsSync(profilesPath)) {
    try {
      const dirs = fs.readdirSync(profilesPath, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          scanProfileFolderInternal(path.join(profilesPath, d.name), completed);
        }
      }
    } catch (e) {
      console.warn('[Achievements] Error reading profiles directory:', e.message);
    }
  }

  // 3. Scan all subdirectories of versions/
  const versionsPath = path.join(rootPath, 'versions');
  if (fs.existsSync(versionsPath)) {
    try {
      const dirs = fs.readdirSync(versionsPath, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          scanProfileFolderInternal(path.join(versionsPath, d.name), completed);
        }
      }
    } catch (e) {
      console.warn('[Achievements] Error reading versions directory:', e.message);
    }
  }

  const advancements = [...completed].sort();
  return { count: advancements.length, advancements };
}

/**
 * Resolve launcher profile folder from modpack id or MC version id.
 */
function resolveProfilePath(rootPath, { modpackId, versionId } = {}) {
  if (!rootPath) return null;

  if (modpackId) {
    const id = String(modpackId).replace(/^modpack-/, '');
    return path.join(rootPath, 'profiles', `modpack-${id}`);
  }

  if (versionId) {
    return path.join(rootPath, 'profiles', String(versionId));
  }

  return null;
}

module.exports = {
  scanProfileAchievements,
  scanAllAchievements,
  resolveProfilePath,
  isRecipeAdvancement,
  collectFromAdvancementsFile,
  collectFromStatsFile,
};
