# Agent Steering — IDK Launcher

## Project Overview

IDK Launcher is an Electron-based Minecraft client manager with a glassmorphic UI.
Tech stack: Vite + Vanilla JS/CSS frontend, Electron + Context Bridge backend.
Current version: 1.5.5 (package.json).

## Architecture

### Main Process
- `electron-main.cjs` — Main process: IPC handlers, launch logic, auto-updater, frpc, skin loading, Discord RPC, modpack import/export, auth (Ely.by OAuth + Microsoft), version scanning, download queue, overlay window management
- `preload.cjs` — Context bridge exposing IPC to renderer
- `image-worker.cjs` — Worker thread for image caching

### Renderer Bootstrap
- `src/main.js` — Renderer entry: loads settings from backend, renders shell, creates view controller, dynamically imports all feature modules

### App Shell
- `src/app/app-shell.js` — Full HTML shell (all views, modals, settings panels)

### Core
- `src/core/app-state.js` — Shared mutable renderer state and cross-feature actions
- `src/core/views.js` — View controller (switchView, getReturnView, initWindowControls)
- `src/core/safe-parse.js` — Safe JSON parsing helpers
- `src/core/skin-texture.js` — Skin texture loading and avatar rendering helpers

### Components (Reusable UI)
- `src/components/accessibility-manager.js` — WCAG focus management and screen reader hints
- `src/components/confirm-dialog.js` — Glassmorphic in-app confirm dialog (replaces native confirm())
- `src/components/download-progress.js` — Download progress UI component
- `src/components/error-display.js` — User-friendly error overlay with stack trace
- `src/components/settings-ui.js` — Settings panel with categories, search, form inputs

### Features (`src/features/`)
- `auth/auth-feature.js` — Login, Ely.by OAuth, Microsoft auth, profile display, avatar loading, skin viewer
- `background/background-effects.js` — Canvas background effects (particles, etc.)
- `content/content-feature.js` — Modpack management, marketplace, Mojang news, trending modpacks, update checks, top navigation transitions
- `crash-analyzer/crash-analyzer-feature.js` — Crash log parsing, common error detection, fix suggestions
- `desktop/desktop-helpers.js` — Electron focus/click-through helpers
- `friends/friends-feature.js` — IDK Connect: friends system, real-time chat, friend requests, LAN share via frpc, search, settings, profile panel
- `game-features/game-features-integration.js` — Integrates crash analyzer, mod updates, and dependency resolver into UI modals
- `launch/launch-feature.js` — Play flow, launch IPC listeners, launch overlay, warnings, playtime
- `mod-resolver/mod-resolver-feature.js` — Mod dependency detection via Modrinth API and auto-install
- `mod-updates/mod-updates-feature.js` — Mod update checking on Modrinth and CurseForge
- `modpacks/modpacks-feature.js` — Modpack profiles, import/export, installed items, browsing
- `overlay/overlay.html` + `overlay.js` + `overlay.css` — In-game overlay (borderless fullscreen, Shift+Tab toggle)
- `profile/profile-feature.js` — User profile page with 3D skin viewer, achievements, playtime
- `settings/settings-feature.js` — Settings, blur, font scale, themes, background effects, Java path, memory, JVM args
- `tutorial/tutorial.js` + `tutorial.css` — First-run tutorial system
- `versions/version-feature.js` — Minecraft version and loader selection
- `versions/version-mods-feature.js` — Manage mods for vanilla versions (install, remove, browse)

### Backend Modules (`src/backend/`)
- `achievements-scanner.cjs` — Scans save files for completed advancements
- `download-integration.cjs` — Download integration helpers
- `download-ipc-handlers.cjs` — Download-related IPC handlers
- `download-queue-manager.cjs` — Parallel download queue with concurrency limits
- `game-detector.cjs` — Detects installed Minecraft versions and loaders
- `integrity-verifier.cjs` — File integrity verification
- `performance-monitor.cjs` — Performance monitoring
- `settings-manager.cjs` — Persistent settings via settings.json on disk

### Styles
- `src/style.css` — All styles (~10k lines), CSS variables for theming
- `src/advanced-theme.css` — Advanced mode theme overrides
- `src/launch-overlay-fix.css` — Overlay positioning fixes
- `src/features/overlay/overlay.css` — Overlay-specific styles
- `src/features/tutorial/tutorial.css` — Tutorial-specific styles

## Key Conventions

- All UI is vanilla JS, no frameworks. HTML is inlined in `app-shell.js`.
- CSS uses CSS custom properties (`--theme-*`, `--accent-*`) for theming.
- IPC channel names use flat dash-separated names (e.g., `launch-minecraft`, `install-mod`, `window-minimize`).
- Backend modules in `src/backend/` handle Java, auth, skins, frpc.
- Tests are local-only, gitignored, run with `vitest`.

## Code Style

- No comments in code unless explicitly requested.
- Use `const`/`let`, never `var`.
- Keep functions focused and small.
- Prefer editing existing files over creating new ones.
- All Electron IPC goes through `preload.cjs`.

## Available MCP Tools

### 21st.dev Magic
- `21st_magic_component_builder` — Build new UI components (buttons, cards, modals, forms)
- `21st_magic_component_inspiration` — Get design inspiration for existing components
- `21st_magic_component_refiner` — Redesign/improve existing UI components
- `21st_magic_logo_search` — Search for company logos (Discord, GitHub, etc.)

### Playwright Browser
- Full browser automation: navigate, click, type, screenshot, evaluate JS
- Use for testing UI changes visually, checking responsive behavior

### GitHub
- Create/update issues, PRs, comments
- Search code, repos, issues
- Manage releases and branches

### Filesystem
- Read/write/edit files within the project directory

## Workflow Rules

1. **Before editing CSS**: Check if a CSS variable already exists for the property.
2. **Before creating new files**: Check if existing files can be extended.
3. **After changes**: Run `npm run build` to verify no build errors.
4. **UI changes**: Use 21st.dev tools to find/build polished components.
5. **Never push** without asking the user first.
6. **Never add comments** unless asked.
7. **Test locally**: Run `npm run test` and `npm run build` before committing.

## Testing

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run build         # Verify build
npm run dev:electron  # Full dev mode with Electron
```

## Git Rules

- GitHub repo forbids merge commits on `idk-main` — all pushes must fast-forward.
- Write concise commit messages matching repo style.
- Never commit secrets or API keys.
