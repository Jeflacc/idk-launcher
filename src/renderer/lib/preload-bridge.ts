import type { PreloadApi } from '../../preload';

/**
 * Renderer-side access to the typed preload API. The `window.idk` object is
 * injected by preload's contextBridge. This module gives every renderer
 * module a typed, importable handle instead of reaching for `window` directly.
 *
 * Replaces v1's flat `window.electronAPI` (86 untyped methods).
 */
declare global {
  interface Window {
    idk: PreloadApi;
  }
}

export const api: PreloadApi =
  typeof window !== 'undefined' && window.idk
    ? window.idk
    : (new Proxy({} as PreloadApi, {
        get() {
          throw new Error('preload API not available — running outside Electron');
        },
      }) as PreloadApi);
