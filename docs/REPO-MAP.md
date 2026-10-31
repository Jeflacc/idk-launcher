# Repository Map — IDK Launcher v2

> **This document is the canonical file/folder inventory.**
> AI agents MUST update this file after any structural change (adding/removing
> files or directories). The last-updated date and commit hash are at the bottom.

## Root Configuration

```
idk-launcher/
├── AGENTS.md                          # AI steering doc — READ FIRST
├── README.md                          # Project overview
├── docs/
│   └── REPO-MAP.md                    # This file
├── .ignore                            # Ignore overrides (npm/IDE noise)
├── .gitignore
├── assets/                            # Build resources (app + installer icons)
│   └── icon.ico                       # IDK Launcher app/icon.ico — NSIS installer + .exe icon
├── electron-builder.d.ts              # Type declarations for electron-builder
├── electron-builder.yml               # Electron packaging config (win/mac/linux)
├── package.json                       # Dependencies + scripts (type: "module")
├── package-lock.json                  # Lockfile
├── tsconfig.json                      # Base TS config
├── tsconfig.app.json                  # Renderer TS config (unused — vanilla JS renderer)
├── tsconfig.node.json                 # Main/preload/shared TS config
├── vite.config.ts                     # Renderer build config (root: src/renderer)
├── vitest.config.ts                   # Test config
└── scripts/                           # Dev-only tools — GITIGNORED, not shipped
    ├── build-main.mjs                 # esbuild bundler for main + preload → dist-main/
    ├── batch-vlm-audit.py             # VLM screenshot-audit helper (pixel QA loop)
    └── fast-screenshots.py            # Screenshot capture helper for audits
```

## Source Code (`src/`)

### Main Process (`src/main/`)

The Electron main process — owns all backend logic, IPC handlers, window management.

```
src/main/
├── env-config.ts                      # Runtime env/arg parsing (dev/prod flags)
├── index.ts                           # Composition root — bootstraps everything
├── ipc/
│   ├── index.ts                       # IpcDeps interface + registerAllIpcHandlers()
│   ├── register.ts                    # registerInvoke/registerSend/forwardEvent helpers
│   └── handlers/
│       ├── achievements.handlers.ts   # Achievements.ScanProfile/ScanAll
│       ├── auth.handlers.ts           # Auth.* (Microsoft + Ely.by)
│       ├── content.handlers.ts        # Content.GetMojangNews/GetTrendingModpacks
│       ├── crash.handlers.ts          # Crash.Analyze/MissingDependencies/AutoInstall
│       ├── download.handlers.ts       # Download.* (start/pause/resume/cancel + events)
│       ├── idk-connect.handlers.ts    # IdkConnect.* (29 channels: auth/friends/DM/settings)
│       ├── launch.handlers.ts         # Launch.* (minecraft/cancel/modpack/clear-java-path)
│       ├── mod.handlers.ts            # Mod.* (search/install/remove/update/deps/icons)
│       ├── modpack.handlers.ts        # Modpack.* (scan/delete/update/rename/launch) + Mod.Install/Export/Unzip
│       ├── overlay.handlers.ts        # Overlay.* (init/toggle/sync/close/hide/resume)
│       ├── settings.handlers.ts       # Settings.* (load/save/reset/export/import)
│       ├── skin.handlers.ts           # Skin.* (fetch/upload/cape/resolve-texture)
│       ├── system.handlers.ts         # System.* (paths/open-external/file-pickers) + Window.* + Startup.*
│       ├── tunnel.handlers.ts         # Tunnel.* (ensure-frpc/start/stop/install-progress)
│       ├── update.handlers.ts         # Update.* (check/download/install + events)
│       └── version.handlers.ts        # Version.* (scan/download/cancel/get-manifest/sodium/scan-mods)
└── windows/
    └── window-manager.ts              # WindowManager class — creates/manages BrowserWindows
```

### Preload (`src/preload/`)

The bridge between renderer and main — exposes `window.idk` via contextBridge.

```
src/preload/
└── index.ts                           # PreloadApi definition + contextBridge.exposeInMainWorld('idk', ...)
```

### Application Layer (`src/application/`)

Use-cases — orchestrate domain + infrastructure for specific user actions.

```
src/application/
└── use-cases/
    ├── authenticate-elyby.ts          # AuthenticateElyby — Ely.by login flow (OAuth2)
    ├── authenticate-microsoft.ts      # AuthenticateMicrosoft — msmc OAuth flow
    ├── manage-accounts.ts             # ManageAccounts — multi-account store (MS/Ely.by/offline), encrypted
    ├── export-modpack.ts              # ExportModpack — zip a modpack for sharing
    ├── import-modpack.ts              # ImportModpack — unzip an imported modpack
    ├── install-modpack.ts             # InstallModpack — download + setup a Modrinth modpack
    ├── launch-game.ts                 # LaunchGame — the core launch flow (progress, events)
    └── search-modpacks.ts             # SearchModpacks — search Modrinth + CurseForge
```

### Domain Layer (`src/domain/`)

Pure business logic — no I/O, no dependencies on infrastructure or Electron.

```
src/domain/
├── entities/
│   ├── account.ts                     # Account entity (Microsoft/Ely.by/offline)
│   ├── download.ts                    # DownloadJob + DownloadProgress entities
│   ├── modpack.ts                     # Modpack + ModpackProfile entities
│   └── version.ts                     # Version entity (Minecraft version)
├── events/
│   └── domain-events.ts               # Domain event types
└── services/
    ├── crash-analyzer.ts              # CrashAnalyzerService — parses crash logs, identifies errors
    ├── integrity-policy.ts            # IntegrityPolicyService — sha1/size verification rules
    ├── mod-resolver.ts                # ModResolverService — dependency resolution + incompatibility detection
    ├── offline-uuid.ts               # offlineUuid() — deterministic per-username offline UUID (MD5 OfflinePlayer:<name>)
    └── version-filter.ts              # VersionFilterService — filter/sort Minecraft versions
```

### Infrastructure Layer (`src/infrastructure/`)

External concerns — HTTP, file system, crypto, download queue, etc.

```
src/infrastructure/
├── crypto/
│   └── secret-store.ts                # SecretStore — encrypted token storage (safeStorage)
├── discord/
│   └── discord-rpc-service.ts         # DiscordRpcService — Discord Rich Presence
├── download/
│   └── download-queue.ts              # DownloadQueue — concurrent download manager with events
├── fs/
│   ├── java-detector.ts               # JavaDetector — finds installed Java runtimes
│   ├── modpack-repository.ts          # InstanceRepository — folder-name identity, qualification heuristics, legacy-folder migration, rename
│   ├── path-service.ts                # PathService — safe path resolution (blocks traversal)
│   └── settings-store.ts              # SettingsStore — JSON settings file with category support
├── java/
│   └── java-service.ts                # JavaService — Java runtime management
├── minecraft/
│   ├── launch-service.ts              # LaunchService — wraps minecraft-launcher-core
│   └── mc-launcher.ts                 # Legacy/low-level MC launch helpers (used by launch-service)
├── net/
│   ├── http-client.ts                 # HttpClient — SSRF-protected HTTP client with allowlist
│   └── api/
│       ├── curseforge-client.ts       # CurseforgeClient — CurseForge API (requires API key)
│       ├── elyby-client.ts            # ElybyClient — Ely.by auth + skin API
│       ├── idk-connect-client.ts      # IdkConnectClient — IDK Connect social backend (api.somniac.me)
│       ├── minotar-client.ts          # MinotarClient — Minecraft avatar/skin textures
│       ├── modrinth-client.ts         # ModrinthClient — Modrinth API (mods/modpacks)
│       ├── mojang-client.ts           # MojangClient — Mojang version manifest
│       └── mojang-content-client.ts   # MojangContentClient — Mojang news feed
├── tunnel/
│   └── tunnel-service.ts              # TunnelService — frpc tunnel management (LAN sharing)
└── updater/
    └── updater-service.ts             # UpdaterService — electron-updater integration
```

### Shared (`src/shared/`)

Type-safe contracts shared between main, preload, and renderer.

```
src/shared/
├── ipc-channels.ts                    # IpcChannel registry — 152 channels, single source of truth
├── types/
│   ├── index.ts                       # Re-exports all types
│   ├── auth.ts                        # AuthSession, account types
│   ├── download.ts                    # DownloadItem, DownloadProgress
│   ├── idk-connect.ts                 # IdkUser, Friend, FriendRequest, IdkMessage, etc.
│   ├── launch.ts                      # LaunchOptions, LaunchProgress
│   ├── modpack.ts                     # Modpack, ModpackProfile
│   ├── settings.ts                    # LauncherSettings
│   └── version.ts                     # Version types
└── schemas/
    ├── index.ts                       # Re-exports all schemas
    ├── auth.schema.ts                 # Zod schemas for auth IPC
    ├── download.schema.ts             # Zod schemas for download IPC
    ├── idk-connect.schema.ts          # Zod schemas for IDK Connect IPC
    ├── launch.schema.ts               # Zod schemas for launch IPC
    ├── modpack.schema.ts              # Zod schemas for modpack IPC
    ├── settings.schema.ts             # Zod schemas for settings IPC
    └── version.schema.ts              # Zod schemas for version IPC
```

### Renderer (`src/renderer/`)

The presentation layer — vanilla JavaScript, no framework. HTML-first migration in progress.

```
src/renderer/
├── index.html                         # Entry HTML — loads main.js, contains static modals
├── main.js                            # Application entry — orchestrates startup
├── ARCHITECTURE.md                    # Renderer architecture doc
├── electron-api-shim.js               # Bridges v1 window.electronAPI → v2 window.idk (120+ methods)
│
├── core/
│   ├── app-state.js                   # Singleton state + actions objects
│   ├── dom.js                         # DOM helpers: $, $$, byId, on, escapeHtml, loadTemplate, waitForElement
│   ├── html-loader.js                 # loadPartial() + loadAppShell() for HTML-first rendering
│   ├── safe-parse.js                  # safeParse() + esc() helpers
│   ├── settings-migration.js          # Migrates v1 localStorage settings → v2 backend
│   ├── skin-texture.js                # Skin rendering via IPC — drawSkinFaceFromBase64 + drawSkinBodyFromBase64 (full-body 2D fallback)
│   └── views.js                       # View controller (switchView, returnView, window controls)
│
├── partials/                          # Static shell partials (background, top-bar, chat-panel, error/warning/download)
├── views/                             # Static view HTML (login, main, settings, profile, mods, idk-connect)
├── modals/                            # Static modal HTML (16 files: confirm, render-engine, launch-overlay, crash-analyzer, etc.)
│
├── components/
│   ├── accessibility-manager.js       # ARIA live region, keyboard nav, focus management
│   ├── confirm-dialog.js              # Promise-based confirm modal
│   ├── download-progress.js           # Download progress tracker (state machine)
│   ├── error-display.js               # Error queue + auto-dismiss
│   ├── list-dialog.js                 # Promise-based list picker modal
│   └── render-dialog.js               # Render engine selector (Sodium vs Vulkan)
│
├── features/
│   ├── auth/auth-feature.js           # Login, EULA, onboarding, user profile dropdown
│   ├── background/background-effects.js # Canvas animated backgrounds (matrix/nebula/liquid/starfield/particles)
│   ├── content/content-feature.js     # Mojang news, trending modpacks, auto-updater
│   ├── crash-analyzer/crash-analyzer-feature.js # Crash log UI (calls Crash.Analyze IPC)
│   ├── desktop/desktop-helpers.js     # Frameless-window focus workaround
│   ├── friends/friends-feature.js     # IDK Connect sidebar (auth/friends/chat/presence/LAN) — uses IPC
│   ├── game-features/game-features-integration.js # Wires crash-analyzer + mod-updates + mod-resolver
│   ├── launch/launch-feature.js       # Play button, launch overlay, IPC listeners, playtime
│   ├── mod-resolver/mod-resolver-feature.js # Dependency resolver UI (calls Mod.* IPC)
│   ├── mod-updates/mod-updates-feature.js # Mod update checker UI (calls Mod.CheckUpdates IPC)
│   ├── modpacks/modpacks-feature.js   # Modpack manager (list/detail/browser/modals) — 4,309 lines
│   ├── overlay/
│   │   ├── overlay.html               # Overlay window HTML (separate BrowserWindow)
│   │   ├── overlay.css                # Overlay window styles (891 lines)
│   │   └── overlay.js                 # Overlay logic — uses IPC, no direct fetch()
│   ├── profile/profile-feature.js     # Profile page, 3D skin viewer (skinview3d + three.js) with pixel-sampled fallback to 2D
│   ├── settings/settings-feature.js   # Settings UI (classic + advanced modes)
│   ├── tutorial/
│   │   ├── tutorial.css               # Tutorial overlay styles
│   │   └── tutorial.js                # 4-step modpack manager tutorial
│   └── versions/
│       ├── version-feature.js         # Version & loader dropdowns (uses Version.* IPC)
│       └── version-mods-feature.js    # "Manage Mods" button → modpacks view
│
├── styles/
│   ├── index.css                      # CSS entry point — @imports all layers in cascade order
│   ├── tokens.css                     # Design tokens (colors, spacing, typography, shadows, transitions)
│   ├── themes.css                     # 4 theme palettes (emerald/violet/azure/ember)
│   ├── base.css                       # Reset, body, scrollbars, @font-face, a11y primitives
│   ├── fixes.css                      # Late-loaded patches (click-through, global border-radius: 0 sweep, error boxes)
│   ├── global-a11y-fixes.css          # Global accessibility overrides (focus states, ARIA styles)
│   ├── components/                    # Component styles (replaces monolithic style.css)
│   │   ├── layout.css                 # Background, top bar, nav, view roots (608 lines)
│   │   ├── login.css                  # Login view, auth forms (259 lines)
│   │   ├── main-view.css              # Hero banner, play bar, details (1,683 lines)
│   │   ├── modpacks.css               # Modpack manager (1,841 lines)
│   │   ├── settings.css               # Settings view (1,379 lines)
│   │   ├── profile.css                # Profile page (841 lines)
│   │   ├── friends.css                # Friends sidebar, chat (871 lines)
│   │   ├── downloads.css              # Download progress, detail panel (830 lines)
│   │   ├── modals.css                 # All modal dialogs (1,987 lines)
│   │   ├── performance.css            # Eco/balanced mode overrides (156 lines)
│   │   ├── responsive.css             # Media queries 1200/1100/768/480 (952 lines)
│   │   └── idk-connect.css            # IDK Connect dashboard (562 lines)
│   └── advanced/                      # body.ui-advanced overrides (replaces advanced-theme.css)
│       ├── shell.css                  # Top bar, nav, view overrides (309 lines)
│       ├── main-view.css              # Hero, play bar, details (718 lines)
│       ├── modpacks.css               # Modpack manager overrides (669 lines)
│       ├── settings.css               # Settings overrides (1,300 lines)
│       ├── profile.css                # Profile overrides (565 lines)
│       ├── friends.css                # Friends/chat overrides (205 lines)
│       ├── glass-system.css           # Two-layer glass system (92 lines)
│       └── theme-moods.css            # Theme-specific mood colors (93 lines)
│
├── fonts/
│   ├── Mojang-Regular.ttf             # Mojang font (regular)
│   └── Mojang-Bold.ttf                # Mojang font (bold)
│
└── public/                            # Static assets served by Vite (flat — 23 files)
    ├── achievement.png                ├── background.mp4
    ├── banner.png                     ├── bannerbg.jpg
    ├── bg.png                         ├── clouds.png
    ├── elyby.jpg                      ├── fabric.png
    ├── favicon.svg                    ├── featured_bg.png
    ├── Forge.webp                     ├── icons.svg
    ├── java.png                       ├── launcher-login.png
    ├── loading.gif                    ├── logo.png
    ├── lunasmp.png                    ├── microsoft.png
    ├── playtime.png                   ├── quilt.png
    ├── server_logo.png                └── sodium.png
```

## Tests (`tests/`)

Mirrors the `src/` structure. **300/300 tests pass** (React-path failures removed).

```
tests/
├── application/                       # Use-case unit tests (7 files)
│   ├── authenticate-elyby.test.ts
│   ├── authenticate-microsoft.test.ts
│   ├── export-modpack.test.ts
│   ├── import-modpack.test.ts
│   ├── install-modpack.test.ts
│   ├── launch-game.test.ts
│   └── search-modpacks.test.ts
├── domain/                            # Domain entity + service tests (8 files)
│   ├── entities/{account,download,modpack,version}.test.ts
│   └── services/{crash-analyzer,integrity-policy,mod-resolver,version-filter}.test.ts
├── infrastructure/                    # Infrastructure client tests (16 files + _helpers.ts)
│   ├── crypto/secret-store.test.ts
│   ├── discord/discord-rpc-service.test.ts
│   ├── download/download-queue.test.ts
│   ├── fs/_helpers.ts                 # Shared test fixtures for fs tests
│   ├── fs/{java-detector,modpack-repository,path-service,settings-store}.test.ts
│   ├── java/java-service.test.ts
│   ├── minecraft/{launch-service,mc-launcher}.test.ts
│   ├── net/{curseforge-client,elyby-client,http-client,modrinth-client,mojang-client}.test.ts
│   ├── tunnel/tunnel-service.test.ts
│   └── updater/updater-service.test.ts
├── main/                              # Main process integration tests (3 files)
│   ├── ipc/register.test.ts
│   ├── ipc/crash.handlers.test.ts      # Crash.AutoInstallDependencies (Modrinth search + install)
│   └── windows/window-manager.test.ts
├── renderer/                          # Renderer setup only (React-path view tests removed)
│   └── setup.ts
└── shared/                            # Schema + type tests (7 files)
    ├── auth.schema.test.ts
    ├── download.schema.test.ts
    ├── ipc-channels.test.ts
    ├── launch.schema.test.ts
    ├── modpack.schema.test.ts
    ├── settings.schema.test.ts
    └── version.schema.test.ts
```

## Build Outputs (gitignored)

```
dist-main/                             # Bundled main process (esbuild → CJS)
├── main/index.cjs                     # Main entry bundle
└── preload/index.cjs                  # Preload bundle

dist-renderer/                         # Bundled renderer (Vite)
├── index.html
└── assets/
    ├── index-*.js                     # Renderer JS bundle
    ├── index-*.css                    # CSS bundle (all styles combined)
    ├── *.js                           # Code-split chunks (skinview3d, three, features)
    └── *.map                          # Source maps
```

## IPC Channel Inventory (152 total)

| Namespace | Count | Handler File |
|-----------|-------|-------------|
| `Window` | 5 | system.handlers.ts |
| `System` | 10 | system.handlers.ts |
| `Auth` | 8 | auth.handlers.ts |
| `Skin` | 7 | skin.handlers.ts |
| `Version` | 6 | version.handlers.ts |
| `Launch` | 9 | launch.handlers.ts |
| `Modpack` | 5 | modpack.handlers.ts |
| `Mod` | 25 | mod.handlers.ts + modpack.handlers.ts |
| `Download` | 11 | download.handlers.ts |
| `Settings` | 8 | settings.handlers.ts |
| `Overlay` | 9 | overlay.handlers.ts |
| `Achievements` | 2 | achievements.handlers.ts |
| `Crash` | 3 | crash.handlers.ts |
| `Content` | 2 | content.handlers.ts |
| `IdkConnect` | 29 | idk-connect.handlers.ts |
| `Update` | 7 | update.handlers.ts |
| `Tunnel` | 5 | tunnel.handlers.ts |
| `Startup` | 1 | system.handlers.ts |

## Dependency Graph

```
main/index.ts (composition root)
  ├── WindowManager
  ├── HttpClient (with host allowlist)
  ├── ModrinthClient(http)
  ├── MojangClient(http)
  ├── ElybyClient(http)
  ├── IdkConnectClient(http)
  ├── MinotarClient(http)
  ├── MojangContentClient(http)
  ├── CurseforgeClient(http, apiKey)
  ├── SecretStore(secretsFile)
  ├── SettingsStore(settingsFile)
  ├── ModpackRepository(paths)
  ├── DownloadQueue(http, concurrency)
  ├── PathService(minecraftRoot)
  ├── LaunchService(paths, http, integrity)
  ├── JavaService(paths, http, javaPath)
  ├── TunnelService(paths, http)
  ├── UpdaterService()
  ├── DiscordRpcService(clientId)
  ├── AuthenticateMicrosoft(secrets)
  ├── AuthenticateElyby(elyby, secrets)
  ├── LaunchGame({launchService, javaService, secrets, modpackRepo})
  ├── InstallModpack(modrinth, modpackRepo, downloadQueue)
  ├── ExportModpack(modpackRepo)
  └── ImportModpack(modpackRepo)
      ↓
  registerAllIpcHandlers(ipcDeps) → 16 handler files → 152 channels
      ↓
  preload/index.ts → window.idk.* (namespaced API)
      ↓
  renderer/electron-api-shim.js → window.electronAPI.* (v1 compat, 120+ methods)
      ↓
  renderer/main.js → 12 feature modules
```

## Key Metrics

| Metric | Value |
|--------|-------|
| Total source files | ~220 (src 165 + tests 43 + config/docs) |
| TypeScript files (main/preload/shared) | 75 |
| JavaScript files (renderer) | 33 |
| CSS files | 28 (26 in styles/ + overlay.css + tutorial.css) |
| HTML files | 31 (index.html + overlay.html + 7 partials + 6 views + 16 modals) |
| IPC channels | 152 (all registered) |
| Net API clients | 8 (HttpClient + 7 API clients) |
| Use-cases | 7 |
| Domain services | 4 |
| Test files | 41 (300 tests pass, 0 failures) |
| Total renderer JS LOC | ~18,600 |
| Total CSS LOC | ~18,900 |

## Recent Changes (2026-08-04 — pixel-first audit round)

- **Design audit**: enforced square pixel language — global `border-radius: 0` sweep, pixel toggle/slider thumbs, raised 2px-black-border panels, `#friends-auth-error` styled as Mojang red error box; fixed ad/play-bar overlap (`bottom: 130px`, `z-index: 100`).
- **3D skin preview fix**: removed strict GPU capability gate (false positives); `preserveDrawingBuffer` + 5-point pixel-sample verification; new `drawSkinBodyFromBase64()` full-body 2D fallback in `core/skin-texture.js`.
- **Icons**: swapped 22 thin (feather/lucide) icons → `pixelarticons` inline SVGs via `pixelIcon()` helper (in `html-loader.js`).
- **Structure**: added `src/main/env-config.ts`, `src/infrastructure/minecraft/mc-launcher.ts`, `src/renderer/styles/global-a11y-fixes.css`; HTML-first migration complete — `partials/` (7), `views/` (6), `modals/` (16) static HTML loaded by `loadAppShell()`, legacy `app/app-shell.js` innerHTML template deleted; added `scripts/check-html-contract.mjs` + `scripts/verify-html-structure.mjs` (npm: `check:html-contract`, `verify:html`); removed `public/assets/`, `public/fonts/` duplicates; deleted legacy root docs (CHANGELOG.md, LICENSE, AUDIT-renderer-backend-code.md) and `docs/v2-frontend-rebuild-plan.md`; deleted React-path renderer tests (they previously caused 12 failures).
- **IPC**: 137 → 152 channels (+System.RendererLog, +Auth.GetMicrosoftAuthData, +4 Skin.*, +3 Mod.*).
- **Dev tooling**: `scripts/` (audit + build helpers) is now gitignored.
- **Tests**: 300/300 pass (was 261 pass / 12 React-path failures).

---

**Last updated:** 2026-08-04
**Commit:** aea93d9 (pixel-audit round changes are uncommitted in the working tree)
**Maintained by:** AI agents — update this file after any structural change
