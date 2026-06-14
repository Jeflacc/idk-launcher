# Agent Steering — IDK Launcher

## Project Overview

IDK Launcher is an Electron-based Minecraft client manager with a glassmorphic UI.
Tech stack: Vite + Vanilla JS/CSS frontend, Electron + Context Bridge backend.

## Architecture

- `electron-main.cjs` — Main process: IPC handlers, launch logic, auto-updater, frpc, skin loading
- `preload.cjs` — Context bridge exposing IPC to renderer
- `src/app/app-shell.js` — Full HTML shell (all views, modals, settings panels)
- `src/style.css` — All styles (~10k lines), CSS variables for theming
- `src/features/content/content-feature.js` — Modpack management, marketplace, chat, updates
- `src/features/settings/settings-feature.js` — Settings, blur, font scale, themes, background effects
- `src/features/friends/friends-feature.js` — Friends system, LAN, share cards
- `src/features/mcp/mcp-feature.js` — MCP protocol integration

## Key Conventions

- All UI is vanilla JS, no frameworks. HTML is inlined in `app-shell.js`.
- CSS uses CSS custom properties (`--theme-*`, `--accent-*`) for theming.
- IPC channel names follow `module:action` pattern (e.g., `launchers:launch-minecraft`).
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
