const fs = require('fs');
let src = fs.readFileSync('src/main.js', 'utf8');

// 1. Declare currentProvider if not already declared properly
if (!src.includes('let currentProvider =')) {
  src = src.replace('let browserMode = \'mod\';', 'let browserMode = \'mod\';\nlet currentProvider = \'modrinth\';');
}

// 2. Fix the "Browse Modpacks" listener
src = src.replace(
  /document.getElementById\('provider-text'\)[\s\S]*?\/\/ optional, just an idea/,
  `document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('pill-curseforge')?.classList.add('active');`
);

// 3. Replace the old dropdown logic
const oldDropdownStart = 'const providerDropdown = document.getElementById(\'provider-dropdown\');';
const oldDropdownEnd = 'let mpSearchTimeout;';

const startIdx = src.indexOf(oldDropdownStart);
const endIdx = src.indexOf(oldDropdownEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const providerPills = document.querySelectorAll('.provider-pill');
providerPills.forEach(pill => {
  pill.addEventListener('click', () => {
    providerPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentProvider = pill.getAttribute('data-provider');
    mpBrowse(document.getElementById('mod-search').value);
  });
});\n\n`;
  
  src = src.substring(0, startIdx) + replacement + src.substring(endIdx);
}

fs.writeFileSync('src/main.js', src, 'utf8');
console.log('JS fixed.');
