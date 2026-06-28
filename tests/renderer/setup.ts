import '@testing-library/jest-dom/vitest';

/**
 * Renderer test setup. Runs in jsdom before each renderer test file.
 *
 * - Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Stubs matchMedia (jsdom doesn't implement it)
 * - Stubs ResizeObserver (jsdom doesn't implement it; skinview3d uses it)
 * - Provides a fake window.idk preload bridge so renderer code that calls
 *   `api.*` doesn't blow up; individual tests override the methods they need.
 */

if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Provide a minimal preload API stub. Tests override specific methods.
type AnyFn = (...args: unknown[]) => unknown;
const makeStub = (): Record<string, AnyFn> =>
  new Proxy({} as Record<string, AnyFn>, {
    get: () => (..._args: unknown[]) => Promise.resolve(undefined),
  });

if (typeof window !== 'undefined') {
  const stub = {
    window: makeStub(),
    system: makeStub(),
    auth: makeStub(),
    launch: makeStub(),
    modpack: makeStub(),
    download: makeStub(),
    settings: makeStub(),
    version: makeStub(),
    skin: makeStub(),
    tunnel: makeStub(),
    update: makeStub(),
  };
  Object.defineProperty(window, 'idk', {
    value: stub,
    writable: true,
    configurable: true,
  });
}
