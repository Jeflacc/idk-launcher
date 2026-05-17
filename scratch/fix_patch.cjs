const fs = require('fs');

const src = fs.readFileSync('scratch/main_original.js', 'utf8');

const startStr = 'async function mpBrowse(query) {';
const endStr = 'async function mpAddItem';

const startIdx = src.indexOf(startStr);
const endIdx = src.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find boundaries.");
    process.exit(1);
}

const oldCode = src.slice(startIdx, endIdx).trim();

let patch = fs.readFileSync('scratch/patch_all.cjs', 'utf8');

const varStart = patch.indexOf('const oldMpBrowse = `');
const varEnd = patch.indexOf('const newMpBrowse = `');

if (varStart === -1 || varEnd === -1) {
    console.error("Could not find var boundaries in patch_all.");
    process.exit(1);
}

let escapedCode = oldCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

patch = patch.slice(0, varStart) + 'const oldMpBrowse = `\\n' + escapedCode + '\\n`;\\n\\n' + patch.slice(varEnd);

fs.writeFileSync('scratch/patch_all.cjs', patch);
console.log("Successfully fixed patch_all.cjs oldMpBrowse string");
