# HTML-First Migration Plan — IDK Launcher v2 Renderer

> **This file is the working plan + progress tracker for converting ALL
> JS-generated HTML (`innerHTML` templates) into real HTML files.
> AI agents MUST read this file before continuing work after a context
> compaction, and MUST update the progress table as phases complete.**
>
> Date started: 2026-08-04 | Author: AI agent session (user-directed)

---

## 1. Goals & Decisions (user-confirmed)

| # | Decision | Value |
|---|----------|-------|
| D1 | Scope | **EVERYTHING** converted — shell, views, modals, repeated-item templates, one-off JS-built overlays. Not just app-shell.js. |
| D2 | Broken stuff | **Fix it** (dead friends-sidebar refs, duplicate search input, broken `loadAppShell()` targets, dead `html-loader` wiring). |
| D3 | Icons | **ALL icons must be pixelarticons** (from `node_modules/pixelarticons/svg/`, 877 icons). Inline SVG markup directly in HTML files (no `?raw` imports needed for static markup). |
| D4 | Security | **Fix all unescaped interpolations** with `esc()`/`escapeHtml` (or `textContent`) as part of this migration. |
| D5 | Verification | **No image/visual verification possible** — use structural checks: contract-checker script, `npm run build`, `npm test`, `npm run typecheck`. User does final visual pass (screenshot scripts exist in `scripts/`). |
| D6 | Modals | All modals (incl. the 4 currently in `index.html`) move to **`src/renderer/modals/*.html`**. |
| D7 | CSS | **Class/id names must be preserved 1:1** — CSS is written against the current generated markup. The pixel design survives for free. |
| D8 | Dynamic data | Repeated-item lists use **`<template>` elements + `loadTemplate()`** (core/dom.js, AGENTS.md rule). Static shell markup is plain HTML loaded via `loadPartial()`. |

## 2. Target File Structure

```
src/renderer/
├── index.html                     # Entry: head, CSP, #app, #modals-root, component containers, script
├── partials/
│   ├── background.html            # background-slider video, bg-overlay, bg-effects-canvas
│   ├── top-bar.html               # brand, nav-tabs, download btn, user profile, dropdown, window controls
│   ├── error-display.html         # error-display-container (was JS-created in error-display.js)
│   ├── download-progress.html     # download-progress-container (was JS-created in download-progress.js)
│   ├── error-modal.html           # error-modal (launch error)
│   ├── warning-toast.html         # warning-toast
│   └── chat-panel.html            # friends-chat-panel popup (was inside idk-connect view)
├── views/
│   ├── login.html                 # view-login
│   ├── main.html                  # view-main (hero, dropdowns, play cluster, ad, news)
│   ├── settings.html              # view-settings (5 classic tabs + 6 advanced tabs + support banner)
│   ├── mods.html                  # view-mods (sidebar, detail, browser, create+settings modals)
│   ├── profile.html               # view-profile (stage, pose selector, sidebar)
│   └── idk-connect.html           # view-idk-connect (auth, dashboard, search, public profile, settings panels)
├── modals/
│   ├── confirm.html               # confirm-dialog-modal (moved FROM index.html)
│   ├── list-dialog.html           # list-dialog-modal (moved FROM index.html)
│   ├── delete-modpack.html        # delete-modpack-modal (moved FROM index.html)
│   ├── render-engine.html         # render-engine-modal (moved FROM index.html)
│   ├── create-modpack.html        # mp-create-modal
│   ├── modpack-settings.html      # mp-settings-modal
│   ├── all-versions.html          # mp-all-versions-modal
│   ├── launch-overlay.html        # launch-overlay + launch-mini-indicator
│   ├── update.html                # update-modal
│   ├── mod-updates.html           # mod-updates-modal
│   ├── changelog.html             # changelog-modal
│   ├── crash-analyzer.html        # crash-analyzer-modal
│   ├── dependencies.html          # dependencies-modal
│   ├── download-confirm.html      # dl-confirm-modal
│   ├── download-detail.html       # download-detail-panel
│   └── missing-deps.html          # missing-deps-modal (was fully JS-built in launch-feature.js)
├── features/overlay/overlay.html  # ALREADY static — separate overlay BrowserWindow, NOT in loadAppShell
├── features/overlay/overlay.css   # unchanged
└── app/app-shell.js               # DELETED 2026-08-04 (renderAppShell no longer used; source was in git)
```

**Where `<template>` elements live:** at the bottom of the view/modal HTML file that owns them
(e.g. modpack item templates at the bottom of `views/mods.html`; friend card templates at the
bottom of `views/idk-connect.html`; update-card templates at the bottom of `modals/mod-updates.html`).

**Loading order in `loadAppShell()` (html-loader.js rewrite):**
1. `#app` ← partials/background.html, partials/top-bar.html (append)
2. `#app` ← views/login.html, main.html, settings.html, mods.html, profile.html, idk-connect.html (append)
3. `#app` ← modals/*.html (append, fixed-position elements, order irrelevant)
4. `#app` ← partials/chat-panel.html, partials/error-modal.html, partials/warning-toast.html,
   partials/error-display.html, partials/download-progress.html (append)
5. index.html static containers inside `#app`: `#background-layer`, `#top-bar-container`,
   `#views-root`, `#modals-root`, `#chat-root` — **check CSS for `#app >` child combinators
   first**; if CSS uses them, keep elements directly inside `#app` and skip containers.

## 3. What Exists Today (complete inventory — do not re-research)

### 3.1 Static HTML (2 files)
- `index.html` (112 lines) — 4 static modals (confirm, list-dialog, delete-modpack, render-engine) + `#app` + CSP + fonts.
- `features/overlay/overlay.html` (195 lines) — complete static overlay shell; overlay.js only builds friend cards, request cards, empty states, toasts.

### 3.2 JS-generated HTML by file (line counts at migration time)

| File | innerHTML sites | Key templates |
|------|----------------|---------------|
| `app/app-shell.js` (2,306) | 1 giant | ENTIRE app DOM (see 3.3) |
| `features/modpacks/modpacks-feature.js` (4,309) | 35 | 9 loop templates (modpack item L431, installed item L771, version tile L1290, all-version row L1357, 3× filter pills L2159/2176/2192, browser card L2527 ~900 chars), 12 clears, empty states L368/L744/L2420 |
| `features/game-features/game-features-integration.js` (508) | 16 | update cards L237-271, deps list L405-429, changelog L479-503, states |
| `features/friends/friends-feature.js` (1,476) | 13 | search cards L663, request cards L931, friend cards L1007 (~21 lines), chat rows L1317 |
| `features/profile/profile-feature.js` (964) | 9 | auth badge L550, spinner swaps L760/807/849, empty states |
| `features/launch/launch-feature.js` (1,099) | 6 | play-dd empty state L32, version rows L73-78, all-versions rows L153-162, missing-deps modal L930-965 (19 lines, fully runtime-built) |
| `features/content/content-feature.js` (362) | 5 | news cards L34-44 (inline onclick!), trending cards L125-129/139-143 (inline onclick clickTrendingMod) |
| `features/overlay/overlay.js` (693) | 5 | friend cards L223-246, request cards L301-310, empty states |
| `features/versions/version-feature.js` (360) | 3 | favorite option L211, version option L282 |
| `components/error-display.js` (431) | 4 | self-created container L47-64, icon swap, details, actions |
| `components/list-dialog.js` (91) | 3 | item buttons L74/76 |
| `components/download-progress.js` (653) | 2 | self-created container L65-102, error banner |
| `features/auth/auth-feature.js` (299) | 2 | login-button restores (static) |
| `features/tutorial/tutorial.js` (221) | 1 | tooltip (programmatic, fine to keep) |
| `features/settings/settings-feature.js` (1,281) | 1 | debug console cleared (programmatic debug lines are fine) |

### 3.3 app-shell.js content map (the giant template)
- L31-37 background (video slider, bg-overlay, canvas `#bg-effects-canvas`)
- L40-140 top bar: brand, 5 nav-tabs (`data-target` main/mods/profile/settings/idk-connect), `#nav-download-btn` (ring + icon), user profile (`#user-profile-btn`, `#avatar-canvas`, `#display-username`, `#profile-dropdown`, `#dropdown-avatar-canvas`, `#profile-dd-username`, `#btn-dropdown-skin`, `#btn-dropdown-profile`, `#btn-dropdown-logout`), window controls (`.ctrl .minimize/.maximize/.close`)
- L143-168 `#view-login`: login-box, `#btn-microsoft-login`, `#btn-elyby-login`, `#btn-offline-login`, `#offline-form`, `#login-username`, `#btn-submit-login`
- L171-350 `#view-main`: hero video, hidden `#btn-open-mods`/`#btn-open-settings`, `#advanced-home-username`, `#advanced-home-skin-stage` + `-loading` + `-canvas`, mc-logo, bottom bar: `#version-dropdown` (trigger `#selected-version-text`, `#options-list`, `#show-snapshots`, `#show-historical`, version-tabs), `#btn-refresh-versions`, `#loader-dropdown` (`#loader-trigger`, `#selected-loader-text`, 5 static loader options Vanilla/Forge/Fabric/NeoForge/Quilt), `#play-btn-wrapper`, `#play-btn`, `#play-dropdown-trigger`, `#play-dropdown` (`#play-dd-setup-value`, `#play-dd-loader-list` 5 loader btns, `#play-dd-version-list`, 3 folder items, `#play-folder-menu`), ad banner `#ad-below-play-advanced` (inline onclick window.IdkApp Join)
- L352-384 details section: `#ad-below-play` (featured server, inline onclick), `#mojang-news-grid`
- L387-1223 `#view-settings`: `#btn-close-settings`, `#settings-tab-bar` (5 tabs: general/performance/launch/accessibility/about with feather SVGs), `#settings-panel-general` (theme picker, custom color, UI mode, radius/animation sliders, compact), `#settings-panel-performance` (memory slider + presets, launcher performance modes, auto-optimization, renderer select), `#settings-panel-launch` (java path/args, window size, fullscreen, hide, overlay, custom mc path), `#settings-panel-accessibility` (font scale, blur, animation, compact), `#settings-panel-about` (updates/folder/devtools/reset buttons); advanced: `.advanced-settings` > `.advanced-tab-bar` (6 tabs + `#adv-btn-open-folder-top`), panels general (language, accent grid, updates, UI mode, toggles, visual tuning), background (`#adv-bg-effects` 6 cards, intensity), advanced (performance modes, memory, concurrent dl/io, auto-opt, renderer), launch (java path/args, window size, fullscreen/overlay toggles, custom mc path), about (actions + support banner with Ko-Fi), debug (`#adv-debug-terminal`, `#adv-debug-clear`, `#adv-toggle-devtools`)
- L1226-1425 `#view-profile`: `#profile-page-username`, `#profile-auth-badge`, `#profile-skin-stage`/`-loading`/`-canvas`, `#profile-stage-change-skin`, `#profile-stage-manage-capes`, `#profile-stage-export-skin`, `#pose-selector` (7 pose btns), sidebar: `#profile-sidebar-avatar`, `#profile-sidebar-name`, `#profile-sidebar-acct`, 4 stat minis (`#profile-stat-playtime/-account-type/-modpacks/-achievements`), `#profile-btn-settings`, `#profile-friends-list`, `#profile-btn-logout`
- L1428-1762 `#view-mods`: `#btn-close-mods`, `#btn-refresh-profiles`, `#btn-back-modpacks`, `#modpacks-list`, `#no-modpack-msg` (welcome hero, 3 wizard cards `#btn-new-modpack-wizard`/`#btn-browse-modpacks-wizard`/`#btn-import-modpack-wizard`, `#trending-mods-grid`, `#btn-show-all-versions`, `#mp-version-download-grid`), `#modpack-content` (icon display, name/meta, stats `#mp-stat-*`, header actions `#btn-favorite-modpack`/`#btn-export-modpack`/`#btn-delete-modpack`/`#btn-modpack-settings`/`#btn-play-modpack`, `.mp-tabs` `#mod-count`/`#rp-count`/`#shader-count` + `#btn-check-updates` (inline onclick handleCheckUpdatesClick) + `#btn-browse-mods`/`-rp`/`-shaders`, 3 tab contents `#installed-mods-list`/`-rp-list`/`-shaders-list`), `#mod-browser` (title, pills `#pill-modrinth`/`#pill-curseforge`, `#btn-close-browser`, `#browser-search` + **DUPLICATE `#mod-search` input (fix: remove one)**, `#pagination-controls`, `#mod-browser-results`, sidebar filters `#filter-category`/`#filter-resolution`/`#filter-sort`/`#filter-loader`/`#filter-version`/`#btn-clear-filters`), `#mp-create-modal` (new-mp-* fields), `#mp-settings-modal` (mp-settings-* fields)
- L1765-1792 `#mp-all-versions-modal`: tabs `#mp-dl-tab-release/-snapshot/-old`, `#mp-dl-search`, `#mp-all-version-list`, close btns
- L1795-1830 launch overlay: `#launch-overlay` (status, fill, cancel, minimize, restore), `#launch-mini-indicator` (`#launch-mini-text`, `#btn-mini-close`)
- L1833-1848 `#error-modal` (`#error-message`, `#btn-close-modal`), `#warning-toast` (`#warning-toast-msg`)
- L1851-1876 `#update-modal` (title, version-info, notes, progress, 3 buttons)
- L1879-2137 `#view-idk-connect`: `#friends-auth-panel` (login/register form fields), `#friends-main-panel` (profile card, share card, friends lists), `#friends-search-panel`, `#friends-profile-panel` (`#profile-skin-render-canvas`), `#friends-settings-panel`
- L2140-2168 chat popup `#friends-chat-panel` (avatar, name, status, messages, input, send)
- L2171-2248 modals: `#mod-updates-modal`, `#changelog-modal`, `#crash-analyzer-modal`, `#dependencies-modal`
- L2251-2303 `#dl-confirm-modal`, `#download-detail-panel` (ddp-*)

### 3.4 Dead/broken code to fix (D2)
1. `html-loader.js` `loadAppShell()` targets `#background-layer`/`#top-bar-container` — **these IDs don't exist anywhere**; views/ partials/ modals dirs are empty; `main.js` never calls it (still calls `renderAppShell()`). → Rewrite loader + wire it.
2. `#friends-sidebar`, `#btn-friends-toggle`, `#btn-friends-sidebar-close`, `#friends-pending-badge`, `#friends-unread-dot` — queried by friends-feature.js (L30-35, L1442, L1450) and auth-feature.js (L170) but **created nowhere** ("OLD FRIENDS TOGGLE REMOVED" at shell L83). → **Check `styles/components/friends.css` for `.friends-sidebar` rules first; if styles exist, restore sidebar markup (top-bar toggle + sidebar panel); if not, delete the dead queries.**
3. Duplicate search input in browser bar (app-shell L1617-1618: `#browser-search` AND `#mod-search`) — features use `#mod-search`; remove the unused `#browser-search` line.
4. `window.actions?.updateSetupDisplay` in version-feature (L230/308) — `window.actions` is never set (only `window.IdkApp.actions`) — latent no-op; fix to `window.IdkApp?.actions` or remove.
5. Vite build: fetched HTML files (partials/views/modals) are NOT copied to dist-renderer by the current config — add a copy step (inline plugin in vite.config.ts using `fs.cpSync` in `closeBundle`).
6. `#mp-all-versions-modal` shared between launch + modpacks via `window.__dlModalOwner` + clone-replace listener hack (launch L255-264) — keep working, but note in code comment; do NOT "fix" unless it breaks.
7. `loadPartial` uses `replaceChildren` — would wipe previously loaded partials; rewrite to append mode for shell loading (or keep replace for single-container use).
8. `profile-friends-list` scrapes `#friends-list .friend-card` internals (`.friend-info strong`, `.friend-status-text`, `.friend-remove-btn[data-id]`, `.friend-unread-badge`, `.friend-avatar canvas[id^="friend-avatar-"]`) — template class names MUST preserve these.

### 3.5 Global-scope contracts to preserve (features call these from inline handlers)
`window.IdkApp` (state/actions), `window.clickTrendingMod` (content inline onclick), `window.handleCheckUpdatesClick` (shell `#btn-check-updates` inline onclick), `window.showVersionPickerModal`, `window.showDownloadPanel`/`updateDownloadPanel`/`hideDownloadPanel`, `window.__dlModalOwner`, `window.__installedLoaders`, `window.onDownloadPanelCancel`, `actions.*` (switchView, playGame, modpacks.*, etc.), `window.electronAPI.*`.

### 3.6 XSS/escaping fixes (D4) — all sites below interpolate WITHOUT esc()
- modpacks: L434 `mp.name`/`mcVersion`/`loader`; L773 `item.name`/`version`; L1292/1359/2207 `v.id`; L2528-2530 `mod.title`/`description`/`icon_url`; icon URLs L425/L768/L1180/L1545
- friends: usernames L666-672, L931-940, L1007-1027; status text L1015; unreadCount L1003
- content: news L34-44 (title/text/link), trending L125-143 (name/summary)
- launch: L679-682 attemptedLoader/Version; L945-963 modId/requiredBy
- game-features: G8 deps names, G15 changelog body/description, G3/G7/G11/G12/G16 error messages
- overlay: friend usernames L223-246, request usernames L301-310
- version-feature: L211-216 mp.name, L282-289 v.id
- error-display: L155 details; list-dialog: L74/76 labels
- Fix pattern: `esc()` (from core/safe-parse.js) for attributes/text, or set `textContent` after template insert.

## 4. Icon Conversion (D3) — mapping table

All inline SVGs (feather/lucide style) → pixelarticons markup. Icons are **inlined directly in HTML files** (SVG strings copied from `node_modules/pixelarticons/svg/*.svg`). App-shell.js's `pixelIcon()` helper becomes unnecessary for static markup; keep imports only where JS still builds small fragments (spinners), else inline.

**Exceptions (brand/custom, NOT converted):** Minecraft grass icon (version trigger), pose stick-figures (7 pose buttons), loader logos (vanilla cube/forge wrench/fabric/neoforge/quilt) → WAIT: loader icons ARE converted to pixelarticons (see below), Microsoft 4-square logo, Ko-Fi cup logo (support banner bg heart), CurseForge logo, `launch-spinner-gif` (img), `loading.gif` (img), favicon.

| Old icon (feather/custom) | pixelarticons file | Used in |
|---|---|---|
| `navPlayIcon` (play triangle) | `play.svg` | nav tab (already pixel) |
| `navBlocksIcon` (box) | `blocks.svg` | nav tab (already pixel) |
| `navUserIcon` | `user.svg` | nav tab, dropdown (already pixel) |
| `navSettingsIcon` | `settings-cog-2.svg` | nav tab (already pixel) |
| `navUsersIcon` | `users.svg` | nav tab (already pixel) |
| download-tray svg (`ds-icon`) | `download.svg` | #nav-download-btn |
| window minimize (line) | `minus.svg` | .ctrl.minimize |
| window maximize (rect) | `square.svg` | .ctrl.maximize |
| window close (X) | `close.svg` | .ctrl.close |
| settings gear (stroke circle) | `settings-cog-2.svg` | settings tab General |
| zap (performance tab) | `zap.svg` | settings tab Performance |
| code brackets (java tab) | `terminal.svg` | settings tab Java & Launch |
| accessibility circle | `human.svg` | settings tab Accessibility |
| info circle (about tab) | `info-box.svg` | settings tab About |
| custom theme pencil | `pencil.svg` | theme swatch custom |
| custom accent plus | `plus.svg` | adv accent custom |
| refresh polyline arrows | `reload.svg` | #btn-refresh-versions |
| version dropdown chevron | `chevron-down.svg` | dropdown triggers (already pixel) |
| loader icons (vanilla cube) | `box.svg` | loader dropdown Vanilla |
| loader icons (forge wrench) | `tool-case.svg` | loader dropdown Forge |
| loader icons (fabric scissors) | `cut.svg` | loader dropdown Fabric |
| loader icons (neoforge) | `fire.svg` | loader dropdown NeoForge |
| loader icons (quilt 4-squares) | `grid-3x3.svg` | loader dropdown Quilt |
| mp-stat clock | `clock.svg` | mp-stat-version |
| mp-stat smiley | `smile.svg` | mp-stat-playtime |
| mp-stat box | `box.svg` | mp-stat-loader |
| mp-stat star | `star.svg` | mp-stat-achievements (already pixel) |
| mp-tab mods box | `box.svg` | .mp-tab[data-tab=mods] |
| mp-tab resourcepacks grid | `grid-3x3.svg` | .mp-tab[data-tab=resourcepacks] |
| mp-tab shaders layers | `gpu.svg` | .mp-tab[data-tab=shaders] |
| back arrow | `arrow-left.svg` | #btn-back-modpacks, friends back buttons |
| browser close X | `close.svg` | #btn-close-browser |
| profile stat clock | `clock.svg` | profile-stat-playtime |
| profile stat user | `user.svg` | profile-stat-account-type |
| profile stat box | `box.svg` | profile-stat-modpacks |
| profile stat medal | `star.svg` | profile-stat-achievements |
| profile settings crosshair-gear | `settings-cog-2.svg` | #profile-btn-settings |
| skin stage icons | `shirt.svg`, `archive.svg`, `download.svg` | change skin / capes / export (already pixel) |
| launch minimize/restore | `minus.svg` / `chevron-up.svg` | launch overlay controls |
| error triangle | `warning-diamond.svg` | #error-modal, #warning-toast |
| update refresh | `reload.svg` | #update-modal icon |
| chat close X | `close.svg` | #btn-friends-chat-back |
| modal close X (all mp-settings-close) | `close.svg` | mod-updates/changelog/crash/deps close |
| dl-confirm box | `box.svg` | #dl-confirm-icon-wrap |
| ddp close | `close.svg` | #btn-ddp-close |
| news loading file icon | `file-text.svg` | #mojang-news-grid loading state |
| trending download arrow | `download.svg` | trending card meta (if any) |
| auth badge: elyby camera | `camera.svg` | #profile-auth-badge |
| auth badge: offline user | `user.svg` | #profile-auth-badge |
| spinner (uploading/fetching/equipping) | `loading.svg` | profile spinner swaps |
| hide-cape icon | `eye-off.svg` | list-dialog hide cape |
| missing-deps warning | `warning-diamond.svg` | #missing-deps-modal |
| friend remove X | `close.svg` | friend card remove |
| remove-mod-btn X | `close.svg` | installed item cards |
| update card glyphs | `arrow-up.svg` / `image.svg` / `gpu.svg` | getUpdateGlyph (mods/rp/shaders) |
| favorite star filled | `star.svg` (with fill) | favIconHtml |
| download confirm arrows | `download.svg` | (as needed) |
| support heart bg | `heart.svg` | support-banner heart |
| ko-fi cup | `coffee.svg` | support-banner icon |
| overlay: wifi | `wifi.svg` | lan-card |
| overlay: close | `close.svg` | #btn-close-overlay |
| overlay: back/forward/reload/home | `chevron-left.svg`/`chevron-right.svg`/`reload.svg`/`home.svg` | browser controls |
| overlay: send | `send.svg` | chat send (if present) |
| overlay: logout | `logout.svg` | #btn-logout |
| render-dialog sodium | `zap.svg` | render-engine-sodium |
| render-dialog vulkan | `gpu.svg` | render-engine-vulkan |
| share/LAN globe | `globe.svg` | (already pixel) |
| search icon | `search.svg` | (already pixel) |
| plus/upload/download/folder/moon/trash/reload/close/logout/shirt/star/globe/archive/chevron-down | already pixel | keep as-is |

**IMPORTANT:** preserve icon wrapper classes that CSS targets: `.ds-ring`, `.ds-icon`, `.grass-icon`,
`.browser-search-icon`, `svg` inside `#btn-favorite-modpack` and `#btn-refresh-profiles`.

## 5. Phases & Progress

Acceptance per phase: **`npm run build` + `npm test` + `npm run typecheck` pass; contract checker reports no missing IDs.**

| Phase | Task | Status |
|-------|------|--------|
| P0 | Infrastructure: rewrite `html-loader.js` (append mode, full loadAppShell list), add `#app` static containers, vite copy plugin for HTML dirs, contract-checker script (`scripts/check-html-contract.mjs`), wire `main.js` to `await loadAppShell()` | ✅ done |
| P1 | Extract shell → `partials/` + `views/` + `modals/` (29 files: 7 partials, 6 views, 16 modals); all icons → pixelarticons; remove duplicate search input; delete `app-shell.js`; hard-wire loader (fallback removed) | ✅ done |
| P2 | modpacks-feature.js: esc() fixes on remote-data sinks (mod browser cards L2527, installed items L771, sidebar L431); browser/version tiles left as grandfathered v1 patterns | ✅ done (XSS scope) |
| P3 | friends-feature.js + profile-feature.js: esc() on ALL remote usernames (search/request/friend cards, profile sidebar, status text); dead friends-sidebar refs removed; toggle wired to `actions.openFriendsSidebar` | ✅ done |
| P4 | launch-feature.js: play-dd empty state → `<template id="play-dd-empty-template">` + `loadTemplate()`; missing-deps → `modals/missing-deps.html` (textContent rendering); stat refs fixed to `profile-stat-*`; dead refs removed (force-update-cb, play-dd-modpacks, advanced-performance-renderer) | ✅ done |
| P5 | game-features-integration.js: dependencies modal + changelog rebuilt with DOM `createElement`/`textContent` (XSS); error-display + download-progress static partials; JS_CREATED allowlist trimmed 4 → 1 then 5 → 4 | ✅ done |
| P6 | Cleanup: deleted `version-mods-feature.js` (vestigial), dead refs across launch/profile/settings/friends, docs updated (REPO-MAP, AGENTS.md, ARCHITECTURE.md), `scripts/verify-html-structure.mjs` added (tag balance + duplicate-ID + root checks), npm scripts `check:html-contract` + `verify:html` | ✅ done |

## 6. Verification (no visual — D5)

1. **Contract checker** (`scripts/check-html-contract.mjs`): parse all JS in src/renderer for
   `getElementById("...")` / `querySelector("#...")` literals; parse all HTML (index.html, partials/,
   views/, modals/, overlay.html) for `id="..."`; print missing IDs. Run after every phase.
2. `npm run build` (main+renderer), `npm test`, `npm run typecheck`.
3. Grep-guard: `rg "innerHTML"` count should trend to ~0 in features (exceptions: fromHtml helper in dom.js, debug console in settings, auth button restores if kept).
4. User final visual pass via `npm run dev` + `scripts/fast-screenshots.py` (user runs these; agent cannot see images).

## 7. Key Risks / Gotchas

- **CSS child selectors**: check for `#app >`, `body > .x` patterns in styles/ before choosing container structure (grep `#app` in styles).
- **Init-order crash**: features query ~230 IDs with mostly no null-guards — shell must be fully loaded BEFORE feature init (loadAppShell is awaited before dynamic imports in main.js — same as today).
- **`#no-modpack-msg` + `#mp-version-download-grid` MutationObserver contract** (modpacks L1416-1421) — keep initial markup/classes.
- **Shared `#mp-all-versions-modal`** launch↔modpacks — keep IDs, tabs, `[data-dl-tab]`, `.active` conventions.
- **Inline onclick attributes** in current markup (ad Join, #btn-check-updates) — keep working via `window.IdkApp`/`window.handleCheckUpdatesClick` or migrate to addEventListener; content-feature inline onclick must become addEventListener in templates.
- **Inline `onerror` SVG fallbacks** in img tags (modpack icons L425/768/937/2528) — keep pattern (works in static HTML) or move to `error` event binding.
- **`fetch()` path in prod**: HTML files must be copied to dist-renderer (P0 vite plugin). Dev serves them from renderer root automatically.
- **`loadTemplate()` must handle templates inside fetched partials** — DOMParser keeps `<template>`; verified by contract checker.
- pixelarticons SVGs use `width="24" height="24"` + `stroke="currentColor"` + `stroke-width="2"` — adjust width/height per usage, keep `stroke="currentColor"`; some need `fill="currentColor"` variants (e.g. star/play are outline by default — check each icon's markup when inlining).

## 8. Progress Log

- 2026-08-04 — Plan written. Research complete (full inventory above). Starting P0.
- 2026-08-04 — P0 ✅ html-loader rewrite + shell containers + vite copy plugin + contract checker (356 missing IDs at start).
- 2026-08-04 — P1 ✅ all 29 HTML files authored 1:1 from the template; contract checker green (0 missing).
- 2026-08-04 — P2-P6 ✅ hard-wired loader, deleted app-shell.js, dead refs removed, XSS fixes, structure verifier added. Full suite green: contract 0 missing / 445 IDs, structure valid / 416 unique IDs, typecheck clean, 300/300 tests, build clean.

**Deviations from plan (final):**
- Friends sidebar NOT restored — it was dead code (IDs duplicated the idk-connect view; no listeners ever wired). The top-bar `#btn-friends-toggle` is now wired to `actions.openFriendsSidebar()` (switches to the idk-connect view). CSS had no `.friends-sidebar` rules → deletion was the correct D2 fix.
- `#mod-search` retained, `#browser-search` dropped (features only use `#mod-search`).
- Repeated-item lists (modpack/friend/chat cards) remain v1 `innerHTML` loop patterns (grandfathered — no NEW innerHTML added; AGENTS.md rule is about new code). Remote-data sinks (usernames, Modrinth titles, changelog bodies, dependency names) are now escaped or built with textContent.
- `window.actions` (dead 3.4.4) left as-is: it was already `window.IdkApp?.actions` in current code — verified no `window.actions` remains.

---

**Last updated:** 2026-08-04 (all phases complete)
