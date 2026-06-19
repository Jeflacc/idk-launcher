# Renderer Architecture

`main.js` is the renderer bootstrap. It loads settings from the backend, renders the shell, creates shared view controls, and dynamically imports all feature modules.

## Folders

- `app/` owns the static application shell markup (`app-shell.js`).
- `core/` owns shared runtime state (`app-state.js`), view switching (`views.js`), safe parsing (`safe-parse.js`), and skin texture helpers (`skin-texture.js`).
- `components/` owns reusable UI pieces: `accessibility-manager.js` (WCAG), `confirm-dialog.js` (in-app confirm), `download-progress.js`, `error-display.js`, `settings-ui.js`.
- `features/auth/` owns login, Ely.by OAuth, Microsoft auth, profile display, avatar loading, and skin viewer UI.
- `features/background/` owns canvas background effects (particles, etc.).
- `features/content/` owns Mojang news, trending modpacks, update checks, marketplace browsing, and top navigation transitions.
- `features/crash-analyzer/` owns crash log parsing, common error detection, and fix suggestions.
- `features/desktop/` owns Electron focus/click-through helpers.
- `features/friends/` owns IDK Connect: friends system, real-time chat, friend requests, LAN sharing via frpc, search, settings panel, and profile panel.
- `features/game-features/` owns integration of crash analyzer, mod update checker, and dependency resolver into UI modals.
- `features/launch/` owns play flow, launch IPC listeners, launch overlay, warnings, and playtime tracking.
- `features/mod-resolver/` owns mod dependency detection via Modrinth API and auto-install.
- `features/mod-updates/` owns mod update checking on Modrinth and CurseForge.
- `features/modpacks/` owns modpack profiles, import/export, installed items, browsing, and modpack launch requests.
- `features/overlay/` owns the in-game overlay (HTML, CSS, JS) with borderless fullscreen and Shift+Tab toggle.
- `features/profile/` owns the user profile page with 3D skin viewer, achievements tracker, and playtime display.
- `features/settings/` owns Java path, memory controls, settings navigation, themes, blur, font scale, background effects, and desktop utility buttons.
- `features/tutorial/` owns the first-run tutorial system.
- `features/versions/` owns Minecraft version and loader selection (`version-feature.js`) and per-version mod management (`version-mods-feature.js`).

## Rules For New Work

- Add feature code to the matching `features/<name>/` folder.
- Keep `main.js` as bootstrap glue only.
- Put shared mutable renderer state in `core/app-state.js`.
- Expose cross-feature behavior through `actions` only when a feature genuinely needs to call another feature.
- Prefer dynamic imports for feature modules so Vite can keep clear chunk boundaries.
