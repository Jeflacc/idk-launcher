/**
 * IDK Launcher v2 — Electron main/preload bundler.
 *
 * Why this exists:
 *   `package.json` declares `"type": "module"`, so any `.js` file under the
 *   project is treated as an ES module by Node. But the Electron main process
 *   and preload script are written in TypeScript that compiles to CommonJS
 *   (because Electron's main process still works most cleanly with CJS, and
 *   sandboxed preloads must be CJS). The result was a runtime crash:
 *
 *     ReferenceError: exports is not defined in ES module scope
 *
 *   tsc can't emit `.cjs` directly, so we use esbuild to bundle each entry
 *   point into a single self-contained `.cjs` file. Node/Electron then load
 *   those `.cjs` files as CommonJS regardless of `package.json#type`.
 *
 * Entries:
 *   src/main/index.ts    -> dist-main/main/index.cjs
 *   src/preload/index.ts -> dist-main/preload/index.cjs
 *
 * Usage:
 *   node scripts/build-main.mjs            # one-shot build
 *   node scripts/build-main.mjs --watch    # watch mode (rebuild on change)
 */
import * as esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const isWatch = process.argv.includes('--watch');

const ENTRY_POINTS = [
  {
    src: 'src/main/index.ts',
    out: 'dist-main/main/index.cjs',
    // Electron main process — Node platform, full Node built-ins.
    platform: 'node',
    target: 'node20',
  },
  {
    src: 'src/preload/index.ts',
    out: 'dist-main/preload/index.cjs',
    // Preload runs in a sandboxed renderer-process-like context but is
    // loaded via require() by Electron, so it must be CJS. It still has
    // access to a subset of Node APIs (the `electron` module + `node:*`
    // built-ins exposed via the sandbox).
    platform: 'node',
    target: 'chrome120',
  },
];

const commonOptions = {
  bundle: true,
  format: 'cjs',
  sourcemap: 'linked',
  sourcesContent: false,
  logLevel: 'info',
  // Don't bundle `electron` — it's provided by the runtime.
  external: ['electron'],
  // Don't bundle Node built-ins — they're provided by Node.
  packages: 'external',
  // Preserve `__dirname` / `__filename` semantics for CJS.
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
  alias: {
    '@shared': resolve(projectRoot, 'src/shared'),
    '@domain': resolve(projectRoot, 'src/domain'),
    '@infrastructure': resolve(projectRoot, 'src/infrastructure'),
    '@application': resolve(projectRoot, 'src/application'),
    '@': resolve(projectRoot, 'src'),
  },
};

async function cleanOutputDirs() {
  await rm(resolve(projectRoot, 'dist-main'), { recursive: true, force: true });
  await mkdir(resolve(projectRoot, 'dist-main'), { recursive: true });
}

async function buildOneShot() {
  await cleanOutputDirs();
  for (const entry of ENTRY_POINTS) {
    const outPath = resolve(projectRoot, entry.out);
    await mkdir(dirname(outPath), { recursive: true });
    await esbuild.build({
      ...commonOptions,
      platform: entry.platform,
      target: entry.target,
      entryPoints: [resolve(projectRoot, entry.src)],
      outfile: outPath,
    });
  }
  console.log('[build-main] ✓ bundled main + preload → dist-main/');
}

async function buildWatch() {
  await cleanOutputDirs();
  // Build each entry once up-front, then watch.
  const contexts = [];
  for (const entry of ENTRY_POINTS) {
    const outPath = resolve(projectRoot, entry.out);
    await mkdir(dirname(outPath), { recursive: true });
    const ctx = await esbuild.context({
      ...commonOptions,
      platform: entry.platform,
      target: entry.target,
      entryPoints: [resolve(projectRoot, entry.src)],
      outfile: outPath,
    });
    await ctx.watch();
    contexts.push(ctx);
  }
  console.log('[build-main] watching src/main + src/preload for changes…');

  // Keep alive until Ctrl+C.
  process.on('SIGINT', async () => {
    for (const ctx of contexts) await ctx.dispose();
    process.exit(0);
  });
  await new Promise(() => {});
}

if (isWatch) {
  await buildWatch();
} else {
  await buildOneShot();
}
