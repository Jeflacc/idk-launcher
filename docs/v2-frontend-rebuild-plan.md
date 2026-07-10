# v2 Frontend Rebuild Plan — v1.6.3 Feature Parity + Backend Extraction + HTML-First

This plan implements three directives:

1. **Port all v1.6.1 → v1.6.3 features into v2** — the IDK Connect web dashboard
   (OAuth, friends, DMs, settings, URL routing, skin rendering).
2. **Remove all backend code from the renderer** — no `fetch()` to external APIs,
   no JWT handling, no business logic, no file-system access, no `atob()` decoding.
   Everything goes through IPC → v2 main process → infrastructure layer.
3. **Replace JS-generated HTML with HTML files** — eliminate the 2,206-line
   `app-shell.js` `innerHTML` template and the 53 `innerHTML = \`…\`` assignments
   across 12 files. Use static `.html` files + small, targeted DOM updates.

Organized into 7 phases. Each phase is independently shippable.

---

## Current State Summary

### What v1.6.3 added (the "IDK Connect" feature set)

A new **Cloudflare Pages web dashboard** (`landing-page/`) with:
- Auth: login/register/OTP/2FA + OAuth (Discord + Google)
- Friends: list, requests, search, add/remove
- DMs: chat with 3-second polling
- Settings: bio, change username, change password, delete account, link OAuth
- URL routing: `?u=` (profile), `?c=` (chat), `?tab=` (view)
- Skin rendering: canvas-based Minecraft face + ely.by CORS proxy + Steve fallback
- Minecraft account linking (display-only on web; linking happens in desktop launcher)

The dashboard talks to a self-hosted Node.js/Express backend at `https://api.somniac.me`.

### What's wrong with the v2 renderer today

1. **The renderer IS a backend.** 27+ direct `fetch()` calls to `api.somniac.me`
   (plaintext HTTP!), 23+ to Modrinth, 8+ to CurseForge, plus Mojang/minotar/ely.by.
   JWTs stored in `localStorage`. `atob()` JWT decoding. OTP/2FA state machine.
   Crash analysis. Dependency resolution. Version comparison. File-system mirroring.
   **~12,000 LOC of backend logic in the renderer.**

2. **`overlay.js` duplicates ~500 lines of `friends-feature.js`** — same auth,
   same friends list, same chat, same tunnel, same skin rendering.

3. **`app-shell.js` is a 2,206-line `innerHTML = \`…\`` template** that generates
   the entire launcher DOM at runtime. Plus 53 more `innerHTML` assignments across
   12 files. No IDE support, no syntax highlighting, XSS-prone, unmaintainable.

4. **12 IPC channels declared but unregistered** — mod install, resourcepack
   install, crash missing-deps, overlay sync, etc. all silently no-op.

5. **The v2 backend has the right building blocks but they're not wired:**
   `CrashAnalyzerService`, `ModResolverService`, `VersionFilterService`,
   `ModrinthClient`, `CurseforgeClient`, `ElybyClient`, `MojangClient`,
   `SecretStore`, `ModpackRepository`, `SettingsStore` — all exist, none are
   connected to IPC for the features the renderer needs.

---

## Phase 1 — v2 Backend: IDK Connect Infrastructure

**Goal:** Create the infrastructure client + IPC handlers + use-cases for IDK Connect
so the renderer never needs to call `api.somniac.me` directly.

### 1.1 New infrastructure client: `IdkConnectClient`

**File:** `src/infrastructure/net/api/idk-connect-client.ts`

Wraps all `api.somniac.me` calls. Uses `HttpClient` (enforces SSRF allowlist + HTTPS).
Token management is NOT in this client — the caller (use-case) passes the token;
the client attaches the `Authorization: Bearer` header.

Methods:
- Auth: `requestOtp`, `register`, `login`, `verify2fa`, `getMe`, `loginWithMinecraft`
- OAuth: `getDiscordOAuthUrl(linkToken?)`, `getGoogleOAuthUrl(linkToken?)`, `completeOAuth(session, username)`
- Settings: `updateProfile`, `changeUsername`, `changePassword`, `deleteAccount`
- Users: `searchUsers`, `getUserProfile`
- Friends: `getFriends`, `getFriendRequests`, `sendFriendRequest`, `handleFriendRequest`, `removeFriend`
- Messages: `getMessages`, `sendMessage`
- Presence: `sendPresence`
- Skins: `fetchElybySkin(username)` (CORS proxy)

**Action items:**
- Add `https://api.somniac.me` to `HttpClient`'s allowlist.
- Add `https://launchercontent.mojang.com`, `https://minotar.net`, `https://skinsystem.ely.by`, `https://api.curse.tools` to the allowlist.
- **Require HTTPS** — refuse `http://api.somniac.me:6040`.

### 1.2 New IPC channels (`IdkConnect.*` namespace)

```typescript
IdkConnect: {
  RequestOtp, Register, Login, Verify2fa, GetMe, LoginWithMinecraft,
  GetDiscordOAuthUrl, GetGoogleOAuthUrl, CompleteOAuth,
  UpdateProfile, ChangeUsername, ChangePassword, DeleteAccount,
  SearchUsers, GetUserProfile,
  GetFriends, GetFriendRequests, SendFriendRequest, HandleFriendRequest, RemoveFriend,
  GetMessages, SendMessage,
  SendPresence,
  GetStoredToken, StoreToken, ClearToken,  // token lives in SecretStore
}
```

### 1.3 New IPC handler

**File:** `src/main/ipc/handlers/idk-connect.handlers.ts`

Each handler:
1. Reads the token from `SecretStore` (not passed by the renderer).
2. Calls the corresponding `IdkConnectClient` method.
3. Returns the result; never leaks the token to the renderer.

**Exception:** `Login`, `Register`, `Verify2fa`, `LoginWithMinecraft`, `CompleteOAuth`
return a token. The handler stores it in `SecretStore` immediately and returns only
`{ success: true, user: … }` — the token never crosses the IPC boundary.

### 1.4 New use-cases

- `authenticate-idk-connect.ts` — orchestrates OTP → register → login → 2FA
- `auto-login-with-minecraft.ts` — pulls MC session from `SecretStore`, calls `loginWithMinecraft`
- `link-minecraft-account.ts` — calls `IdkConnectClient.linkMinecraft` after MC auth

### 1.5 Shared types + schemas

**Files:** `src/shared/types/idk-connect.ts`, `src/shared/schemas/idk-connect.schema.ts`

Define `IdkUser`, `IdkUserProfile`, `Friend`, `FriendRequest`, `Message` types
+ zod validation schemas.

### 1.6 Wire it all up

- Register the handler in `src/main/ipc/register.ts`
- Expose in `src/preload/index.ts` under `window.idk.idkConnect.*`
- Add temporary shim mappings in `electron-api-shim.js` during renderer migration

---

## Phase 2 — v2 Backend: Mod + Content + Crash Infrastructure

**Goal:** Wire up the 12 unregistered IPC channels + new endpoints so the renderer
can delete all its Modrinth/CurseForge/Mojang `fetch()` calls.

### 2.1 New IPC channels

```typescript
Mod: {
  Search, GetProject, GetVersions, GetDependencies,
  InstallFromBrowser, Remove,
  InstallResourcepack, RemoveResourcepack,
  InstallShader, RemoveShader,
  ExtractIcon, ImportExternalFiles,
  DownloadCurseforgeModpack, DownloadModrinthModpack,
}
Content: { GetMojangNews, GetTrendingModpacks }
Crash: { Analyze, MissingDependencies, AutoInstallDependencies }
Skin: { FetchElybySkin, FetchMinotarSkin, ResolveSkinTexture, ResolveCapeTexture }
Version: { GetManifest, GetSodiumVersions }
```

### 2.2 New use-cases

- `check-mod-updates.ts` — uses `ModrinthClient.getVersions` + `VersionFilterService`
- `install-mod-update.ts` — `ModrinthClient` + `DownloadQueue` + `ModpackRepository`
- `get-mod-changelog.ts` — `ModrinthClient.getProject`
- `resolve-mod-dependencies.ts` — wraps existing `ModResolverService`
- `scan-missing-dependencies.ts` — wraps `ModResolverService.scanMissing`
- `check-incompatibilities.ts` — wraps `ModResolverService.checkIncompatibilities`
- `analyze-crash.ts` — wraps existing `CrashAnalyzerService`
- `search-mods.ts` — `ModrinthClient.searchMods` + `CurseforgeClient.searchModpacks`
- `install-mod-from-browser.ts` — single mod install into existing modpack
- `import-curseforge-modpack.ts` — full CurseForge modpack import flow
- `resolve-skin-texture.ts` — `ElybyClient` (extended) + `MinotarClient`
- `get-mojang-news.ts` — new `MojangContentClient`
- `get-trending-modpacks.ts` — `CurseforgeClient.searchModpacks`

### 2.3 New infrastructure clients

- `minotar-client.ts` — `fetchSkin(name)`, `fetchAvatar(name, size)`
- `mojang-content-client.ts` — `getNews()`

### 2.4 Extend existing clients

- `ElybyClient` — add `fetchSkinTextureUrl(username)` (does `atob()` server-side) + `fetchSkinBase64(username)`
- `ModrinthClient` — add `getDependencies(projectId)`
- `CurseforgeClient` — confirm `searchModpacks` signature

### 2.5 Register all handlers

Update `mod.handlers.ts`, `crash.handlers.ts`, new `content.handlers.ts`, `skin.handlers.ts`, `version.handlers.ts`.

### 2.6 Test the backend

Unit tests in `tests/application/`, integration tests in `tests/main/ipc/`.

---

## Phase 3 — Renderer: HTML-First Shell

**Goal:** Replace `app-shell.js` (2,206-line `innerHTML` template) with real HTML
files. The launcher uses static HTML + small JS modules that query + update elements.

### 3.1 New HTML structure

```
src/renderer/
├── index.html                  # Entry — loads main.js, contains #app + modal containers
├── views/
│   ├── login.html              # #view-login content
│   ├── main.html               # #view-main content
│   ├── mods.html               # #view-mods content
│   ├── settings.html           # #view-settings content
│   ├── profile.html            # #view-profile content
│   └── idk-connect.html        # #view-idk-connect content (NEW dashboard)
├── partials/
│   ├── top-bar.html            # Window chrome + nav tabs
│   ├── play-bar.html           # Bottom play button + version dropdown
│   ├── friends-sidebar.html    # IDK Connect sidebar (shared with overlay)
│   ├── modpacks-sidebar.html   # Modpack list sidebar
│   └── background.html         # Video + overlay + effects canvas
└── modals/
    ├── confirm-dialog.html
    ├── list-dialog.html
    ├── render-engine-modal.html
    ├── delete-modpack-modal.html
    ├── mp-create-modal.html
    ├── mp-settings-modal.html
    ├── mp-all-versions-modal.html
    ├── dl-confirm-modal.html
    ├── download-detail-panel.html
    ├── error-modal.html
    ├── update-modal.html
    ├── missing-deps-modal.html
    ├── mod-updates-modal.html
    ├── changelog-modal.html
    ├── crash-analyzer-modal.html
    ├── dependencies-modal.html
    ├── skin-3d-modal.html
    ├── launch-overlay.html
    └── launch-mini-indicator.html
```

### 3.2 HTML loader

**File:** `src/renderer/core/html-loader.js`

```javascript
export async function loadPartial(containerSelector, partialPath) {
  const container = document.querySelector(containerSelector);
  const response = await fetch(partialPath);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  container.replaceChildren(...doc.body.childNodes);
}

export async function loadAppShell() {
  await Promise.all([
    loadPartial("#background-layer", "partials/background.html"),
    loadPartial("#top-bar-container", "partials/top-bar.html"),
    loadPartial("#view-login", "views/login.html"),
    loadPartial("#view-main", "views/main.html"),
    loadPartial("#view-mods", "views/mods.html"),
    loadPartial("#view-settings", "views/settings.html"),
    loadPartial("#view-profile", "views/profile.html"),
    loadPartial("#view-idk-connect", "views/idk-connect.html"),
    loadPartial("#modals", "modals/all-modals.html"),
  ]);
}
```

### 3.3 Refactor `main.js`

```javascript
// Before:
import { renderAppShell } from "./app/app-shell.js";
renderAppShell();

// After:
import { loadAppShell } from "./core/html-loader.js";
await loadAppShell();
```

### 3.4 Delete `app-shell.js`

The entire 2,206-line file is replaced by the HTML files.

### 3.5 Extract inline HTML templates from feature JS

For the 53 `innerHTML = \`…\`` assignments, replace with:

1. **Static HTML partials** (for modals, fixed-structure cards) — loaded via `loadPartial()`.
2. **`<template>` elements** (for repeated list items) — cloned via `template.content.cloneNode(true)`, filled by `.textContent` (XSS-safe).
3. **DOM builder helpers** — `createElement(tag, props, children)` in `core/dom.js`.

**Example transformation:**

```javascript
// Before:
modpacksList.innerHTML = modpacks.map(mp => `
  <div class="modpack-item ${mp.id === activeId ? 'active' : ''}" data-id="${mp.id}">
    <img class="mp-item-icon" src="${mp.icon || './logo.png'}">
    <div class="mp-item-info">
      <div class="mp-item-name">${mp.name}</div>
      <div class="mp-item-count">${mp.mod?.length || 0} mods</div>
    </div>
  </div>
`).join('');

// After:
import { loadTemplate } from "../core/dom.js";

const tpl = loadTemplate("modpack-item-template");
modpacksList.replaceChildren(...modpacks.map(mp => {
  const node = tpl.clone();
  node.root.dataset.id = mp.id;
  node.root.classList.toggle("active", mp.id === activeId);
  node.icon.src = mp.icon || "./logo.png";
  node.name.textContent = mp.name;          // XSS-safe
  node.count.textContent = `${mp.mods?.length || 0} mods`;
  return node.root;
}));
```

### 3.6 Template helper (add to `core/dom.js`)

```javascript
export function loadTemplate(templateId) {
  const template = document.getElementById(templateId);
  if (!template || template.tagName !== "TEMPLATE") {
    throw new Error(`Template not found: ${templateId}`);
  }
  return {
    clone() {
      const fragment = template.content.cloneNode(true);
      const refs = {};
      fragment.querySelectorAll("[data-ref]").forEach((el) => {
        refs[el.dataset.ref] = el;
      });
      const rootEl = fragment.firstElementChild;
      if (rootEl?.hasAttribute("data-ref")) {
        refs[rootEl.dataset.ref] = rootEl;
      }
      return { ...refs, root: rootEl };
    },
  };
}
```

HTML defines `<template>` elements with `data-ref` attributes for named access.

---

## Phase 4 — Renderer: IDK Connect Feature (v1.6.3 Parity)

**Goal:** Implement the full IDK Connect dashboard in the v2 renderer using the
new IPC channels — no direct `fetch()`, no JWT in localStorage.

### 4.1 New feature module: `features/idk-connect/`

- `idk-connect-feature.js` — init, wires sidebar + views
- `idk-connect-auth.js` — login/register/OTP/2FA UI (calls IPC)
- `idk-connect-friends.js` — friends list + requests + search (calls IPC)
- `idk-connect-chat.js` — DM panel + polling (calls IPC)
- `idk-connect-settings.js` — bio/username/password/delete/OAuth link (calls IPC)
- `idk-connect-presence.js` — heartbeat loop (calls `IdkConnect.SendPresence`)
- `idk-connect-router.js` — `?u=`, `?c=`, `?tab=` URL routing
- `idk-connect-skins.js` — canvas face rendering using IPC-fetched textures

### 4.2 New HTML: `views/idk-connect.html`

Full dashboard markup — Xbox-style layout (v1.6.3 final design):
- Auth overlay (login/register tabs + OAuth buttons)
- OAuth setup overlay (username completion)
- Sidebar: user badge + nav (My Profile, Search, Friends, Settings) + Sign Out
- Main: 5 views (my-profile, search, user-profile, settings, friends)
- Friends view: split pane (friend list + chat)

All defined in HTML. JS only toggles classes + fills text content.

### 4.3 Migrate `friends-feature.js`

1. Replace every `idkRequest(...)` with `window.idk.idkConnect.*` IPC.
2. Delete `IDK_BACKEND_URL`, `idkToken`, `idkUser`, `idkRequest()`.
3. Replace `localStorage.getItem("idk_connect_token")` with `IdkConnect.GetStoredToken()`.
4. Replace OTP/2FA state machine with `AuthenticateIdkConnect` use-case.
5. Replace `attemptAutoLogin()` with `AutoLoginWithMinecraft` use-case.
6. Replace `renderSkinFace` with `Skin.ResolveSkinTexture` IPC (returns base64).

**Result:** `friends-feature.js` shrinks from ~1,497 to ~500 lines.

### 4.4 Delete `overlay.js` duplication

After Phase 1, both files call the same IPC channels. The overlay window imports
the same `idk-connect-*.js` modules. Only overlay-unique concerns (browser iframe,
session sync, toasts) stay.

**Result:** `overlay.js` shrinks from 731 to ~200 lines.

### 4.5 OAuth flow

OAuth uses browser redirects. In Electron, these open in the system browser
(`System.OpenExternal`). The callback points to the **web dashboard** (`connect.html?token=…`),
not the Electron app.

**v2 MVP recommendation:** OAuth is web-dashboard-only. The Electron app supports
username/password + Minecraft auto-login. Settings → Connections → Discord/Google
"Connect" buttons redirect to the web dashboard.

### 4.6 Presence heartbeat

Renderer calls `IdkConnect.SendPresence({ status, playingVersion, cloudflaredUrl })`
every 45 seconds. Handler reads token from `SecretStore`.

### 4.7 Chat polling

Renderer calls `IdkConnect.GetMessages(friendId)` every 3 seconds when chat is open.
No JWT, no URL — just IPC.

**Future upgrade:** WebSocket layer in v2 backend for push notifications.

---

## Phase 5 — Renderer: Remove All Backend Code

**Goal:** Systematically delete every `fetch()`, JWT, `atob()`, business logic,
and `localStorage`-as-database pattern.

### 5.1 `auth-feature.js`
- Delete the `fetch("https://authserver.ely.by/...")` fallback. Require IPC.
- Keep EULA + onboarding (UI-only).

### 5.2 `content-feature.js`
- Replace Mojang news + CurseForge trending `fetch()` with `Content.*` IPC.
- Delete `idk-cache://` URL rewriting.
- Move hardcoded fallback thumbnails to `src/shared/constants/`.

### 5.3 `version-feature.js`
- Replace Mojang manifest + Modrinth sodium `fetch()` with `Version.*` IPC.
- Delete `localStorage.getItem("idk_selected_loader")`.

### 5.4 `modpacks-feature.js` (4,365 lines — the big one)
- Replace all 23 Modrinth + 8 CurseForge `fetch()` calls with `Mod.*` / `Modpack.*` IPC.
- Replace CurseForge import flow with `ImportCurseforgeModpack` use-case.
- Delete `safeJson()` + `fetchWithTimeout()`.
- Delete 16+ `localStorage.getItem/setItem("idk_modpacks")` — use `Modpack.*` IPC.
- Move version-scoring logic to domain service.
- Replace 17 `innerHTML = \`…\`` with `loadTemplate()`.

**Result:** shrinks from 4,365 to ~1,500 lines.

### 5.5 `mod-updates-feature.js`
- Delete entire file's logic (pure business logic).
- Replace with `Mod.CheckUpdates`, `Mod.InstallUpdate`, `Mod.GetChangelog` IPC.

### 5.6 `mod-resolver-feature.js`
- Delete entire file's logic (`ModResolverService` exists in v2).
- Replace with `Mod.ScanMissingDependencies`, `Mod.ResolveDependencies`, `Mod.CheckIncompatibilities` IPC.

### 5.7 `crash-analyzer-feature.js`
- Delete entire file's logic (`CrashAnalyzerService` exists in v2).
- Replace with `Crash.Analyze` IPC. Renderer only renders results.

### 5.8 `launch-feature.js`
- Delete `localStorage` for last-played, forceUpdate, playtime — use settings.
- Keep IPC listener wiring (already correct).
- Replace `window.__installedLoaders` with `Version.ScanVersionMods` IPC.

### 5.9 `profile-feature.js`
- Keep skinview3d + three.js + WebGL2 detection (renderer-only, correct).
- Replace `localStorage` for playtime + pose with settings.

### 5.10 `settings-feature.js`
- Delete all 30+ `localStorage.setItem` calls — backend is authoritative.
- Delete `settings-migration.js` (migration complete).
- Keep `applyXxx` visual functions (set CSS variables on `:root`).

### 5.11 `core/skin-texture.js`
- Delete `getSkinTextureUrl()` + `getCapeTextureUrl()` + `resolveSkinTextureBase64()`.
- Replace with `Skin.ResolveSkinTexture` + `Skin.ResolveCapeTexture` IPC (returns base64).
- Keep `renderSkinFaceOnCanvas()` + `loadAvatarForUser()` — receive base64 from IPC.
- Delete `atob(textureProp.value)` decoding (server-side now).

### 5.12 `core/app-state.js`
- Delete all `localStorage.getItem` in the initializer — state loaded from `Settings.Load()` IPC.
- Keep `state` + `actions` singletons + `window.IdkApp` debug hook.

### 5.13 `electron-api-shim.js`
- Delete 12 `stub()` calls (channels now registered).
- Add mappings for new `IdkConnect.*`, `Mod.*`, `Content.*`, `Crash.*`, `Skin.*` channels.
- Eventually deleted entirely once renderer fully uses `window.idk.*`.

---

## Phase 6 — Web Dashboard: v2 IDK Connect Landing Page

**Goal:** Port the `landing-page/` dashboard to v2 architecture.

### 6.1 Decision: Keep as static site (recommended for MVP)

The v1.6.3 dashboard is 946 lines of vanilla JS. Port to call v2 backend directly
(same `api.somniac.me`). Apply bugfixes from the audit. Extract duplicated CSS.
Keep Cloudflare Pages deployment.

A full Next.js rewrite is a separate project.

### 6.2 Bugfixes to apply (from research report)

1. Re-add `#chat-avatar` to chat header (or remove the `setMinecraftAvatar` call).
2. Wire up friend-request `.btn-accept` / `.btn-decline` buttons.
3. Fix OAuth avatar regression (`setMinecraftAvatar` should check `uObj.avatar` first).
4. Flatten nested `DOMContentLoaded` in `index.html`.
5. Clean up duplicated/dead CSS in `style.css`.
6. Remove `idk-landing-deploy` phantom submodule.
7. Standardize `/api/friends/requests/handle` body (`accept: boolean`).

### 6.3 Dashboard → v2 backend

The dashboard talks to `api.somniac.me` directly (web app, can't use IPC). Correct —
the dashboard is a separate client of the same backend. No changes needed.

---

## Phase 7 — Testing + Documentation

### 7.1 Backend tests
- Unit tests for every new use-case in `tests/application/`
- Integration tests for every new IPC handler in `tests/main/ipc/`
- `IdkConnectClient` tests mock `HttpClient`, assert URL + header construction

### 7.2 Renderer tests
- Update `tests/renderer/` for new IPC-based architecture
- Add tests for `core/html-loader.js` + `core/dom.js` `loadTemplate()`

### 7.3 Documentation
- Update `src/renderer/ARCHITECTURE.md` with HTML-first structure
- Document IPC contract for IDK Connect in `src/shared/ipc-channels.ts`
- Document OAuth flow in use-case files
- This plan → `docs/v2-frontend-rebuild-plan.md`

---

## Implementation Order + Dependencies

```
Phase 1 (v2 backend: IDK Connect)     ─┐
Phase 2 (v2 backend: Mod/Content)    ─┤── Can run in parallel
                                        │
Phase 3 (Renderer: HTML shell)       ─┘
        │
        ▼
Phase 4 (Renderer: IDK Connect)  ← depends on Phase 1 + 3
        │
        ▼
Phase 5 (Renderer: remove backend) ← depends on Phase 2 + 3
        │
        ▼
Phase 6 (Web dashboard fixes)    ← independent
Phase 7 (Tests + docs)           ← throughout
```

**Recommended sequence:**
1. Phase 1 + Phase 2 in parallel (backend work)
2. Phase 3 (HTML shell — independent of backend)
3. Phase 4 + Phase 5 in parallel (renderer migration)
4. Phase 6 (dashboard) anytime
5. Phase 7 throughout

---

## Success Criteria

- [ ] Zero `fetch()` calls to external APIs in `src/renderer/`
- [ ] Zero JWT tokens in `localStorage` (token in `SecretStore`)
- [ ] Zero `atob()` / `btoa()` calls in `src/renderer/`
- [ ] Zero `innerHTML = \`…\`` assignments in `src/renderer/`
- [ ] `app-shell.js` deleted (2,206 lines gone)
- [ ] `overlay.js` no longer duplicates `friends-feature.js`
- [ ] All 12 previously-unregistered IPC channels have handlers
- [ ] v1.6.3 IDK Connect features work in v2
- [ ] Build passes (`vite build`)
- [ ] All tests pass (`vitest run`)
- [ ] Visual parity with v1.6.3

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| OAuth callback can't reach Electron | OAuth = web-only for MVP; Electron uses username/password + MC auto-login |
| IDK backend is still HTTP | `HttpClient` refuses HTTP; live `api.somniac.me` already supports HTTPS via Cloudflare |
| HTML partials add startup latency | Load in parallel via `Promise.all`; cache after first load |
| Chat polling creates load | Acceptable for MVP; plan WebSocket upgrade for v2.1 |
| Breaking existing user sessions | One-time migration: read `localStorage.idk_connect_token`, call `IdkConnect.StoreToken`, delete from localStorage |
| Large refactoring risk | Each phase independently shippable; feature flags can gate new code paths |
