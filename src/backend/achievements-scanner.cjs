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

/**
 * @param {string} profilePath - Modpack / version game directory (contains saves/)
 * @returns {{ count: number, advancements: string[] }}
 */
function scanProfileAchievements(profilePath) {
  const completed = new Set();

  if (!profilePath || !fs.existsSync(profilePath)) {
    return { count: 0, advancements: [] };
  }

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
  resolveProfilePath,
  isRecipeAdvancement,
  collectFromAdvancementsFile,
  collectFromStatsFile,
};
