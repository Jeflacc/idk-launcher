import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Renderer build. The renderer is v1.6.1's vanilla-JS source (HTML + CSS + JS)
// copied verbatim into src/renderer/. No React, no Tailwind — the design system
// comes entirely from idk-main's CSS.
//
// The main/preload TypeScript is bundled separately by scripts/build-main.mjs.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
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
