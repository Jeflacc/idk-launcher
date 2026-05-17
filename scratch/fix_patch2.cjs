const fs = require('fs');
let src = fs.readFileSync('scratch/main_original.js', 'utf8');
const start = src.indexOf('async function mpBrowse(query) {');
const end = src.indexOf('async function mpAddItem(mod, btn, isDependency = false, passedMp = null) {');
const oldCode = src.slice(start, end).trim();

let patch = fs.readFileSync('scratch/patch_all.cjs', 'utf8');
const patchStart = patch.indexOf('const oldMpBrowse =');
const patchEnd = patch.indexOf('const newMpBrowse =');

patch = patch.slice(0, patchStart) + 'const oldMpBrowse = ' + JSON.stringify(oldCode) + ';\n\n' + patch.slice(patchEnd);

fs.writeFileSync('scratch/patch_all.cjs', patch);
