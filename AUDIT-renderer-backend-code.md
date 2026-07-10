# V2 Renderer Backend-Code Audit

**Scope:** Every file under `src/renderer/` (the v1-vintage vanilla JS renderer)
audited for backend/business-logic code that should instead be delegated to the
v2 backend (`src/main/` + `src/application/use-cases/` + `src/infrastructure/`).

**Verdict:** The renderer is, today, **a self-contained backend**. It owns
authentication (passwords, 2FA, JWT-style bearer tokens, auto-login), friends &
presence, direct messaging, mod/modpack/version metadata fetching, crash
analysis, mod dependency resolution, skin-texture URL resolution, Ely.by base64
JWT decoding, file-system mirroring via `localStorage`, and a fully duplicated
copy of the IDK Connect client in the overlay window. Almost none of this is
wired through the v2 IPC surface — the v2 backend exposes **only** auth (Mojang
+ Ely.by), launch, modpack profile repo, download queue, settings, version
download, tunnel, skin image-proxy, achievements (stub), and updater. **There
are zero IPC channels for IDK Connect, friends, presence, chat, users, mod
search, mod install, crash analysis, or mod resolution.**

---

## 1. Direct `fetch()` calls to external APIs

The renderer makes direct `fetch()` calls to **8 different external hostnames**.
The v2 `HttpClient` allowlist (in `src/infrastructure/net/http-client.ts`) only
permits **3 of them** (`api.modrinth.com`, `edge.forgecdn.net`,
`authserver.ely.by`). All other hosts would be rejected by the v2 backend if
routed through it — meaning the allowlist itself also needs expanding.

### 1.1 `api.somniac.me` (IDK Connect backend — HTTP, not HTTPS!)

All calls go through the renderer-side `idkRequest()` helper which adds
`Authorization: Bearer <jwt>`.

| File:Line | Endpoint | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `friends-feature.js:9` | `http://api.somniac.me:6040` (base URL, hardcoded) | Hosts entire IDK Connect backend | ❌ No | New IPC namespace `IdkConnect.*` + new infrastructure client `IdkConnectClient` (HTTP) |
| `friends-feature.js:292` | `POST /api/auth/request-otp` | Register OTP | ❌ No | `IdkConnect.RequestOtp` |
| `friends-feature.js:329-330` | `POST /api/auth/login`, `POST /api/auth/verify-2fa`, `POST /api/auth/register` | Login / 2FA / Register | ❌ No | `IdkConnect.Login`, `IdkConnect.Verify2fa`, `IdkConnect.Register` |
| `friends-feature.js:644` | `GET /api/auth/me` | Current user profile | ❌ No | `IdkConnect.GetMe` |
| `friends-feature.js:671` | `POST /api/auth/link-minecraft` | Link MC account | ❌ No | `IdkConnect.LinkMinecraft` |
| `friends-feature.js:701` | `GET /api/users/search?q=` | User search | ❌ No | `IdkConnect.SearchUsers` |
| `friends-feature.js:799` | `GET /api/users/:username/profile` | Public profile | ❌ No | `IdkConnect.GetUserProfile` |
| `friends-feature.js:812` | `POST /api/friends/request` | Send friend request | ❌ No | `IdkConnect.SendFriendRequest` |
| `friends-feature.js:825` | `PUT /api/auth/profile` | Save bio | ❌ No | `IdkConnect.UpdateProfile` |
| `friends-feature.js:843` | `POST /api/auth/request-otp-security` | Settings OTP | ❌ No | `IdkConnect.RequestSecurityOtp` |
| `friends-feature.js:868` | `POST /api/auth/security` | Save security | ❌ No | `IdkConnect.UpdateSecurity` |
| `friends-feature.js:921` | `POST /api/presence` | Heartbeat | ❌ No | `IdkConnect.SendPresence` |
| `friends-feature.js:937` | `GET /api/friends` | Friends list | ❌ No | `IdkConnect.GetFriends` |
| `friends-feature.js:941` | `GET /api/friends/requests` | Pending requests | ❌ No | `IdkConnect.GetFriendRequests` |
| `friends-feature.js:989` | `POST /api/friends/requests/handle` | Accept/decline | ❌ No | `IdkConnect.HandleFriendRequest` |
| `friends-feature.js:1109` | `DELETE /api/friends/:id` | Unfriend | ❌ No | `IdkConnect.RemoveFriend` |
| `friends-feature.js:1308` | `GET /api/messages/:friendId` | Chat history | ❌ No | `IdkConnect.GetMessages` |
| `friends-feature.js:1382` | `POST /api/messages/:friendId` | Send message | ❌ No | `IdkConnect.SendMessage` |
| `friends-feature.js:1423` | `POST /api/auth/login-minecraft` | Auto-login via MC | ❌ No | `IdkConnect.LoginWithMinecraft` |
| `friends-feature.js:1475` | `GET /api/friends` (background poller) | Unread badges | ❌ No | (same as GetFriends) |
| `overlay.js:35` | `http://api.somniac.me:6040` (base URL) | Duplicate of friends-feature | ❌ No | (delete overlay.js; reuse friends-feature) |
| `overlay.js:194` | `POST /api/presence` | Duplicate | ❌ No | (delete) |
| `overlay.js:207` | `GET /api/friends` | Duplicate | ❌ No | (delete) |
| `overlay.js:210` | `GET /api/friends/requests` | Duplicate | ❌ No | (delete) |
| `overlay.js:303` | `DELETE /api/friends/:id` | Duplicate | ❌ No | (delete) |
| `overlay.js:355` | `POST /api/friends/requests/handle` | Duplicate | ❌ No | (delete) |
| `overlay.js:378` | `POST /api/friends/request` | Duplicate | ❌ No | (delete) |

**Security note:** `http://api.somniac.me:6040` is **plaintext HTTP**. JWTs are
transmitted in cleartext. The v2 `ElybyClient` source comment explicitly says
this backend was declared "out of scope for v2 until it provides HTTPS" — but
the renderer is still calling it.

### 1.2 `authserver.ely.by`

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `auth-feature.js:111-122` | `POST https://authserver.ely.by/auth/authenticate` | Ely.by login (fallback path when `window.electronAPI.elybyAuthenticate` is unavailable) | ✅ Yes — `Auth.ElybyAuthenticate` (delegates to `ElybyClient.authenticate`) | Delete the renderer-side fetch; require the IPC path |

### 1.3 `api.modrinth.com` (v2 backend already has `ModrinthClient`)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `mod-updates-feature.js:189` | `GET /v2/search?query=…&facets=…&limit=5` | Find Modrinth project by name | ⚠️ `ModrinthClient.searchMods` exists, but no IPC handler exposes it | New IPC `Mod.Search` + use-case `SearchMods` |
| `mod-updates-feature.js:236,249` | `GET /v2/project/:id/version` | List versions | ⚠️ `ModrinthClient.getVersions` exists, no IPC | `Mod.GetVersions` |
| `mod-updates-feature.js:422` | `GET /v2/project/:id` | Project metadata / changelog | ⚠️ `ModrinthClient.getProject` exists, no IPC | `Mod.GetProject` |
| `mod-resolver-feature.js:45` | `GET /v2/project/:id` | Get dependencies | ⚠️ Same | `Mod.GetProject` (or new `Mod.GetDependencies` use-case) |
| `mod-resolver-feature.js:52` | `GET /v2/project/:id/version` | Latest version deps | ⚠️ Same | `Mod.GetVersions` |
| `mod-resolver-feature.js:96,105` | `GET /v2/project/:depId` + `/version` | Resolve dep download URL | ⚠️ Same | New use-case `ResolveModDependencies` (use existing `ModResolverService` domain service!) |
| `version-feature.js:175` | `GET /v2/project/sodium/version?loaders=…` | Sodium-supported MC versions | ⚠️ Same | `Mod.GetVersions` (special project=sodium) |
| `modpacks-feature.js:2431` | `GET /v2/search?query=…&facets=…` | Mod browser search | ⚠️ Same | `Mod.Search` |
| `modpacks-feature.js:2984` | `GET /v2/project/:id/version` | Modpack import version list | ⚠️ Same | `Mod.GetVersions` |
| `modpacks-feature.js:3094` | `GET /v2/project/:project_id` | Per-file project info during import | ⚠️ Same | `Mod.GetProject` |
| `modpacks-feature.js:3587,3590` | `GET /v2/project/:id/version?loaders=…&game_versions=…` | Pick closest version for install | ⚠️ Same | `Mod.GetVersions` + new use-case `PickClosestVersion` |
| `modpacks-feature.js:3638` | `GET /v2/project/:id` | Get project icon | ⚠️ Same | `Mod.GetProject` |
| `modpacks-feature.js:3731,3734` | `GET /v2/project/:id/version?game_versions=…` | Same for shaders/RPs | ⚠️ Same | `Mod.GetVersions` |
| `modpacks-feature.js:3795` | `GET /v2/project/:id/version` | Resourcepack install | ⚠️ Same | `Mod.GetVersions` |

### 1.4 `api.curse.tools` (public CurseForge proxy — **not in v2 allowlist!**)

The v2 `CurseforgeClient` targets `api.curseforge.com` (which requires an
`x-api-key` header). The renderer instead uses the unauthenticated
`api.curse.tools` proxy. **These cannot simply be re-pointed at
`api.curseforge.com` without supplying a real API key from environment.**

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `content-feature.js:100` | `GET /v1/cf/mods/search?gameId=432&classId=4471` | Trending modpacks | ❌ No | New `Modpack.SearchCurseforge` (curseforge-client already has `searchModpacks`) |
| `modpacks-feature.js:1846,1848` | `GET /v1/cf/mods/:pid/files/:fid` + `/v1/cf/mods/:pid` | CurseForge modpack import: per-file metadata | ❌ No | New use-case `ImportCurseforgeModpack` |
| `modpacks-feature.js:2463` | `GET /v1/cf/mods/search?…` | CurseForge browser search | ❌ No | `Modpack.SearchCurseforge` |
| `modpacks-feature.js:2694,2708` | `GET /v1/cf/mods/:pid` + `/files` | Modpack install metadata | ❌ No | `Modpack.GetCurseforgeModpack` |
| `modpacks-feature.js:2797,2799` | Same as 1846/1848 | CurseForge modpack install (duplicate path) | ❌ No | (same) |
| `modpacks-feature.js:3273,3354,3440,3511` | `GET /v1/cf/mods/:pid/files` + `/v1/cf/mods/:pid` | CurseForge mod install (resourcepack/shader) | ❌ No | `Mod.GetCurseforgeFiles`, `Mod.GetCurseforgeProject` |

### 1.5 `edge.forgecdn.net` & `media.forgecdn.net` (CDN — in v2 allowlist)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `modpacks-feature.js:1883,2731,2808` | `https://edge.forgecdn.net/files/:p1/:p2/:filename` | CurseForge file download URL fallback | ❌ No | Should go through `DownloadQueue` with `HttpClient.downloadFile` |
| `content-feature.js:65,74,83,92` | `https://media.forgecdn.net/avatars/…` | Trending modpack thumbnails (hardcoded fallback list) | ❌ No | Static fallback data; could stay but should be moved to a constant module |

### 1.6 `launchermeta.mojang.com` (Mojang version manifest — in v2 allowlist)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `version-feature.js:188` | `GET /mc/game/version_manifest.json` | Fetch all MC versions | ⚠️ `MojangClient.getManifest` exists, no IPC | New IPC `Version.GetManifest` |

### 1.7 `launchercontent.mojang.com` (Mojang news — **not in v2 allowlist!**)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `content-feature.js:10` | `GET /news.json` | Mojang news feed | ❌ No | New IPC `Content.GetMojangNews` + new infra client `MojangContentClient` |
| `content-feature.js:18-21` | `idk-cache://launchercontent.mojang.com…` (custom protocol) | Image proxy | ❓ Custom scheme registration — needs investigation | Possibly register as Electron protocol that routes through HttpClient |

### 1.8 `minotar.net` & `skinsystem.ely.by` (skin textures — **not in v2 allowlist!**)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `skin-texture.js:20,129` | `https://skinsystem.ely.by/skins/:name.png` | Ely.by skin texture | ❌ No | Add `ElybyClient.fetchSkinTextureUrl` already exists! Just route through IPC. Also add `skinsystem.ely.by` to allowlist |
| `skin-texture.js:38,86,112,113,133,134` | `https://minotar.net/skin/:name` | Minotar fallback skin | ❌ No | New `Skin.FetchSkinTexture` IPC; add `minotar.net` to allowlist |
| `friends-feature.js:172,193` | `https://minotar.net/skin/:username` | Friend avatar fallback | ❌ No | (same) |
| `friends-feature.js:196` | `https://skinsystem.ely.by/skins/:username.png` | Friend avatar primary | ❌ No | (same) |
| `overlay.js:99,115` | Same as friends-feature | Duplicate | ❌ No | (delete) |

### 1.9 `google.com` (overlay built-in browser — **not in v2 allowlist!**)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `overlay.html:66` | `https://google.com/search?igu=1` (iframe src) | Embedded browser home | n/a (renderer-only) | Renderer concern; but consider whether the overlay should have a browser at all |
| `overlay.js:596,639` | `https://google.com/search?…` | Browser navigation | n/a | (same) |

### 1.10 `ely.by/profile` (external link)

| File:Line | URL | Purpose | v2 IPC exists? | Recommendation |
|---|---|---|---|---|
| `auth-feature.js:265` | `https://ely.by/profile` | Open Ely.by dashboard in system browser | ✅ `System.OpenExternal` (already used correctly) | OK — this is fine |
| `profile-feature.js:755` | `https://ely.by/profile` | Same | ✅ Same | OK |

---

## 2. Hardcoded backend URLs

| File:Line | URL | Notes |
|---|---|---|
| `friends-feature.js:9` | `http://api.somniac.me:6040` | Plaintext HTTP! Fallback when `localStorage.idk_backend_url` unset |
| `overlay.js:35` | `http://api.somniac.me:6040` | Duplicate |
| `friends-feature.js:196` | `https://skinsystem.ely.by/skins/${username}.png` | Hardcoded skin URL |
| `overlay.js:115` | `https://skinsystem.ely.by/skins/${username}.png` | Duplicate |
| `skin-texture.js:20,129` | `https://skinsystem.ely.by/skins/${name}.png` | Hardcoded |
| `skin-texture.js:38,86,112,113,133,134` | `https://minotar.net/skin/${name}` / `Steve` | Hardcoded |
| `friends-feature.js:172,193` | `https://minotar.net/skin/${username}` | Hardcoded |
| `overlay.js:99` | `https://minotar.net/skin/${username}` | Duplicate |
| `auth-feature.js:111` | `https://authserver.ely.by/auth/authenticate` | Hardcoded auth URL (renderer-side fallback that bypasses IPC) |
| `version-feature.js:175` | `https://api.modrinth.com/v2/project/sodium/version` | Hardcoded |
| `version-feature.js:188` | `https://launchermeta.mojang.com/mc/game/version_manifest.json` | Hardcoded (v1 URL form; v2 uses `piston-meta.mojang.com/…/version_manifest_v2.json`) |
| `content-feature.js:10` | `https://launchercontent.mojang.com/news.json` | Hardcoded |
| `content-feature.js:100` | `https://api.curse.tools/v1/cf/mods/search` | Hardcoded |
| `mod-updates-feature.js:189,236,422` | `https://api.modrinth.com/v2/...` | Hardcoded |
| `mod-resolver-feature.js:45,52,96,105` | `https://api.modrinth.com/v2/...` | Hardcoded |
| `modpacks-feature.js:1846,1848,1883,2431,2463,2694,2708,2731,2797,2799,2808,2984,3094,3273,3354,3440,3512,3587,3638,3731,3795` | `https://api.modrinth.com/v2/...` and `https://api.curse.tools/v1/cf/...` and `https://edge.forgecdn.net/files/...` | Hardcoded |
| `auth-feature.js:265, profile-feature.js:755` | `https://ely.by/profile` | External link (acceptable, but should be config) |

---

## 3. JWT / token handling in renderer

The IDK Connect backend issues a JWT-style bearer token. The renderer stores,
reads, and sends it directly:

| File:Line | Code | Concern |
|---|---|---|
| `friends-feature.js:10` | `let idkToken = localStorage.getItem("idk_connect_token") \|\| ""` | Reads JWT from localStorage |
| `friends-feature.js:203` | `if (idkToken) headers["Authorization"] = \`Bearer ${idkToken}\`` | Sends JWT in Authorization header |
| `friends-feature.js:362-365` | `idkToken = data.token; … localStorage.setItem("idk_connect_token", idkToken)` | Stores JWT after login/register |
| `friends-feature.js:401-404` | `idkToken = ""; localStorage.removeItem("idk_connect_token")` | Clears JWT on logout |
| `friends-feature.js:1427-1430` | `idkToken = res.token; localStorage.setItem("idk_connect_token", idkToken)` | Stores JWT from auto-login |
| `friends-feature.js:644,671,676,701,799,812,825,843,868,921,937,941,989,1109,1308,1382,1423,1475` | All `idkRequest(...)` calls inherit the Bearer header | Every IDK Connect call sends the JWT |
| `overlay.js:36` | `let idkToken = localStorage.getItem("idk_connect_token") \|\| ""` | Same, duplicated |
| `overlay.js:121` | `if (idkToken) headers["Authorization"] = \`Bearer ${idkToken}\`` | Same, duplicated |
| `overlay.js:143-144` | Re-reads JWT from localStorage on UI sync | Same, duplicated |
| `overlay.js:168-169` | `localStorage.removeItem("idk_connect_token")` | Logout clears JWT |

**Issue:** JWTs are stored in `localStorage` (XSS-exfiltratable) and shipped
over **plaintext HTTP** to `api.somniac.me:6040`. They should instead live in
the v2 `SecretStore` (`src/infrastructure/crypto/secret-store.ts`) and only
ever be transmitted from the main process (ideally over HTTPS).

---

## 4. OAuth flow in renderer

The audit prompt expected an OAuth flow (`/api/auth/discord`,
`?token=`, `?oauth_pending=`, `/api/auth/oauth-complete`). **No such flow
exists in the renderer.** Grepping for `discord|oauth|oauth_complete|oauth-complete|oauth_pending|\?token=|/api/auth/discord` returned **zero matches** for OAuth-flow code (the only `discord` hits are for Discord **RPC** settings — unrelated).

However, the renderer does orchestrate **two custom auth flows** that should be
backend use-cases:

### 4.1 IDK Connect custom OTP+password auth flow (`friends-feature.js:272-386`)

Renderer-side state machine:
1. `tab=login` → user types username+password → `POST /api/auth/login`
2. If response says `requires2fa: true` → show OTP input → `POST /api/auth/verify-2fa`
3. `tab=register` → user types username+email+password → `POST /api/auth/request-otp` → user enters OTP → `POST /api/auth/register`

On success, the JWT + user object are written to localStorage.

**This is a multi-step authentication use-case that belongs in
`application/use-cases/authenticate-idk-connect.ts`.**

### 4.2 Auto-login via Minecraft account (`friends-feature.js:1414-1446`)

`attemptAutoLogin()` calls `POST /api/auth/login-minecraft` with the currently
logged-in Minecraft username + auth mode. The backend returns a JWT, which the
renderer stores. This is essentially a "trusted delegation" OAuth-ish flow that
**must** live behind IPC (it requires the Minecraft session token, which is in
the v2 `SecretStore`).

### 4.3 Microsoft OAuth (`auth-feature.js:36-67`)

Calls `window.electronAPI.microsoftAuthenticate()` — **this is already correctly
delegated to IPC** (`Auth.MicrosoftAuthenticate` → `AuthenticateMicrosoft`
use-case). No issues here. ✅

### 4.4 Ely.by auth (`auth-feature.js:93-148`)

Has a **fallback path** (lines 110-123) that does a direct `fetch()` to
`https://authserver.ely.by/auth/authenticate` when `window.electronAPI.elybyAuthenticate`
is unavailable. The IPC path exists. The renderer fallback should be deleted.

---

## 5. Auth-related localStorage keys

| Key | Files accessing it | Purpose | Should move to |
|---|---|---|---|
| `idk_connect_token` | `friends-feature.js:10,364,403,1429`; `overlay.js:36,143,168` | JWT bearer token | `SecretStore` (already exists) |
| `idk_connect_user` | `friends-feature.js:12,365,404,646,676,827,874,1430`; `overlay.js:37,144,169` | User profile JSON (id, username, bio, twoFactorEnabled, linkedMinecraftAccount) | Settings store (already exists) |
| `idk_backend_url` | `friends-feature.js:9`; `overlay.js:35` | IDK Connect base URL override | Config file in main process (never renderer-overridable) |
| `idk_connect_prompted_v2` | `auth-feature.js:183,192` | One-time IDK Connect onboarding prompt | Settings store |
| `idk_agreed_eula` | `auth-feature.js:154,179` | EULA acceptance flag | Settings store |
| `craftlaunch_username` | `auth-feature.js:47,79,128,171,295`; `profile-feature.js:920` | Current MC username | Settings store (already mirrored via `saveSettings`) |
| `craftlaunch_authmode` | `auth-feature.js:48,80,129` | Current MC auth mode (`offline`/`elyby`/`microsoft`) | Settings store |
| `idk_modpacks` | (see §7) | All modpacks as JSON array | `ModpackRepository` (exists); renderer should not write |
| `idk_version_settings` | `version-feature.js:89,146`; `launch-feature.js:348`; `modpacks-feature.js:1264` | Per-version settings JSON | Settings store |
| `idk_downloaded_versions` | `launch-feature.js:266,464`; `modpacks-feature.js:1318,1383` | Downloaded version IDs | Should be derived from disk via `Version.ScanDownloaded` (exists) |
| `idk_selected_loader` | `version-feature.js:81,105,161`; `launch-feature.js:137,342` | Last-selected loader | Settings store |
| `idk_last_played` | `launch-feature.js:133,660`; `version-feature.js:234` | Last played version+loader | Settings store |
| `idk_last_played_is_modpack` | `version-feature.js:234,304`; `launch-feature.js:97,128` | Boolean flag | Settings store |
| `idk_last_played_modpack_id` | `version-feature.js:235`; `launch-feature.js:98` | Modpack ID | Settings store |
| `idk_playtime` | `launch-feature.js:902,927,929`; `profile-feature.js:52` | Total playtime ms | Settings store |
| `idk_player_pose` | `profile-feature.js:139,143` | Skin viewer pose | Settings store (cosmetic) |
| `craftlaunch_javaPath` | `launch-feature.js:575`; `settings-feature.js:619,1077` | Custom Java path | Settings store (already mirrored) |
| `craftlaunch_forceUpdate` | `launch-feature.js:372` | Force-update flag | Settings store |
| `craftlaunch_performanceRenderer` | `launch-feature.js:729`; `settings-feature.js:939` | Render engine | Settings store |
| `craftlaunch_hideRenderPopup` | `launch-feature.js:717,732`; `settings-feature.js:1217,1273` | Hide render popup flag | Settings store |
| `craftlaunch_autoOptimization` | `version-feature.js:37`; `settings-feature.js:691,926` | Auto-optimization flag | Settings store |
| `craftlaunch_maxMemory` | `settings-feature.js:338` | Max memory GB | Settings store |
| `idk_custom_minecraft_path` | `settings-feature.js:598,607,1158,1170` | Custom .minecraft path | Settings store |
| `idk_global_java_args` | `settings-feature.js:630,1088` | Global JVM args | Settings store |
| `idk_default_window_*`, `idk_default_fullscreen`, `idk_enable_overlay`, `idk_hide_launcher` | `settings-feature.js:645-680,1104-1140` | Window settings | Settings store |
| `idk_launcher_theme`, `idk_accent_color`, `idk_border_radius`, `idk_animation_speed`, `idk_font_scale`, `idk_blur_intensity`, `idk_compact_mode`, `idk_language`, `idk_background_effect`, `idk_background_intensity`, `idk_concurrent_downloads`, `idk_concurrent_io`, `idk_auto_updates`, `idk_discord_presence`, `idk_beta_updates`, `idk_open_logs`, `idk_analytics`, `idk_launcher_ui_mode`, `idk_launcher_performance_mode` | `settings-feature.js` (many lines) | Visual / launcher settings | Settings store (already mirrored via `persistVisualSettings()`) |

**Note:** Many of these are *double-persisted* — the renderer writes to
localStorage AND calls `window.electronAPI.saveSettings(...)`. The localStorage
copy is the source of truth on startup (via `app-state.js` and
`settings-migration.js`), the backend copy is a passive mirror. This inversion
should be flipped: the backend should be authoritative, the renderer should
just call `loadSettings()` on startup.

---

## 6. Business logic that belongs in use-cases

### 6.1 Crash log analysis (`crash-analyzer-feature.js` — entire 252-line file)

| Location | What it does | v2 use-case exists? | Recommendation |
|---|---|---|---|
| `crash-analyzer-feature.js:6-94` | `COMMON_ERRORS` + `MOD_SPECIFIC_ERRORS` constant dictionaries (7 exception types, 3 mod-specific dicts) | ✅ `CrashAnalyzerService` exists at `src/domain/services/crash-analyzer.ts` with `DEFAULT_CRASH_PATTERNS` (8 patterns, more complete) | Delete renderer file; wire `CrashAnalyzerService` to new IPC `Crash.Analyze` |
| `crash-analyzer-feature.js:99-143` | `parseCrashLog()` — regex-based exception + stack trace + mods-list extractor | ✅ Part of `CrashAnalyzerService.analyze()` | (same) |
| `crash-analyzer-feature.js:148-190` | `analyzeCrash()` — match exception to dictionary, gather suggestions, compute severity | ✅ Same | (same) |
| `crash-analyzer-feature.js:195-202` | `calculateSeverity()` — critical/high/medium classification | ✅ Same (uses `severity` field) | (same) |
| `crash-analyzer-feature.js:207-252` | `formatAnalysis()` — render HTML | ❌ (presentation; OK in renderer) | Keep rendering in renderer, but use the IPC-returned `CrashReport` |

### 6.2 Mod version comparison + matching (`mod-updates-feature.js` — entire 447-line file)

| Location | What it does | v2 use-case exists? | Recommendation |
|---|---|---|---|
| `mod-updates-feature.js:16-54` | `checkModUpdates()` — iterate all mods/RPs/shaders in a modpack, fetch latest Modrinth version, decide if update available | ❌ No | New use-case `CheckModUpdates` (uses `ModrinthClient.getVersions` + `ModrinthClient.searchMods` + `ModrinthClient.getProject`) |
| `mod-updates-feature.js:59-139` | `checkSingleModUpdate()` — extract search name, find project, fetch versions, compare | ❌ No | (same use-case) |
| `mod-updates-feature.js:181-202` | `findModrinthProject()` — call `/v2/search` and pick best match | ⚠️ `ModrinthClient.searchMods` exists | Use `ModrinthClient.searchMods` from main process |
| `mod-updates-feature.js:204-222` | `buildSearchFacets()` — build Modrinth facet groups by loader/MC version/project type | ❌ No | Move into `ModrinthClient` or use-case |
| `mod-updates-feature.js:224-257` | `buildVersionsUrl()`, `fetchProjectVersions()`, `requestProjectVersions()` | ⚠️ `ModrinthClient.getVersions` exists | Use it |
| `mod-updates-feature.js:259-360` | `getMinecraftVersion`, `buildMcVersionCandidates`, `getLoader`, `extractProjectSearchName`, `getCurrentVersion`, `pickBestProjectMatch`, `normalizeName`, `normalizeVersion`, `stripMinecraftFormatting`, `extractBestVersionCandidate`, `isCompatibilityOnlyVersion`, `isMinecraftVersion`, `isLikelyModrinthProjectRef` — **~100 lines of pure mod-version-matching business logic** | ❌ No | New domain service `ModVersionMatcher` (pure, testable) |
| `mod-updates-feature.js:362-415` | `getUpdateTarget`, `findInstalledItemIndex`, `isSameInstalledFile`, `versionsAreEquivalent`, `normalizeComparableVersion`, `normalizeFileName` — more version-equivalence logic | ❌ No | (same domain service) |
| `mod-updates-feature.js:141-179` | `installModUpdate()` — orchestrate download + remove + modpack update | ❌ No | New use-case `InstallModUpdate` |
| `mod-updates-feature.js:420-438` | `getModChangelog()` — `GET /v2/project/:id` | ⚠️ `ModrinthClient.getProject` exists | Use it |
| `mod-updates-feature.js:177` | `localStorage.setItem('idk_modpacks', …)` after install | File-system concern | Goes away once modpack repo is authoritative |

### 6.3 Mod dependency resolution (`mod-resolver-feature.js` — entire 203-line file)

| Location | What it does | v2 use-case exists? | Recommendation |
|---|---|---|---|
| `mod-resolver-feature.js:11-38` | `scanMissingDependencies()` — for each mod, fetch deps, compare to installed | ✅ `ModResolverService` exists at `src/domain/services/mod-resolver.ts` (pure) | Wire `ModResolverService` to new IPC `Mod.ScanMissingDependencies` |
| `mod-resolver-feature.js:43-78` | `getModDependencies()` — `GET /v2/project/:id` + `/version`, parse `dependencies[]` | ⚠️ `ModrinthClient.getProject` + `getVersions` exist, plus `ModrinthVersion.dependencies` is already typed | New use-case `ResolveModDependencies` |
| `mod-resolver-feature.js:83-168` | `resolveDependencies()` — fetch + download + install each dep, push to `mp.mods`, write localStorage | ❌ No | New use-case `InstallModDependencies` |
| `mod-resolver-feature.js:173-203` | `checkIncompatibilities()` — hardcoded list (optifine/sodium, optifine/iris, sodium/iris, fabric-api/forge) | ✅ `ModResolverService` accepts `knownIncompatibilities` map | Move hardcoded list to a config; pass to `ModResolverService` constructor |
| `mod-resolver-feature.js:156` | `localStorage.setItem('idk_modpacks', …)` | File-system concern | Goes away |

### 6.4 Skin texture URL resolution + Ely.by JWT decoding (`skin-texture.js` — entire 137-line file)

| Location | What it does | v2 use-case exists? | Recommendation |
|---|---|---|---|
| `skin-texture.js:3-39` | `getSkinTextureUrl()` — calls `fetchElybyProfile`, **decodes base64 JWT texture property** (line 11: `JSON.parse(atob(textureProp.value))`), extracts `textures.SKIN.url`; falls back to `skinsystem.ely.by` | ⚠️ `ElybyClient.fetchProfile` exists, but returns an `ElybyProfile` shape that doesn't expose the raw `properties[].value` JWT — the **JWT decoding logic is missing from v2** | Extend `ElybyClient` to decode textures; new use-case `ResolveSkinTexture` returning a final URL or base64 |
| `skin-texture.js:41-76` | `getCapeTextureUrl()` — same pattern for capes | ⚠️ Same | (same) |
| `skin-texture.js:78-95` | `resolveSkinTextureBase64()` — calls `fetchImageBase64` (already IPC) | ✅ `Skin.FetchImageBase64` exists | OK once URLs come from IPC |
| `skin-texture.js:97-120` | `renderSkinFaceOnCanvas()` — 2D canvas face rendering | n/a | Pure presentation; OK in renderer |
| `skin-texture.js:122-137` | `loadAvatarForUser()` — orchestrates ely.by vs minotar | ⚠️ Mixes presentation + URL resolution | Split: URL resolution → IPC, canvas drawing → renderer |

### 6.5 Ely.by profile decoding (`skin-texture.js:11, 49`)

```js
const decoded = JSON.parse(atob(textureProp.value));
const skinUrl = decoded?.textures?.SKIN?.url;
```

`textureProp.value` is a base64-encoded JSON payload (the same shape Mojang's
sessionserver returns). The v2 `ElybyClient.fetchProfile()` returns an
`ElybyProfile` interface that **does not include this texture property at
all** — meaning either v2 hasn't implemented it, or the Ely.by API returns a
different shape than the renderer expects. **This needs reconciliation.**

### 6.6 Version filtering (`version-feature.js:185-199, 253-258`)

| Location | What it does | v2 use-case exists? | Recommendation |
|---|---|---|---|
| `version-feature.js:185-199` | `fetchVersions()` — `fetch()` manifest, store in `state.allVersions` | ⚠️ `MojangClient.getManifest` exists, no IPC | New IPC `Version.GetManifest` |
| `version-feature.js:253-258` | Filter by `release`/`snapshot`/`old_beta`/`old_alpha` based on checkbox state | ✅ `VersionFilterService` exists at `src/domain/services/version-filter.ts` | Wire to IPC, or do filtering in renderer after fetching via IPC (filtering is pure) |

### 6.7 Modpack import (entire `mpAddItem()` flows in `modpacks-feature.js`)

Lines 2675-3900+ orchestrate: fetch project metadata → fetch version list → pick closest version → call `downloadModrinthModpack` / `installMod` / `installResourcepack` / `installShader` (all currently **no-op stubs** in the shim) → push to `mp.mods`/`mp.resourcepacks`/`mp.shaders` → write `localStorage.idk_modpacks`.

**This is a complex use-case** (`InstallModFromBrowser`) that doesn't exist in
v2. The `InstallModpack` use-case exists but only handles whole-modpack install
from a project ID, not individual mod install into an existing modpack.

### 6.8 `extractVersionFromFilename()` (`modpacks-feature.js:484-498`)

Pure regex version-string extractor. Should move to a `ModFilenameParser`
domain service (testable).

### 6.9 `buildMcVersionCandidates()`, `buildSimpleVersionCandidates()`, `scoreGameVersionTag()`, `pickClosestGameVersion()` (`modpacks-feature.js:542-619`)

Pure version-closeness scoring logic. ~80 lines. Should move to a
`ModrinthVersionPicker` domain service.

### 6.10 `safeJson()`, `fetchWithTimeout()` (`modpacks-feature.js:8-44`)

Generic fetch helpers. The v2 `HttpClient` already does both (timeout + JSON
parsing + retries + integrity). These should be deleted.

---

## 7. File system access in renderer

The renderer treats `localStorage` as a file system. The v2 backend has a
`ModpackRepository` (`src/infrastructure/fs/modpack-repository.ts`) and a
`SettingsStore` (`src/infrastructure/fs/settings-store.ts`) that should be
authoritative.

### 7.1 `localStorage.setItem('idk_modpacks', …)` — modpack state writes from renderer

| File:Line | Context |
|---|---|
| `modpacks-feature.js:80` | After filtering placeholder modpacks on startup |
| `modpacks-feature.js:236` | After `loadProfilesFromDisk()` merges disk + localStorage |
| `modpacks-feature.js:276` | `mpSave()` — every modpack save |
| `modpacks-feature.js:804,1049,1116` | Various modpack edits |
| `modpacks-feature.js:1264` | Version settings update |
| `modpacks-feature.js:1318,1383` | After version download |
| `modpacks-feature.js:1595` | Modpack metadata edit |
| `modpacks-feature.js:1832` | New modpack during import |
| `modpacks-feature.js:2002,2778,2936,3061,3189` | Post-import / post-install updates |
| `modpacks-feature.js:3405,3695` | Mod install into version settings |
| `modpacks-feature.js:3907` | Cleanup of failed import |
| `launch-feature.js:690` | Reading modpacks to find selected one for launch |
| `launch-feature.js:9` (in `updateSetupDisplay`) | Reading modpacks to display name |
| `version-feature.js:207` | Reading modpacks for favorites in version dropdown |
| `mod-updates-feature.js:177` | After mod update install |
| `mod-resolver-feature.js:156` | After dep install |

**The renderer reads/writes the entire modpacks array as a JSON blob in
localStorage.** The v2 `ModpackRepository` is the proper home; the renderer
should call `Modpack.ScanProfiles` (already exists, returns disk profiles) and
`Modpack.UpdateProfile` (already exists) and never touch localStorage for
modpack state.

### 7.2 `localStorage` for settings

The renderer's `settings-feature.js` has 30+ `localStorage.setItem(...)`
calls (see §5). Every one is followed by `persistVisualSettings()` which calls
`window.electronAPI.saveSettings(...)`. The localStorage write is redundant
once the backend is authoritative.

### 7.3 `localStorage` for downloaded versions (`idk_downloaded_versions`)

`launch-feature.js:266,464` and `modpacks-feature.js:1318,1383` push to this
array after a successful download. The v2 `Version.ScanDownloaded` IPC already
reads the disk and returns the list. **The renderer is maintaining a stale
cache that can drift from disk.** Delete the localStorage key; always call
`Version.ScanDownloaded`.

### 7.4 Direct disk-path references in renderer

| File:Line | Reference |
|---|---|
| `modpacks-feature.js:528` | `if (!iconUrl \|\| iconUrl.startsWith("file://"))` — handles `file://` URLs from icon extraction |
| `content-feature.js:18-21` | `idk-cache://launchercontent.mojang.com` — custom protocol handler |
| `content-feature.js:112,139` | `idk-cache://` prefix substitution |

The `idk-cache://` scheme is a custom Electron protocol (presumably registered
in main) that proxies remote images through a disk cache. This is fine, but
the renderer shouldn't be doing URL rewriting — the IPC layer should return
already-cacheable URLs.

---

## 8. Crypto / encoding in renderer

| File:Line | Code | Purpose | Recommendation |
|---|---|---|---|
| `skin-texture.js:11` | `JSON.parse(atob(textureProp.value))` | Decode base64-encoded JWT-like texture property from Ely.by profile response | Move to `ElybyClient` (or a new `ElybyTextureDecoder` domain service) — base64 + JSON parse of an unsigned JWT-like payload is a backend concern |
| `skin-texture.js:49` | `JSON.parse(atob(textureProp.value))` | Same, for cape texture | (same) |

**Note:** The Ely.by texture payload is structurally identical to Mojang's
sessionserver texture property (base64url JSON with `textures.SKIN.url`).
The v2 backend has a `SecretStore` (`src/infrastructure/crypto/secret-store.ts`)
which is the right place for any actual crypto (none needed here since these
are unsigned payloads — but the decoding still doesn't belong in the renderer).

No `btoa`, bcrypt, or other crypto operations were found in the renderer.

---

## 9. Duplicate logic between `overlay.js` and `friends-feature.js`

**Confirmed: `overlay.js` is a near-verbatim copy of the friends/auth/tunnel
subset of `friends-feature.js`.** Both files independently maintain
`IDK_BACKEND_URL`, `idkToken`, `idkUser`, and a full IDK Connect HTTP client.

| Function / Concern | `friends-feature.js` | `overlay.js` | Notes |
|---|---|---|---|
| `IDK_BACKEND_URL` constant (with localStorage fallback to `http://api.somniac.me:6040`) | line 9 | line 35 | Identical |
| `idkToken` localStorage read | line 10 | line 36 | Identical |
| `idkUser` localStorage read | lines 11-13 | line 37 | Identical (different parse style) |
| `activeTunnelUrl`, `activeSharePort`, `presenceInterval`, `refreshInterval` state | lines 15-18 | lines 39-42 | Identical |
| `renderSkinFace(canvas, username)` avatar drawing | lines 133-198 (`renderSkinFaceOnFriendsCanvas`) | lines 61-116 (`renderSkinFace`) | Identical algorithm (different fallback color) |
| `idkRequest(endpoint, method, body)` HTTP wrapper with Bearer auth | lines 201-221 | lines 119-139 | **Identical** — both add `Authorization: Bearer ${idkToken}` |
| `updateAuthUI()` / `updateFriendsAuthUI()` | lines 224-245 | lines 142-157 | Same logic, different DOM IDs |
| `btnLogout` / `btnDisconnect` handler (clears localStorage + updates UI) | lines 393-408 | lines 160-172 | Identical intent |
| `startHeartbeats()` (presence + friends refresh intervals) | lines 891-901 | lines 175-182 | Identical (10s presence, 7s friends) |
| `stopHeartbeats()` | lines 903-908 | lines 184-189 | Identical |
| `sendPresenceHeartbeat()` (`POST /api/presence`) | lines 910-929 | lines 191-202 | Identical payload shape |
| `refreshFriendsData()` (`GET /api/friends` + `/api/friends/requests`) | lines 932-953 | lines 204-215 | Identical |
| `renderFriendsList(friends)` | lines 1000-1105 | lines 218-318 | Same algorithm (sort by hosting→online→offline→alpha, same card markup) |
| `renderFriendRequests(requests)` | lines 955-985 | lines 321-351 | Identical markup |
| `handleFriendRequest(requestId, accept)` (`POST /api/friends/requests/handle`) | lines 987-998 | lines 353-364 | Identical |
| `handleAddFriend()` / `btnAddFriend` click (`POST /api/friends/request`) | lines 372-389 (`handleAddFriend` is implicit) and line 812 (`btnProfileAddFriend`) | lines 367-389 | overlay.js has a cleaner `handleAddFriend`; friends-feature.js splits it across `btnAddFriend`-less path + profile button |
| `btnShare` click handler (start/stop tunnel via `window.electronAPI.ensureFrpc` + `startFrpcTunnel`) | lines 411-549 | lines 392-451 | Same algorithm; overlay.js is shorter |
| `btnFriendsShareCancel` / `btnShareCancel` cancel-host handler | lines 552-570 | lines 454-471 | Identical |
| `stopSharingTunnel()` (overlay.js only — friends-feature.js inlines it in btnShare) | n/a (inlined at lines 411-453) | lines 473-490 | overlay.js extracted a helper |
| `renderSharingActive()` / `renderSharingInactive()` | (inlined) | lines 492-505 | overlay.js extracted helpers |
| Tunnel link click → copy to clipboard | lines 602-607 | lines 507-512 | Identical |
| `joinFriendWorld(friend)` (extract host:port, copy to clipboard, optionally launch) | lines 1118-1219 | lines 515-524 | **friends-feature.js version is much richer** (auto-switches loader/version, calls `actions.playGame()`); overlay.js just copies the IP |
| `onFrpcTunnelClosed` listener (reset UI on unexpected close) | lines 581-598 | lines 528-536 | Identical intent |
| `onFrpcInstallProgress` listener | lines 574-579 | lines 538-542 | Identical intent |
| Logout flow (clears `idk_connect_token` + `idk_connect_user`) | lines 393-408 | lines 160-172 | Identical |

**Functions in `friends-feature.js` that have NO counterpart in `overlay.js`:**
- `tabLogin`/`tabRegister` tab switching + `btnSubmit` auth flow (lines 248-386)
- `showAuthError()` (line 388)
- `showPanel(name)` panel switcher (line 610)
- `handleSearchUsers()` (`GET /api/users/search`) — line 694
- `openUserProfile(username)` (`GET /api/users/:username/profile` + skinview3d render) — line 737
- `btnProfileAddFriend` handler — line 808
- Settings panel handlers (bio save, security OTP, link Minecraft) — lines 822-888
- `formatChatTime(timestamp)` — line 1221
- `enterChat(friend)` / `exitChat()` / `loadChatMessages()` / `handleSendMessage()` / `escapeHtml()` — chat system, lines 1244-1412
- `attemptAutoLogin()` (`POST /api/auth/login-minecraft`) — line 1414
- Background unread-count poller — lines 1468-1495

**Functions in `overlay.js` that have NO counterpart in `friends-feature.js`:**
- Browser iframe navigation (`openBrowserView`, `closeBrowserView`, `navigateBrowser`, back/forward/reload/home handlers) — lines 584-730
- `applySessionData(data)` (reads `currentPlayingVersion` from `getOverlayData` IPC) — lines 556-561
- `onOverlayInit` / `onToggleOverlay` listeners — lines 571-579

**Conclusion:** The overlay.js duplicates ~500 lines of friends/auth/tunnel
logic. It should be refactored to:
1. Import the IDK Connect client from a shared module (or, after migration,
   call the same IPC channels).
2. Keep only the overlay-specific concerns: session data sync, browser iframe,
   toast rendering.

---

## 10. Summary: migration checklist

### 🔴 Critical (security: tokens, auth, external fetches)

1. **Move IDK Connect JWT out of localStorage into `SecretStore`.** The token
   is currently XSS-exfiltratable and shipped over plaintext HTTP.
   Files: `friends-feature.js`, `overlay.js`.

2. **Route every `api.somniac.me` call through IPC.** Create a new
   `IdkConnectClient` infrastructure client + new IPC namespace
   `IdkConnect.*` (Login, Register, Verify2fa, RequestOtp, GetMe,
   LinkMinecraft, LoginWithMinecraft, UpdateProfile, UpdateSecurity,
   RequestSecurityOtp, SendPresence, GetFriends, GetFriendRequests,
   SendFriendRequest, HandleFriendRequest, RemoveFriend, GetMessages,
   SendMessage, SearchUsers, GetUserProfile). **Requires the IDK Connect
   backend to support HTTPS** before the v2 `HttpClient` allowlist can be
   safely extended.

3. **Delete the renderer-side `fetch("https://authserver.ely.by/auth/authenticate")`
   fallback** in `auth-feature.js:111-122`. The IPC path
   (`Auth.ElybyAuthenticate` → `ElybyClient.authenticate`) already exists and
   must be the only path.

4. **Delete the `idkRequest()` HTTP wrapper** in both `friends-feature.js:201`
   and `overlay.js:119`. After migration, the renderer should never construct
   a `fetch()` to `api.somniac.me` — it should call IPC methods.

5. **Delete `IDK_BACKEND_URL` and `idk_backend_url` localStorage key.** The
   backend URL is a config concern, not a renderer-overridable setting. Move
   to `src/infrastructure/` config or env.

6. **Move `atob(textureProp.value)` JWT decoding** out of `skin-texture.js`
   into `ElybyClient` (extend its `fetchProfile` to return decoded texture
   URLs).

7. **Expand the v2 `HttpClient` host allowlist** to add `api.curse.tools`
   (or replace with `api.curseforge.com` + API key from env), `launchercontent.mojang.com`,
   `minotar.net`, `skinsystem.ely.by`. (Note: `skinsystem.ely.by` overlaps with
   `skins.ely.by` — confirm which one Ely.by actually serves.)

8. **Stop the renderer from sending `Authorization: Bearer` headers.** All
   such headers must originate in the main process.

### 🟠 High (architecture: business logic, file system)

9. **Delete `crash-analyzer-feature.js`** entirely. Wire `CrashAnalyzerService`
   (`src/domain/services/crash-analyzer.ts`, already exists) to a new IPC
   `Crash.Analyze` channel. Renderer keeps only the HTML rendering of the
   returned `CrashReport`.

10. **Delete `mod-resolver-feature.js`** entirely. Wire `ModResolverService`
    (`src/domain/services/mod-resolver.ts`, already exists) to new IPC
    channels `Mod.ScanMissingDependencies`, `Mod.ResolveDependencies`,
    `Mod.CheckIncompatibilities`. New use-cases:
    `ResolveModDependencies`, `InstallModDependencies`.

11. **Delete `mod-updates-feature.js`** entirely (or refactor to a thin UI
    wrapper). Create new use-cases `CheckModUpdates`, `InstallModUpdate`,
    `GetModChangelog`. Create a new domain service `ModVersionMatcher` for
    the version-equivalence logic (lines 280-415).

12. **Refactor `modpacks-feature.js`** to delegate every external API call to
    IPC. The 23+ direct `fetch()` calls to Modrinth and CurseForge must go
    through `ModrinthClient` / `CurseforgeClient` (both exist). The
    mod-install orchestration in `mpAddItem()` (lines 2675-3900) must move
    into a new use-case `InstallModFromBrowser`. The `idk_modpacks`
    localStorage blob must be replaced by `Modpack.ScanProfiles` (read) +
    `Modpack.UpdateProfile` (write).

13. **Move version manifest fetching** from `version-feature.js:188` to a new
    IPC `Version.GetManifest` that delegates to `MojangClient.getManifest`
    (exists).

14. **Move mod search** from `modpacks-feature.js:2430` and
    `mod-updates-feature.js:189` to a new IPC `Mod.Search` that delegates to
    `ModrinthClient.searchMods` / `searchModpacks` (exist).

15. **Move mod version listing** (`modpacks-feature.js:2984,3587,3731,3795`,
    `mod-updates-feature.js:236`, `mod-resolver-feature.js:52`,
    `version-feature.js:175`) to new IPC `Mod.GetVersions` →
    `ModrinthClient.getVersions` (exists).

16. **Move mod project fetch** (`mod-updates-feature.js:422`,
    `mod-resolver-feature.js:45,96`, `modpacks-feature.js:3094,3638`) to new
    IPC `Mod.GetProject` → `ModrinthClient.getProject` (exists).

17. **Wire up the unregistered mod IPC channels.** `IpcChannel.Mod.Install`,
    `Mod.InstallToVersion`, `Mod.InstallResourcepack`, `Mod.InstallShader`,
    `Mod.Remove`, `Mod.RemoveResourcepack`, `Mod.RemoveShader`,
    `Mod.ExtractIcon`, `Mod.ExtractAllIcons`, `Mod.ImportExternalFiles`,
    `Mod.DownloadCurseforgeModpack`, `Mod.DownloadModrinthModpack` are all
    declared in `src/shared/ipc-channels.ts` but **have no handlers**
    (the shim at `electron-api-shim.js:153-157` stubs them as no-ops). Without
    these, the renderer's mod-install buttons silently fail.

18. **Move CurseForge modpack import** (the `downloadTask` async workers at
    `modpacks-feature.js:1842-1962` and `2796-2920`) into a new use-case
    `ImportCurseforgeModpack` that uses `CurseforgeClient` + the unified
    `DownloadQueue`.

19. **Stop the renderer from writing `localStorage.setItem('idk_modpacks', …)`.**
    The 16+ write sites listed in §7.1 should all become IPC calls to
    `Modpack.UpdateProfile` (or new `Modpack.AddMod`, `Modpack.RemoveMod`,
    `Modpack.AddResourcepack`, etc.).

20. **Stop the renderer from maintaining `idk_downloaded_versions` in
    localStorage.** Always call `Version.ScanDownloaded` (exists).

21. **Flip the settings persistence direction.** Today the renderer writes to
    localStorage AND calls `saveSettings()` (mirror). The backend should be
    authoritative; the renderer should call `loadSettings()` on startup and
    `saveSettings()` on change, and never touch localStorage for settings
    keys. The 30+ localStorage writes in `settings-feature.js` and the
    `settings-migration.js` shim should be deleted.

22. **Move the IDK Connect custom OTP+2FA auth flow** (renderer-side state
    machine in `friends-feature.js:272-386`) into a new use-case
    `AuthenticateIdkConnect` with steps: `RequestOtp`, `Register`, `Login`,
    `Verify2fa`. The renderer should just call the use-case and receive a
    session.

23. **Move `attemptAutoLogin()`** (`friends-feature.js:1414-1446`) into a
    use-case `AutoLoginWithMinecraft` that pulls the MC session from
    `SecretStore` and calls the IDK Connect backend.

24. **Move skin-texture URL resolution** (`skin-texture.js:3-76`,
    `getSkinTextureUrl` + `getCapeTextureUrl`) into a new use-case
    `ResolveSkinTexture` that uses the extended `ElybyClient` (with texture
    decoding) and falls back to Minotar via `HttpClient`. The renderer's
    `loadAvatarForUser()` should just call the IPC and draw the returned
    base64.

25. **Move the version-closeness scoring logic**
    (`modpacks-feature.js:542-619`: `buildMcVersionCandidates`,
    `buildSimpleVersionCandidates`, `scoreGameVersionTag`,
    `pickClosestGameVersion`) into a new domain service
    `ModrinthVersionPicker`. Same for `extractVersionFromFilename` (line 484).

26. **Move `safeJson()` + `fetchWithTimeout()`** (`modpacks-feature.js:8-44`)
    to the bin — the v2 `HttpClient` already provides both.

### 🟡 Medium (duplication: overlay.js vs friends-feature.js)

27. **Refactor `overlay.js` to import a shared IDK Connect client module**
    instead of duplicating ~500 lines of friends/auth/tunnel logic. After the
    Critical items above are done, both files should call the same IPC
    channels — the duplication disappears naturally. Until then, every bug
    fix has to be applied twice.

28. **Specifically deduplicate** (per §9 table): `IDK_BACKEND_URL`,
    `idkToken`, `idkUser`, `idkRequest()`, `updateAuthUI()`, `startHeartbeats()`,
    `stopHeartbeats()`, `sendPresenceHeartbeat()`, `refreshFriendsData()`,
    `renderFriendsList()`, `renderFriendRequests()`, `handleFriendRequest()`,
    `handleAddFriend()`, `btnShare` click, `btnShareCancel` click,
    `stopSharingTunnel()`, tunnel-link-click-to-copy, `onFrpcTunnelClosed`
    listener, `onFrpcInstallProgress` listener, logout flow.

29. **Keep the overlay's unique concerns** (browser iframe, session-data
    sync, toast rendering) in `overlay.js`. Everything else should go.

30. **Reconcile `joinFriendWorld()` divergence**: `friends-feature.js` (line
    1118) auto-switches loader+version and launches the game;
    `overlay.js` (line 515) only copies the IP. Decide which behavior is
    correct and share it.

### 🟢 Low (cleanup: hardcoded URLs that could be config)

31. **Centralize all remaining hardcoded URLs** (Ely.by profile, Minotar,
    Mojang content, Modrinth base, CurseForge base, edge.forgecdn.net) into
    the `HttpClient` allowlist + per-client `base` constants in
    `src/infrastructure/net/api/*-client.ts`. The renderer should never
    construct a URL from a string literal.

32. **Delete the `idk_backend_url` localStorage key** entirely (renderer
    should not be able to redirect backend traffic).

33. **Move the hardcoded `media.forgecdn.net` fallback thumbnails**
    (`content-feature.js:65-92`) into a constants module under
    `src/shared/` so they're not buried in renderer code.

34. **Remove the `idk-cache://` URL rewriting in `content-feature.js:18-21,112,139`**
    in favor of the main process returning already-cacheable URLs (or
    registering a proper Electron protocol handler that goes through
    `HttpClient`).

35. **Document the IDK Connect HTTPS requirement.** The v2 `ElybyClient`
    source comment says the HTTP backend was declared out of scope; either
    get the backend onto HTTPS or formally accept the risk and document it.

---

## Appendix A: v2 backend capability inventory (for reference)

### IPC channels registered (have handlers)
- `Window.*` (5) — minimize, maximize, close, state-changed, toggle-devtools
- `System.*` (9) — get-user-data-path, get-versions-path, open-external, open-minecraft-folder, select-*-folder, select-image-file, select-modpack-zip, select-export-zip, renderer-log
- `Auth.*` (7) — microsoft-authenticate, get-microsoft-auth-data, fetch-microsoft-profile, elyby-authenticate, get-elyby-auth-data, fetch-elyby-profile, sign-out
- `Skin.*` (2 of 4 registered) — fetch-image-base64 ✅, upload-microsoft-skin (stub) ⚠️, equip-microsoft-cape ❌, select-microsoft-cape ❌
- `Version.*` (3) — scan-downloaded, download, cancel-download
- `Launch.*` (8) — minecraft, cancel, progress, game-launched, closed, error, warning, clear-java-path
- `Modpack.*` (4) — scan-profiles, delete-folder, update-profile, launch
- `Mod.*` (3 of 12 registered) — install ✅, export-modpack ✅, unzip-curseforge ✅; **install-to-version, import-external-files, download-curseforge-modpack, download-modrinth-modpack, remove, install-resourcepack, remove-resourcepack, install-shader, remove-shader, extract-icon, extract-all-icons** — **all unregistered**
- `Download.*` (10) — start, pause, resume, cancel, cancel-all, progress, complete, error, paused, resumed, cancelled
- `Settings.*` (7) — load, save, reset, export ❌, import ❌, get-by-category, search, get-categories
- `Overlay.*` (4 of 9 registered) — get-data ✅, set-idk-connect-data ✅ (stub), close ✅, hide-window ✅, resume-game ✅; **init, toggle-ui, toggle, sync-connect** — **unregistered**
- `Achievements.*` (2) — scan-profile (stub), scan-all (stub)
- `Crash.*` (1 of 2 registered) — auto-install ✅ (stub); **missing-dependencies** — **unregistered**
- `Update.*` (7) — check, download, install, available, progress, downloaded, error
- `Tunnel.*` (5) — ensure-frpc, start (requires token!), stop, install-progress ❌, closed
- `Startup.*` (1) — show-notification ❌

### IPC channels NOT registered (declared but no handler)
- `Skin.EquipMicrosoftCape`, `Skin.SelectMicrosoftCape`
- `Mod.InstallToVersion`, `Mod.ImportExternalFiles`, `Mod.DownloadCurseforgeModpack`, `Mod.DownloadModrinthModpack`, `Mod.Remove`, `Mod.InstallResourcepack`, `Mod.RemoveResourcepack`, `Mod.InstallShader`, `Mod.RemoveShader`, `Mod.ExtractIcon`, `Mod.ExtractAllIcons`
- `Settings.Export`, `Settings.Import`
- `Overlay.Init`, `Overlay.ToggleUi`, `Overlay.Toggle`, `Overlay.SyncConnect`
- `Crash.MissingDependencies`
- `Tunnel.InstallProgress`
- `Startup.ShowNotification`
- `Version.ScanVersionMods`

### Use-cases that exist
- `AuthenticateMicrosoft`, `AuthenticateElyby`
- `LaunchGame`
- `InstallModpack`, `ExportModpack`, `ImportModpack`, `SearchModpacks`

### Use-cases that DON'T exist (needed)
- `AuthenticateIdkConnect` (custom OTP+2FA flow)
- `AutoLoginWithMinecraft` (IDK Connect)
- `CheckModUpdates`, `InstallModUpdate`, `GetModChangelog`
- `ResolveModDependencies`, `InstallModDependencies`, `ScanMissingDependencies`, `CheckIncompatibilities`
- `InstallModFromBrowser` (single mod into existing modpack)
- `ImportCurseforgeModpack` (full CurseForge modpack import)
- `ResolveSkinTexture`, `ResolveCapeTexture`
- `AnalyzeCrash` (wraps `CrashAnalyzerService`)

### Domain services that exist but aren't wired to IPC
- `CrashAnalyzerService` (`src/domain/services/crash-analyzer.ts`)
- `ModResolverService` (`src/domain/services/mod-resolver.ts`)
- `VersionFilterService` (`src/domain/services/version-filter.ts`)
- `IntegrityPolicy` (`src/domain/services/integrity-policy.ts`)

### Infrastructure clients that exist
- `HttpClient` (with SSRF allowlist)
- `ModrinthClient`, `CurseforgeClient`, `ElybyClient`, `MojangClient`
- `DownloadQueue`, `JavaService`, `LaunchService`, `DiscordRpcService`, `UpdaterService`, `TunnelService`
- `JavaDetector`, `PathService`, `SettingsStore`, `ModpackRepository`
- `SecretStore`

### Infrastructure clients that DON'T exist (needed)
- `IdkConnectClient` (api.somniac.me — needs HTTPS)
- `MojangContentClient` (launchercontent.mojang.com — for news)
- `MinotarClient` (minotar.net — for skin fallbacks)

---

## Appendix B: File-by-file severity summary

| File | LOC | Severity | Primary concern |
|---|---|---|---|
| `friends-feature.js` | 1497 | 🔴 Critical | Owns entire IDK Connect client: JWT, auth, friends, chat, presence, OTP flow. Must be split into many IPC calls. |
| `overlay.js` | 731 | 🔴 Critical | Duplicates ~500 lines of friends-feature.js. Must be deduplicated + IPC-routed. |
| `modpacks-feature.js` | 4365 | 🔴 Critical | 23+ direct Modrinth/CurseForge fetches; complex install orchestration; localStorage as DB. |
| `auth-feature.js` | 313 | 🟠 High | Direct Ely.by auth fetch fallback; auth-flow state machine in renderer. |
| `mod-updates-feature.js` | 447 | 🟠 High | Entirely business logic (version comparison) that belongs in a domain service. |
| `mod-resolver-feature.js` | 203 | 🟠 High | Entirely business logic (dependency resolution) that belongs in a domain service. |
| `crash-analyzer-feature.js` | 252 | 🟠 High | Entirely business logic (crash analysis) — `CrashAnalyzerService` already exists in v2. |
| `version-feature.js` | 371 | 🟠 High | Direct Mojang manifest + Modrinth sodium fetches; localStorage for selected loader. |
| `content-feature.js` | 369 | 🟠 High | Direct Mojang news + CurseForge trending fetches; `idk-cache://` URL rewriting. |
| `skin-texture.js` | 137 | 🟠 High | `atob()` JWT decoding; direct minotar/ely.by URL construction. |
| `launch-feature.js` | 969 | 🟠 Medium | Heavy localStorage usage; authData retrieval (already IPC); modpack state from localStorage. |
| `profile-feature.js` | 925 | 🟠 Medium | Skin viewer orchestration (mostly OK); 3D texture capability detection (OK); reads `idk_playtime` from localStorage. |
| `settings-feature.js` | 1281 | 🟢 Low | 30+ localStorage.setItem calls (already mirrored via saveSettings); flip to backend-authoritative. |
| `electron-api-shim.js` | 185 | 🟢 Low | Documents the v1→v2 bridge; 12 stubs marked `TODO(v2-backend)` — these are the unregistered IPC channels listed in Appendix A. |
| `overlay.html` | 195 | 🟢 Low | Embeds a Google iframe; loads Google Fonts. Presentation only. |

**Total renderer LOC with backend concerns: ~12,000 lines.**
After migration, this should shrink to ~3,000-4,000 lines of pure presentation
code, with all backend logic in `src/main/`, `src/application/use-cases/`, and
`src/infrastructure/`.
