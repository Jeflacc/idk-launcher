import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync, cpSync } from 'node:fs';

// Renderer build. The renderer is v1.6.1's vanilla-JS source (HTML + CSS + JS)
// copied verbatim into src/renderer/. No React, no Tailwind — the design system
// comes entirely from idk-main's CSS.
//
// The main/preload TypeScript is bundled separately by scripts/build-main.mjs.
//
// HTML-first migration: the app shell is loaded at runtime via fetch() from
// partials/, views/, and modals/ (see src/renderer/core/html-loader.js).
// Vite's rollup build only processes index.html as an entry, so these
// directories must be copied into dist-renderer by hand at build time.
function copyHtmlDirs() {
  const root = resolve(__dirname, 'src/renderer');
  const dirs = ['partials', 'views', 'modals'];
  return {
    name: 'copy-html-dirs',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist-renderer');
      for (const dir of dirs) {
        const src = resolve(root, dir);
        if (!existsSync(src)) {
          console.warn(`[vite] skip copy: ${dir} does not exist`);
          continue;
        }
        cpSync(src, resolve(outDir, dir), { recursive: true });
        console.log(`[vite] copied ${dir}/ -> dist-renderer/${dir}/`);
      }
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [copyHtmlDirs()],
  build: {
    outDir: resolve(__dirname, 'dist-renderer'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
