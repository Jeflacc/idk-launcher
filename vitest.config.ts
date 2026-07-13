import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest configuration.
 *
 * - `node` project: domain, shared, infrastructure, application, main, preload.
 *   Runs in the Node environment (Electron modules are mocked per-test).
 *
 * - `renderer` project: reserved for future renderer tests. Currently has
 *   no test files — the renderer is vanilla JS, not React. The setup file
 *   stubs matchMedia, ResizeObserver, and window.idk for when tests are added.
 *
 * Both projects share the same path aliases for `@/*` imports.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@domain': resolve(__dirname, 'src/domain'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
      '@application': resolve(__dirname, 'src/application'),
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/main/index.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'tests/domain/**/*.test.ts',
            'tests/shared/**/*.test.ts',
            'tests/infrastructure/**/*.test.ts',
            'tests/application/**/*.test.ts',
            'tests/main/**/*.test.ts',
            'tests/preload/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'renderer',
          environment: 'jsdom',
          setupFiles: ['./tests/renderer/setup.ts'],
          include: ['tests/renderer/**/*.test.ts'],
        },
      },
    ],
  },
});
