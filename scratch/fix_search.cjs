const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

// Replace the CurseForge fetch section in mpBrowse
const target = `      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=\${classId}&searchFilter=\${encodeURIComponent(query)}\${gameVerStr}&pageSize=20\`);
      data = await res.json();
    }
    results.innerHTML = '';
    if (!data.hits || data.hits.length === 0) {`;

const replacement = `      const res = await fetch(\`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=\${classId}&searchFilter=\${encodeURIComponent(query)}\${gameVerStr}&pageSize=20\`);
      const cfData = await res.json();
      data = {
        hits: (cfData.data || []).map(mod => ({
          project_id: mod.id.toString(),
          title: mod.name,
          description: mod.summary,
          icon_url: mod.logo ? mod.logo.thumbnailUrl : '',
          downloads: mod.downloadCount,
          follows: 0,
          provider: 'curseforge'
        }))
      };
    }
    results.innerHTML = '';
    if (!data.hits || data.hits.length === 0) {`;

if (src.includes('const res = await fetch(`https://api.curse.tools/v1/cf/mods/search?gameId=432&classId=${classId}&searchFilter=${encodeURIComponent(query)}${gameVerStr}&pageSize=20`);')) {
    src = src.replace(target, replacement);
    fs.writeFileSync('src/main.js', src, 'utf8');
    console.log("Replaced CurseForge data mapping.");
} else {
    console.log("Could not find target.");
}
