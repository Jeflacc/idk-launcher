# Renderer Architecture

This document describes the architecture of the IDK Launcher renderer
(`src/renderer/`), a vanilla-JS Electron renderer process.

## Overview

The renderer is a **vanilla JavaScript** application — no React, no framework,
no build-time transpilation beyond Vite's ES module bundling. All DOM is
generated at runtime by `app/app-shell.js`, which injects a single large HTML
template into `#app`. Feature modules then query the DOM by ID/class and bind
event listeners.

## Directory Structure

```
src/renderer/
├── index.html              # Entry HTML — loads main.js, contains static modals
├── main.js                 # Application entry point — orchestrates startup
├── electron-api-shim.js    # Bridges v1 window.electronAPI → v2 window.idk
│
├── styles/                 # CSS architecture (layered, imported via index.css)
│   ├── index.css           #   Entry point — @imports all layers in cascade order
│   ├── tokens.css          #   Design tokens (colors, spacing, typography, etc.)
│   ├── themes.css          #   4 theme palettes (emerald/violet/azure/ember)
│   ├── base.css            #   Reset, body, scrollbars, fonts, a11y primitives
│   └── fixes.css           #   Late-loaded patches (launch overlay click-through)
│
├── style.css               # Main component & feature stylesheet
├── advanced-theme.css      # body.ui-advanced mode overrides (cyberpunk shell)
│
├── app/
│   └── app-shell.js        # Renders the entire DOM into #app (single template)
│
├── core/                   # Shared utilities and state
│   ├── app-state.js        #   Singleton `state` + `actions` objects
│   ├── safe-parse.js       #   safeParse() + esc() HTML-escape helpers
│   ├── dom.js              #   $, $$, byId, on, escapeHtml, fromHtml, waitForElement
│   ├── settings-migration.js # Migrates v1 localStorage → v2 backend settings
│   ├── skin-texture.js     #   Minecraft skin URL resolution + canvas rendering
│   └── views.js            #   View controller (switchView, returnView tracking)
│
├── components/             # Reusable UI components (singleton pattern)
│   ├── confirm-dialog.js   #   Promise-based confirm modal
│   ├── list-dialog.js      #   Promise-based list picker modal
│   ├── render-dialog.js    #   Render engine selector (Sodium vs Vulkan)
│   ├── download-progress.js #  Download progress tracker (state machine)
│   ├── error-display.js    #   Error queue + auto-dismiss
│   └── accessibility-manager.js # ARIA live region, keyboard nav, focus rings
│
├── features/               # Feature modules (init pattern, one per UI area)
│   ├── auth/               #   Login, EULA, user profile dropdown
│   ├── settings/           #   Settings UI (classic + advanced modes)
│   ├── versions/           #   Version & loader dropdowns
│   ├── launch/             #   Play button, launch overlay, IPC listeners
│   ├── modpacks/           #   Modpack manager (list, detail, browser, modals)
│   ├── content/            #   News, trending modpacks, auto-updater
│   ├── friends/            #   IDK Connect sidebar (auth, chat, LAN)
│   ├── profile/            #   Profile page, 3D skin viewer
│   ├── crash-analyzer/     #   Crash log parser (pure logic)
│   ├── mod-updates/        #   Mod update checker (pure logic)
│   ├── mod-resolver/       #   Dependency resolver (pure logic)
│   ├── game-features/      #   Integration layer for above 3 features
│   ├── tutorial/           #   4-step modpack manager tutorial
│   ├── overlay/            #   In-game overlay window (separate BrowserWindow)
│   ├── background/         #   Canvas-based animated backgrounds (5 effects)
│   └── desktop/            #   Frameless-window focus workaround
│
├── fonts/                  # Mojang font files (Regular + Bold)
└── public/                 # Static assets (images, icons, video)
```

## CSS Architecture

The CSS uses a **layered cascade** loaded via `styles/index.css`:

```
styles/index.css
  ├── 1. tokens.css          Foundation: all CSS custom properties
  ├── 2. themes.css          Theme palette overrides ([data-theme="X"])
  ├── 3. base.css            Reset, body, scrollbars, fonts, a11y
  ├── 4. style.css           All component & feature styles
  ├── 5. advanced-theme.css  body.ui-advanced overrides
  └── 6. fixes.css           Late patches (launch overlay GPU fix)
```

### Design Tokens (`styles/tokens.css`)

All design decisions flow through CSS custom properties. Never use raw
literals in component styles — always reference a token.

| Token category   | Examples                              |
|------------------|---------------------------------------|
| `--color-*`      | `--color-bg-app`, `--color-text-main` |
| `--danger-*`     | `--danger-50` … `--danger-800`        |
| `--surface-*`    | `--surface-0` … `--surface-14`        |
| `--space-*`      | `--space-1` (2px) … `--space-20` (40px) |
| `--text-*`       | `--text-xs` (9px) … `--text-7xl` (32px) |
| `--font-*`       | `--font-main`, `--font-title`, `--font-body` |
| `--radius-*`     | `--radius-sm` (4px), `--radius-base` (var) |
| `--shadow-*`     | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| `--transition-*` | `--transition-fast` (0.15s), `--transition-base` (0.2s) |
| `--ease-*`       | `--ease-standard`, `--ease-emphasized` |
| `--layout-*`     | `--layout-top-bar-height`, sidebar widths |
| `--z-*`          | `--z-modal`, `--z-toast`               |

Theme-variant tokens (redefined per `[data-theme]`):
- `--theme-bg`, `--theme-bg-panel`, `--theme-bg-card`
- `--theme-accent`, `--theme-accent-hover`, `--theme-accent-bright`
- `--theme-accent-shadow`, `--theme-accent-dark`, `--theme-accent-text`
- `--theme-accent-rgb`, `--theme-accent-glow-rgb`, `--theme-stage-grid-rgb`

### Adding a New Component Style

1. Add the CSS rule to `style.css` under the appropriate section header.
2. Use design tokens — never hardcode colors, spacing, or transitions.
3. If the component has an `advanced` mode variant, add the override to
   `advanced-theme.css` scoped under `body.ui-advanced`.
4. If the rule patches a rendering issue that must load last, add it to
   `styles/fixes.css`.

## JavaScript Architecture

### Module Patterns

**Entry point** (`main.js`):
- Imports CSS via `styles/index.css`
- Runs settings migration
- Renders app shell
- Dynamically imports + initializes all features in order

**Core utilities** (`core/`):
- Pure functions or singletons, no side effects on import
- Exported as named exports

**Components** (`components/`):
- Singleton classes instantiated at module load (`downloadProgressTracker`,
  `accessibilityManager`, `errorDisplay`)
- Or pure async functions (`showConfirmDialog`, `showListDialog`)

**Features** (`features/`):
- Each exports an `initXxxFeature({ switchView, ... })` function
- Init runs once at startup, wires DOM listeners + IPC handlers
- Pure logic features (crash-analyzer, mod-updates, mod-resolver) export
  async functions without an init

### Shared State

```js
// core/app-state.js
export const state = { /* ~30 properties, loaded from localStorage */ };
export const actions = {};  // Populated by features at init time
window.IdkApp = { state, actions };  // Debug hook
```

Features read/write `state.*` directly. Cross-feature communication uses
either `actions.xxx()` calls or CustomEvents.

### Custom Events

| Event             | Dispatched by    | Listened by                    |
|-------------------|------------------|--------------------------------|
| `idk:view-changed`| `core/views.js`  | tutorial, profile, settings, friends, modpacks |
| `versions-loaded` | `version-feature`| modpacks-feature               |
| `reload-content`  | `launch-feature` | content-feature                |

### Initialization Order

```
1. auth          → populates state.currentUser, state.authMode
2. settings      → applies theme tokens to :root
3. versions      → dispatches 'versions-loaded' (async)
4. version-mods  → monkey-patches actions.renderVersions
5. launch        → registers IPC listeners
6. modpacks      → sets actions.modpacks namespace
7. content       → fetches news/trending
8. desktop       → frameless-window workaround
9. friends       → sets actions.updateFriendsAuthUI
10. profile      → sets actions.openProfile
11. game-features → wires crash-analyzer, mod-updates, mod-resolver
12. background   → reads body[data-bg-effect]
```

### IPC Bridge

The renderer expects `window.electronAPI` (v1 flat API, ~75 methods).
`electron-api-shim.js` bridges this to `window.idk` (v2 namespaced API)
at startup. Unmapped methods get no-op stubs with console warnings.

### DOM Helpers (`core/dom.js`)

```js
import { $, $$, byId, on, escapeHtml, fromHtml, waitForElement } from "../core/dom.js";

const btn = byId("my-button");           // getElementById
const tabs = $$(".tab");                 // querySelectorAll → array
const off = on(btn, "click", handler);   // returns remover function
const safe = escapeHtml(userInput);      // XSS-safe
```

## Refactoring Notes

This architecture was refactored from a disorganized state with:
- 4 CSS files with no clear layering (`style.css`, `advanced-theme.css`,
  `launch-overlay-fix.css`, `idk-connect.css`)
- 3× duplicated `.sr-only` definitions
- 2× duplicated `prefers-reduced-motion` and `prefers-contrast` blocks
- 4× duplicated "TWO-LAYER GLASS SYSTEM" blocks in advanced-theme.css
- 541 lines of dead code (`settings-ui.js`)
- 130-line inline settings migration in `main.js`
- 21 inline `style="..."` attributes in `index.html`

The refactor established the layered CSS architecture, extracted shared
utilities, and eliminated duplication while preserving exact visual parity.
