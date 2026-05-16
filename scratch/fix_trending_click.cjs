const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

const targetRegex = /<div class="trending-mp-card" onclick="openBrowser\('modpack'\)" style="cursor:pointer;">/g;

if (targetRegex.test(src)) {
  src = src.replace(targetRegex, `<div class="trending-mp-card" onclick="browserMode='modpack'; mpAddItem({ project_id: '\${mp.id.toString()}', title: '\${mp.name.replace(/'/g, \\\\\\'')}', provider: 'curseforge' }, this);" style="cursor:pointer;">`);
  fs.writeFileSync('src/main.js', src, 'utf8');
  console.log("Fixed onclick handler.");
} else {
  console.log("Target not found.");
}
