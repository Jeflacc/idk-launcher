# Renderer Architecture

`main.js` is now only the renderer bootstrap. It renders the shell, creates shared view controls, and loads feature modules.

## Folders

- `app/` owns the static application shell markup.
- `core/` owns shared runtime state and cross-feature actions.
- `features/auth/` owns login, profile display, avatar loading, and skin viewer UI.
- `features/settings/` owns Java path, memory controls, settings navigation, and desktop utility buttons.
- `features/versions/` owns Minecraft version and loader selection.
- `features/launch/` owns play flow, launch IPC listeners, launch overlay, warnings, and playtime.
- `features/modpacks/` owns modpack profiles, import/export, installed items, browsing, and modpack launch requests.
- `features/content/` owns Mojang news, trending modpacks, update checks, and top navigation transitions.
- `features/desktop/` owns Electron focus/click-through helpers.
- `features/friends/` owns IDK Connect, friend presence, cloudflared sharing, and join flow.

## Rules For New Work

- Add feature code to the matching `features/<name>/` folder.
- Keep `main.js` as bootstrap glue only.
- Put shared mutable renderer state in `core/app-state.js`.
- Expose cross-feature behavior through `actions` only when a feature genuinely needs to call another feature.
- Prefer dynamic imports for feature modules so Vite can keep clear chunk boundaries.
