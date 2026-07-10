# IDK Launcher v2 — Production Rewrite

A complete, from-first-principles rewrite of `idk-launcher`. This is **not** a
refactor; it is a deliberate redesign of an Electron desktop Minecraft launcher
on modern, typed, secure architecture.

> **Status:** Architecture complete. All layers implemented to production
> quality. **Runtime verification must occur in an Electron environment** —
> this sandbox has no Electron runtime, so launch/auth/tunnel flows are
> implemented but not executed here.

## Architecture

```
src/
├── shared/         # Single source of truth: IPC channels, domain types, zod schemas
├── domain/         # Pure TypeScript — zero Electron imports, 100% unit-testable
│   ├── entities/   # Modpack, Account, Version, Download
│   ├── services/   # ModResolver, CrashAnalyzer, IntegrityPolicy, VersionFilter
│   └── events/     # Typed domain event bus
├── infrastructure/ # Electron/fs/net implementations of domain interfaces
│   ├── net/        # HttpClient (allowlisted, retried, integrity-checking) + API clients
│   ├── fs/         # PathService, ModpackRepository, SettingsStore, JavaDetector
│   ├── crypto/     # SecretStore (safeStorage-encrypted)
│   ├── minecraft/  # LaunchService (integrity ENFORCED, no monkey-patch)
│   ├── java/       # JavaService (cross-platform)
│   ├── download/   # DownloadQueue (the ONE queue — replaces 5 fragmented paths)
│   ├── tunnel/     # TunnelService (opt-in, user-provided token)
│   ├── updater/    # UpdaterService (electron-updater wrapper)
│   └── discord/    # DiscordRpcService
├── application/    # Use-cases orchestrating domain + infrastructure
├── main/           # Minimal Electron main process
│   ├── windows/    # WindowManager (3 sandboxed windows, sender validation)
│   └── ipc/        # Typed, zod-validated handlers
├── preload/        # Namespaced contextBridge API (replaces v1's flat 86-method surface)
└── renderer/       # React + TypeScript UI
    ├── app/        # Providers
    ├── components/ # Design-system primitives
    ├── stores/     # Zustand (router, session)
    ├── hooks/      # TanStack Query
    └── features/   # home, discover, modpacks, versions, skins, crash-analyzer, settings, friends
```

## What changed from v1 (security-critical fixes)

| v1 regression | v2 fix |
|---|---|
| `electron-main.cjs` 5,402-line god file | Layered architecture; largest file < 300 lines |
| 75 untyped `ipcMain` handlers | Typed `registerInvoke`/`registerSend` with zod validation + sender-frame checks |
| Flat 86-method preload | Namespaced `window.idk.{window,system,auth,launch,modpack,download,settings,version,skin,tunnel,update}` |
| Plaintext Microsoft/Ely.by tokens in `settings.json` | `safeStorage`-encrypted `SecretStore`; renderer never sees tokens |
| `minecraft-launcher-core` checksum monkey-patched to `true` | `IntegrityPolicyService` consulted; no global bypass |
| Global `https.get`/`https.request` monkey-patch | Per-request `AbortSignal`; host allowlist (SSRF protection) |
| 5-way fragmented download subsystem (DownloadQueueManager unreachable) | One `DownloadQueue` with a zod-validated contract |
| Duplicated `launch-minecraft` + `launch-modpack` handlers | One `LaunchGame` use-case |
| No sandbox, no CSP on any window | `sandbox:true` + CSP meta on every HTML entry |
| `open-external` with no URL allowlist (SSRF/RCE) | `http:`/`https:` scheme check |
| Hardcoded public FRP tunnel token | User-provided token, explicit opt-in |
| XSS sink in `content-feature.js` (`onclick="${JSON.stringify}"`) | React declarative rendering — no string-concat HTML |
| 8 `window.*` globals as event bus | Typed Zustand stores + domain event bus |
| `modpacks-feature.js` 4,365-line god module with 1,202-line `mpAddItem` | Decomposed into `ModpackEntity` + `ModpackRepository` + `InstallModpack`/`ExportModpack`/`ImportModpack` use-cases + `<Card>` component |
| 11,334-line `src/style.css` monolith | ~80-line `globals.css` design-token theme |
| Windows-only Java/runtime assumptions | Cross-platform `JavaService` + `JavaDetector` |
| 3 unused devDependencies (`jsdom`, `png-to-ico`, `vitest`) | Dependencies actually used; vitest wired for unit tests |

## Development

```bash
npm install
npm run dev          # vite + electron concurrently
npm run typecheck    # tsc --noEmit on app + node configs
npm run lint
npm test             # vitest (domain layer is 100% testable)
npm run dist:win     # build + electron-builder
```

## Runtime verification (must occur in Electron)

The following require an actual Electron runtime to verify end-to-end and are
**implemented but not executed** in this sandbox:

- Microsoft OAuth (msmc interactive popup) and Ely.by auth flows
- Minecraft launch pipeline (Java spawn, minecraft-launcher-core invocation)
- Overlay window (click-through, always-on-top)
- FRP tunnel (frpc subprocess)
- electron-updater (signed, published build)
- Discord RPC (IPC connection)
- safeStorage encryption (OS keychain availability)

The renderer UI, the typed IPC contract, the domain services, and the
infrastructure logic are all independently verifiable via `tsc` and `vitest`.
