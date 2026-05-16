const fs = require('fs');

let src = fs.readFileSync('src/main.js', 'utf8');

src = src.replace(/<h2 class="section-title">Trending on Modrinth<\/h2>[\s\S]*?<div class="news-grid" id="trending-mods-grid">/, 
`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
              <h2 class="section-title" style="margin-bottom:0;">Trending Modpacks</h2>
              <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.489 0H0l2.286 4.5H8.48L6.49 0h-.001zM17.51 0H11.02l1.99 4.5h6.494L17.51 0zM0 6.75l5.614 12.5H9.64L4.025 6.75H0zm19.975 0H15.95L10.337 19.25h4.025L19.975 6.75zm-9.988 0l5.613 12.5H9.988L4.374 6.75h5.613z"/></svg>
                CurseForge
              </span>
            </div>
            <div class="trending-modpacks-grid" id="trending-mods-grid">`);

fs.writeFileSync('src/main.js', src, 'utf8');
console.log('Fixed Trending HTML again');
