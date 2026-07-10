# AI Steering Document — IDK Launcher v2

> **READ THIS FIRST.** This document is the canonical guide for any AI agent
> working on this repository. It contains the architectural rules, constraints,
> and context needed to make correct changes. Do not edit any file until you
> have read this document completely.

## Quick Reference

| What | Where |
|------|-------|
| **Project** | IDK Launcher v2.0.0 — Electron + TypeScript Minecraft launcher |
| **Branch** | `v2-rewrite` |
| **Node** | >= 20 |
| **Build** | `npm run build` (tsc + esbuild for main, Vite for renderer) |
| **Dev** | `npm run dev` (concurrent main + vite + electron) |
| **Test** | `npm test` (vitest) |
| **Entry** | `src/main/index.ts` (main process), `src/renderer/main.js` (renderer) |
| **IPC Contract** | `src/shared/ipc-channels.ts` — single source of truth |
| **Repo Map** | `docs/REPO-MAP.md` — complete file/folder inventory |

## Architecture Rules (NON-NEGOTIABLE)

### 1. Backend Code Belongs in the Backend

The renderer (`src/renderer/`) is a **presentation layer only**. It must NOT contain:

- `fetch()` calls to external APIs (Mojang, Modrinth, CurseForge, api.somniac.me, minotar.net, etc.)
- JWT/token handling (tokens live in `SecretStore`, encrypted, never cross IPC)
- Business logic (crash analysis, mod version comparison, dependency resolution)
- `atob()`/`btoa()` calls (base64 decoding is server-side)
- Direct file-system access (all disk operations go through IPC)
- `localStorage` as a database (settings go through `SettingsStore` via IPC)

**If a feature needs backend logic, add an IPC channel + handler + use-case.**

### 2. IPC Architecture

Every renderer ↔ main communication goes through the typed IPC surface:

```
renderer (window.idk.*) → preload (ipcRenderer.invoke) → main (ipcMain.handle) → use-case → infrastructure
```

- **Channel registry:** `src/shared/ipc-channels.ts` — every channel is declared here
- **Types:** `src/shared/types/*.ts` — typed payloads
- **Schemas:** `src/shared/schemas/*.ts` — zod validation for every IPC payload
- **Handlers:** `src/main/ipc/handlers/*.ts` — one file per domain
- **Preload:** `src/preload/index.ts` — bridges `window.idk.*` to IPC

**Never use `ipcRenderer.send/invoke` directly in the renderer.** Always go through the preload bridge.

### 3. CSS Architecture

The CSS uses a **layered cascade** loaded via `src/renderer/styles/index.css`:

```
styles/index.css
  ├── tokens.css          Foundation: CSS custom properties (colors, spacing, etc.)
  ├── themes.css          4 theme palettes (emerald/violet/azure/ember)
  ├── base.css            Reset, body, scrollbars, fonts, a11y
  ├── components/*.css    16 component files (layout, login, modpacks, etc.)
  ├── advanced/*.css      8 body.ui-advanced override files
  └── fixes.css           Late-loaded patches
```

**Rules:**
- Never use raw CSS values — always reference a token from `tokens.css`
- Component styles go in `styles/components/`, not in monolithic files
- `body.ui-advanced` overrides go in `styles/advanced/`
- The cascade order in `index.css` is load-bearing — do not reorder imports

### 4. Electron API Shim

The renderer expects `window.electronAPI` (v1 flat API). The shim at
`src/renderer/electron-api-shim.js` bridges this to `window.idk` (v2 namespaced API).

- The shim maps ~120 v1 method names to v2 IPC channels
- Unmapped methods get no-op stubs with console warnings
- **When adding a new IPC channel, also add a shim mapping** so the renderer can call it

### 5. HTML-First (In Progress)

The renderer is migrating from JS-generated HTML (`innerHTML = \`…\``) to real HTML files:

- `src/renderer/core/html-loader.js` — loads HTML partials via `fetch()` + `DOMParser`
- `src/renderer/core/dom.js` — `loadTemplate()` for `<template>` elements with `data-ref`
- Goal: delete `src/renderer/app/app-shell.js` (2,206-line innerHTML template)
- New views go in `src/renderer/views/*.html`, modals in `src/renderer/modals/*.html`

**Do not add new `innerHTML = \`…\`` assignments.** Use `loadTemplate()` or `loadPartial()` instead.

### 6. Dependency Injection

The main process uses explicit DI in `src/main/index.ts`:

```typescript
const http = new HttpClient(allowlist);
const modrinth = new ModrinthClient(http);
const idkConnect = new IdkConnectClient(http);
// ...
const ipcDeps: IpcDeps = { windows, http, modrinth, idkConnect, ... };
registerAllIpcHandlers(ipcDeps);
```

- No service locator, no globals
- Every handler receives its dependencies explicitly
- Infrastructure clients are constructed once and shared

## File Organization

### Where things go

| Layer | Directory | Pattern |
|-------|-----------|---------|
| **Main process** | `src/main/` | `windows/`, `ipc/handlers/` |
| **Preload** | `src/preload/` | Single `index.ts` exposing `window.idk` |
| **Application use-cases** | `src/application/use-cases/` | One class per use-case |
| **Domain** | `src/domain/` | `entities/`, `services/`, `events/` |
| **Infrastructure** | `src/infrastructure/` | `net/api/`, `fs/`, `crypto/`, `download/`, etc. |
| **Shared types/schemas** | `src/shared/` | `types/`, `schemas/`, `ipc-channels.ts` |
| **Renderer** | `src/renderer/` | `core/`, `components/`, `features/`, `styles/` |
| **Tests** | `tests/` | Mirrors `src/` structure |

### Naming conventions

- **Files:** `kebab-case.ts` for TypeScript, `kebab-case.js` for JS, `kebab-case.css` for CSS
- **Classes:** `PascalCase` (e.g., `ModrinthClient`, `DownloadQueue`)
- **IPC channels:** `domain:action` (e.g., `idk-connect:get-friends`, `mod:install`)
- **CSS classes:** `kebab-case` with BEM for modifiers (e.g., `.confirm-modal-content--danger`)
- **CSS tokens:** `--category-role` (e.g., `--color-accent`, `--space-8`, `--transition-base`)

## Build & Test

```bash
# Install dependencies
npm install

# Build everything (main + renderer)
npm run build

# Build main process only
npm run build:main

# Dev mode (concurrent main + vite + electron)
npm run dev

# Run tests
npm test

# Typecheck
npm run typecheck

# Lint
npm run lint
```

### Build outputs

- `dist-main/` — bundled main process (esbuild → CJS)
- `dist-renderer/` — bundled renderer (Vite)
- `dist/` — electron-builder output (packaged app)

### Test structure

- `tests/application/` — use-case unit tests
- `tests/domain/` — entity + service tests
- `tests/infrastructure/` — infrastructure client tests
- `tests/main/ipc/` — IPC handler integration tests
- `tests/renderer/` — renderer component tests (some pre-existing React-path failures)
- `tests/shared/` — schema + type tests

## Security Constraints

1. **HTTPS only** — `HttpClient` refuses HTTP URLs (except localhost for dev)
2. **SSRF allowlist** — `DEFAULT_HOST_ALLOWLIST` in `http-client.ts` restricts which hosts can be fetched
3. **Encrypted secrets** — `SecretStore` uses Electron `safeStorage` (OS keychain)
4. **Path traversal blocked** — `PathService.modpackDirectory()` validates modpack IDs
5. **IPC sender validation** — every handler checks `windows.assertSender(event, 'main')`
6. **Zod validation** — every IPC payload is validated before the handler runs

## When You Edit This Repo

1. **Read this document first** — it contains the rules
2. **Read the repo map** (`docs/REPO-MAP.md`) — it shows where things are
3. **Check the worklog** (`/home/z/my-project/worklog.md`) — see what previous agents did
4. **After your work, update:**
   - `docs/REPO-MAP.md` if you added/removed files
   - `src/shared/ipc-channels.ts` if you added IPC channels
   - `src/preload/index.ts` if you added IPC channels
   - `src/renderer/electron-api-shim.js` if you added IPC channels
   - This steering doc if architectural rules changed
5. **Run `npm run build && npm test` before committing** — verify nothing broke

## Common Tasks

### Adding a new IPC channel

1. Add the channel to `src/shared/ipc-channels.ts` under the appropriate namespace
2. Add the zod schema to `src/shared/schemas/*.ts`
3. Add the type to `src/shared/types/*.ts`
4. Create the handler in `src/main/ipc/handlers/*.ts`
5. Register it in `src/main/ipc/index.ts`
6. Expose it in `src/preload/index.ts` under `window.idk.*`
7. Add the shim mapping in `src/renderer/electron-api-shim.js`
8. Add a test in `tests/main/ipc/` or `tests/shared/ipc-channels.test.ts`

### Adding a new infrastructure client

1. Create `src/infrastructure/net/api/<name>-client.ts`
2. Add the host to `DEFAULT_HOST_ALLOWLIST` in `http-client.ts`
3. Inject it in `src/main/index.ts` and pass to the handler that needs it
4. Add a test in `tests/infrastructure/`

### Adding a new renderer feature

1. Create `src/renderer/features/<feature>/<feature>-feature.js`
2. Export an `init<Feature>Feature()` function
3. Import + init it in `src/renderer/main.js` in the correct order
4. Use IPC calls (`window.electronAPI.*`) — never direct `fetch()`
5. Use `loadTemplate()` for repeated HTML — never `innerHTML = \`…\``
6. Add CSS to `src/renderer/styles/components/<feature>.css`
