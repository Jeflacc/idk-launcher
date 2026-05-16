const fs = require('fs');
let src = fs.readFileSync('src/main.js', 'utf8');

src = src.replace(/MC 1\.20\.4 A Fabric/g, 'MC 1.20.4 · Fabric');
src = src.replace(/-  Play/g, '▶ Play');
src = src.replace(/dY c Mods/g, '🧩 Mods');
src = src.replace(/dYZ" Resource Packs/g, '🎨 Resource Packs');
src = src.replace(/a\^ Shaders/g, '✨ Shaders');
src = src.replace(/a  Requires Fabric/g, '⚠ Requires Fabric');

fs.writeFileSync('src/main.js', src, 'utf8');
