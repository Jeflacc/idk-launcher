# Repository Map — IDK Launcher v2

> **This document is the canonical file/folder inventory.**
> AI agents MUST update this file after any structural change (adding/removing
> files or directories). The last-updated date and commit hash are at the bottom.

## Root Configuration

```
idk-launcher/
├── AGENTS.md                          # AI steering doc — READ FIRST
├── AUDIT-renderer-backend-code.md     # Historical audit of backend code in renderer
├── CHANGELOG.md                       # Version history
├── LICENSE                            # MIT
├── README.md                          # Project overview
├── docs/
│   ├── REPO-MAP.md                    # This file
│   └── v2-frontend-rebuild-plan.md    # 7-phase plan for v2 migration
├── electron-builder.d.ts              # Type declarations for electron-builder
├── electron-builder.yml               # Electron packaging config (win/mac/linux)
├── package.json                       # Dependencies + scripts (type: "module")
├── package-lock.json                  # Lockfile
├── tsconfig.json                      # Base TS config
├── tsconfig.app.json                  # Renderer TS config (unused — vanilla JS renderer)
├── tsconfig.node.json                 # Main/preload/shared TS config
├── vite.config.ts                     # Renderer build config (root: src/renderer)
├── vitest.config.ts                   # Test config
├── scripts/
│   └── build-main.mjs                 # esbuild bundler for main + preload → dist-main/
└── .gitignore
```

## Source Code (`src/`)

### Main Process (`src/main/`)

The Electron main process — owns all backend logic, IPC handlers, window management.

```
src/main/
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
│       ├── idk-connect.handlers.ts    # IdkConnect.* (25+ channels: auth/friends/DM/settings)
│       ├── launch.handlers.ts         # Launch.* (minecraft/cancel/modpack/clear-java-path)
│       ├── mod.handlers.ts            # Mod.* (search/install/remove/update/deps/icons)
│       ├── modpack.handlers.ts        # Modpack.* (scan/delete/update/launch) + Mod.Install/Export/Unzip
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
    ├── authenticate-elyby.ts          # AuthenticateElyby — Ely.by login flow
    ├── authenticate-microsoft.ts      # AuthenticateMicrosoft — msmc OAuth flow
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
│   ├── modpack-repository.ts          # ModpackRepository — CRUD for modpack profiles on disk
│   ├── path-service.ts                # PathService — safe path resolution (blocks traversal)
│   └── settings-store.ts              # SettingsStore — JSON settings file with category support
├── java/
│   └── java-service.ts                # JavaService — Java runtime management
├── minecraft/
│   └── launch-service.ts              # LaunchService — wraps minecraft-launcher-core
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
├── ipc-channels.ts                    # IpcChannel registry — 137 channels, single source of truth
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
├── app/
│   └── app-shell.js                   # 2,206-line innerHTML template (to be replaced by HTML files)
│
├── core/
│   ├── app-state.js                   # Singleton state + actions objects
│   ├── dom.js                         # DOM helpers: $, $$, byId, on, escapeHtml, loadTemplate, waitForElement
│   ├── html-loader.js                 # loadPartial() + loadAppShell() for HTML-first rendering
│   ├── safe-parse.js                  # safeParse() + esc() helpers
│   ├── settings-migration.js          # Migrates v1 localStorage settings → v2 backend
│   ├── skin-texture.js                # Skin rendering via IPC (resolveSkinTextureBase64)
│   └── views.js                       # View controller (switchView, returnView, window controls)
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
│   ├── modpacks/modpacks-feature.js   # Modpack manager (list/detail/browser/modals) — 4,365 lines
│   ├── overlay/
│   │   ├── overlay.html               # Overlay window HTML (separate BrowserWindow)
│   │   ├── overlay.css                # Overlay window styles (891 lines)
│   │   └── overlay.js                 # Overlay logic — uses IPC, no direct fetch()
│   ├── profile/profile-feature.js     # Profile page, 3D skin viewer (skinview3d + three.js)
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
│   ├── fixes.css                      # Late-loaded patches (launch overlay click-through)
│   ├── components/                    # Component styles (replaces monolithic style.css)
│   │   ├── layout.css                 # Background, top bar, nav, view roots (590 lines)
│   │   ├── login.css                  # Login view, auth forms (174 lines)
│   │   ├── main-view.css              # Hero banner, play bar, details (1,421 lines)
│   │   ├── modpacks.css               # Modpack manager (1,802 lines)
│   │   ├── settings.css               # Settings view (965 lines)
│   │   ├── profile.css                # Profile page (803 lines)
│   │   ├── friends.css                # Friends sidebar, chat (1,187 lines)
│   │   ├── downloads.css              # Download progress, detail panel (1,714 lines)
│   │   ├── modals.css                 # All modal dialogs (1,516 lines)
│   │   ├── performance.css            # Eco/balanced mode overrides (95 lines)
│   │   ├── responsive.css             # Media queries 1200/1100/768/480 (621 lines)
│   │   ├── idk-connect.css            # IDK Connect dashboard (401 lines)
│   │   ├── buttons.css                # Button styles (reserved)
│   │   ├── forms.css                  # Form input styles (reserved)
│   │   ├── cards.css                  # Card styles (reserved)
│   │   └── utilities.css              # Utility classes, animations (reserved)
│   └── advanced/                      # body.ui-advanced overrides (replaces advanced-theme.css)
│       ├── shell.css                  # Top bar, nav, view overrides (490 lines)
│       ├── main-view.css              # Hero, play bar, details (661 lines)
│       ├── modpacks.css               # Modpack manager overrides (640 lines)
│       ├── settings.css               # Settings overrides (956 lines)
│       ├── profile.css                # Profile overrides (919 lines)
│       ├── friends.css                # Friends/chat overrides (184 lines)
│       ├── glass-system.css           # Two-layer glass system (86 lines)
│       └── theme-moods.css            # Theme-specific mood colors (88 lines)
│
├── fonts/
│   ├── Mojang-Regular.ttf             # Mojang font (regular)
│   └── Mojang-Bold.ttf                # Mojang font (bold)
│
└── public/                            # Static assets served by Vite
    ├── assets/                        # Organized assets (logos, icons, background video)
    ├── background.mp4                 # Background video
    ├── favicon.svg                    # Favicon
    ├── logo.png                       # Launcher logo
    ├── loading.gif                    # Loading spinner
    ├── microsoft.png                  # Microsoft login icon
    ├── elyby.jpg                      # Ely.by login icon
    ├── Forge.webp                     # Forge loader icon
    ├── fabric.png                     # Fabric loader icon
    ├── quilt.png                      # Quilt loader icon
    ├── sodium.png                     # Sodium mod icon
    ├── java.png                       # Java icon
    ├── banner.png                     # Launcher banner
    ├── bannerbg.jpg                   # Banner background
    ├── bg.png                         # Background image
    ├── clouds.png                     # Cloud texture
    ├── featured_bg.png                # Featured server background
    ├── icons.svg                      # SVG icon sprite
    ├── achievement.png                # Achievement icon
    ├── playtime.png                   # Playtime icon
    ├── launcher-login.png             # Login screen image
    ├── server_logo.png                # Server logo
    ├── lunasmp.png                    # LunaSMP logo
    ├── fonts/                         # Font files (duplicated from src/renderer/fonts/)
    └── fonts/fonts/                   # Nested duplicate (cleanup candidate)
```

## Tests (`tests/`)

Mirrors the `src/` structure. 261 tests pass, 12 pre-existing failures (React-path imports).

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
├── infrastructure/                    # Infrastructure client tests (12 files)
│   ├── crypto/secret-store.test.ts
│   ├── discord/discord-rpc-service.test.ts
│   ├── download/download-queue.test.ts
│   ├── fs/{java-detector,modpack-repository,path-service,settings-store}.test.ts
│   ├── java/java-service.test.ts
│   ├── minecraft/launch-service.test.ts
│   ├── net/{curseforge-client,elyby-client,http-client,modrinth-client,mojang-client}.test.ts
│   ├── tunnel/tunnel-service.test.ts
│   └── updater/updater-service.test.ts
├── main/                              # Main process integration tests
│   ├── ipc/register.test.ts
│   └── windows/window-manager.test.ts
├── renderer/                          # Renderer tests (some pre-existing React-path failures)
│   ├── setup.ts
│   ├── components/{button,card,ui-primitives}.test.tsx
│   ├── features/{crash-analyzer-view,discover-view,friends-view,home-view,modpacks-view,settings-view,versions-view}.test.tsx
│   └── stores/{router-store,session-store}.test.ts
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

## IPC Channel Inventory (137 total)

| Namespace | Count | Handler File |
|-----------|-------|-------------|
| `Window` | 5 | system.handlers.ts |
| `System` | 9 | system.handlers.ts |
| `Auth` | 7 | auth.handlers.ts |
| `Skin` | 6 | skin.handlers.ts |
| `Version` | 6 | version.handlers.ts |
| `Launch` | 9 | launch.handlers.ts |
| `Modpack` | 4 | modpack.handlers.ts |
| `Mod` | 22 | mod.handlers.ts + modpack.handlers.ts |
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
  registerAllIpcHandlers(ipcDeps) → 16 handler files → 137 channels
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
| Total source files | ~120 |
| TypeScript files (main/preload/shared) | 55 |
| JavaScript files (renderer) | 25 |
| CSS files | 29 (24 component + 5 foundation) |
| HTML files | 3 (index.html + overlay.html + app-shell.js template) |
| IPC channels | 137 (all registered) |
| Infrastructure clients | 9 |
| Use-cases | 7 |
| Domain services | 4 |
| Test files | 52 (261 tests pass) |
| Total renderer LOC | ~12,000 (was ~16,000 before backend extraction) |
| Total CSS LOC | ~15,000 (split into 24 modular files) |

---

**Last updated:** 2026-07-10
**Commit:** (updated after each session)
**Maintained by:** AI agents — update this file after any structural change
