const fs = require('fs');
let src = fs.readFileSync('src/main.js', 'utf8');
src = src.replace(/<span> /g, '<span>⬇ ');
fs.writeFileSync('src/main.js', src, 'utf8');
