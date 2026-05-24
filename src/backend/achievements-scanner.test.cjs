const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  scanProfileAchievements,
  collectFromAdvancementsFile,
  collectFromStatsFile,
} = require('./achievements-scanner.cjs');

describe('achievements-scanner', () => {
  it('deduplicates the same advancement across two worlds', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'idk-ach-'));
    const worldA = path.join(root, 'saves', 'WorldA', 'advancements');
    const worldB = path.join(root, 'saves', 'WorldB', 'advancements');
    fs.mkdirSync(worldA, { recursive: true });
    fs.mkdirSync(worldB, { recursive: true });

    const advancement = {
      'minecraft:story/mine_stone': { done: true },
      'minecraft:recipes/decorations/crafting_table': { done: true },
    };
    fs.writeFileSync(path.join(worldA, 'player1.json'), JSON.stringify(advancement));
    fs.writeFileSync(path.join(worldB, 'player1.json'), JSON.stringify(advancement));

    const result = scanProfileAchievements(root);
    assert.strictEqual(result.count, 1);
    assert.deepStrictEqual(result.advancements, ['minecraft:story/mine_stone']);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it('counts legacy achievement keys from stats', () => {
    const completed = new Set();
    collectFromStatsFile({ 'achievement.openInventory': 1 }, completed);
    assert.strictEqual(completed.size, 1);
    assert.ok(completed.has('achievement.openInventory'));
  });

  it('ignores incomplete advancements', () => {
    const completed = new Set();
    collectFromAdvancementsFile({
      'minecraft:story/root': { done: false },
      'minecraft:story/mine_stone': { done: true },
    }, completed);
    assert.strictEqual(completed.size, 1);
  });
});
