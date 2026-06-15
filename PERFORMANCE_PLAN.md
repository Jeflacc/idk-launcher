# Minecraft Game Performance Plan

## Goal: Maximize FPS, reduce stutter, minimize load times in the Minecraft game itself — not the launcher.

---

## Phase 1: JVM Argument Overhaul (Highest Impact, Zero User Effort)

### 1.1 Replace blank JVM args with smart defaults
- **Current**: `globalJavaArgs` is empty, user must paste flags manually
- **Fix**: Auto-generate JVM flags based on detected Java version + allocated RAM + CPU cores
- **Location**: `electron-main.cjs` — both `launch-minecraft` and `launch-modpack` handlers
- **Implementation**:
  ```js
  function buildJvmArgs(memoryGB, javaVersion, cpuCores) {
    const args = [];
    // GC selection
    if (javaVersion >= 21) {
      args.push('-XX:+UseZGC', '-XX:+ZGenerational');  // Sub-ms pause times
    } else {
      args.push('-XX:+UseG1GC');  // Classic Minecraft GC
    }
    // Common tuning
    args.push(
      '-XX:+ParallelRefProcEnabled',
      '-XX:-OmitStackTraceInFastThrow',
      '-XX:+UnlockExperimentalVMOptions',
      `-XX:MaxGCPauseMillis=${Math.max(25, 100 - memoryGB * 5)}`,
      '-XX:+PerfDisableSharedMem',
      '-XX:+AlwaysPreTouch',
      '-XX:+DisableExplicitGC',
      '-XX:+UseStringDeduplication',
    );
    // Young gen sizing: roughly 25% of heap, capped at 4GB
    const youngGen = Math.min(Math.max(256, memoryGB * 256), 4096);
    args.push(`-Xmn${youngGen}m`);
    // Thread stack
    args.push('-Xss1M');
    // Tiered compilation tuning for faster warmup
    args.push('-XX:TieredStopAtLevel=1', '-XX:Tier0ProfilingCounterThreshold=10', '-XX:Tier2CompileThreshold=100');
    return args;
  }
  ```
- Flags are still appended to `opts.customArgs`
- If user has typed their own in `globalJavaArgs`, those override/extend the auto-generated set

### 1.2 JVM Preset System (Optional UI)
- Replace free-text JVM field with 3 dropdown options + Custom
  - **Auto** (default) — generates flags per 1.1
  - **Max FPS** — same as Auto but uses `-XX:TieredStopAtLevel=1` for faster warmup
  - **Stable** — classic G1GC with conservative timing
  - **Custom** — free-text field (preserves current behavior)

### 1.3 Memory Slider Smart Guidance
- Detect total system RAM via `os.totalmem()`
- Show a recommended marker at 50% of system RAM
- Warn if user exceeds 50%: *"Allocating more than X GB may increase GC pause times and reduce FPS"*
- Cap slider max at `min(16, totalRAM - 2)` instead of hard 16

---

## Phase 2: Performance Mod Auto-Install (Loader-Native Boost)

### 2.1 Multi-Loader Support
- **Current**: `installSodium()` only works for Fabric
- **Fix**: Expand to detect loader (Fabric/Quilt/Forge) and install the correct variant

| Mod | Fabric/Quilt | Forge |
|-----|-------------|-------|
| Sodium | sodium | embeddium |
| Lithium | lithium | lithium-forge (mirror) |
| FerriteCore | ferrite-core | ferritecore (same artifact) |
| EntityCulling | entityculling | entityculling-forge |
| ImmediatelyFast | immediatelyfast | immediatelyfast-forge |

- Query Modrinth API per loader type
- Install into `profilePath/mods/`

### 2.2 Performance Mod Bundle
- Add a multi-select UI: "Optimize with:" checkboxes below the auto-optimization toggle
- Bundles: "Light" (Sodium + Lithium), "Full" (+ FerriteCore + EntityCulling + ImmediatelyFast)
- Stale mod cleanup: scan mods folder for known performance mods and update to latest

### 2.3 Mod Conflict Warning
- If user has manually installed mods known to conflict with performance mods (OptiFine, older Sodium versions), show a warning
- Check `mods/` folder for known JAR filenames

### 2.4 Sodium Version Pinning for Realms
- Detect if user needs compatibility version of Sodium (e.g., for Realms/online play)
- Offer to downgrade Sodium to a compatible version if they have connection issues

---

## Phase 3: options.txt Pre-Configuration

### 3.1 Performance Profile Selector
- Add a dropdown on the version settings page: "Graphics Preset"
  - **Performance** — `renderDistance: 6`, `simulationDistance: 4`, `particles: MINIMAL`, `entityDistanceScaling: 50`, `clouds: false`, `mipmapLevels: 1`, `gfx: 1`
  - **Balanced** — `renderDistance: 10`, `simulationDistance: 6`, `particles: DECREASED`, `entityDistanceScaling: 75`
  - **Quality** — (no changes, keep user defaults)
- On apply: write to `profilePath/options.txt` (create if not exists, update specific keys)

### 3.2 Hardware-Aware Defaults
- On first launch of a version:
  - Detect GPU: integrated vs dedicated (via `nvidia-smi` / `wmic` or GPU info)
  - Detect RAM tier: <8GB, 8-16GB, >16GB
  - Auto-select graphics preset based on hardware
  - Allow user to override

### 3.3 options.txt Resetter
- Button "Reset to Optimized Defaults" that rewrites the entire options.txt with performance-friendly values

---

## Phase 4: CPU & OS Launch-Time Tuning

### 4.1 Windows Power Plan
- Save current power plan, switch to High Performance before launching Java
- Restore after game exits
- Windows-only: `powercfg /setactive SCHEME_MIN`
- Non-Windows: skip

### 4.2 CPU Affinity (Hybrid CPUs)
- On Intel 12th-gen+ (P/E cores) or Apple Silicon:
  - Pin Java process to performance cores
  - Implementation: `powershell -Command "$Process = Get-Process -Id $pid; $Process.ProcessorAffinity = 0xFFFF"`
  - Variable: detect core topology via `wmic cpu get numberofcores` or Node.js `os.cpus()`

### 4.3 GPU Selection (Multi-GPU Laptops)
- On Windows: set `DXVK_FILTER_DEVICE_NAME` or GPU preference via `Set-GpuPreference`
- On macOS: ensure discrete GPU is selected
- On Linux: `DRI_PRIME=1` or similar

### 4.4 Anti-Stutter Launch
- Before game starts, run a short Java warmup (allocate temp heap, trigger JIT) to prime the JVM
- Clear disk cache: `emptyWorkingSet()` on non-essential processes (launcher itself)

---

## Phase 5: Advanced Optimizations

### 5.1 AppCDS (Application Class Data Sharing)
- After installing a profile, run `java -Xshare:dump -XX:SharedArchiveFile=...` to create a class archive
- At launch, pass `-XX:SharedArchiveFile=... -Xshare:auto`
- Reduces startup time by 30-50% and reduces memory fragmentation
- Need to regenerate when mods change (hook into mod install/update)

### 5.2 Large / Huge Pages
- Detect if Windows has `Lock Pages in Memory` privilege for the user
- If yes, add `-XX:+UseLargePages`
- If no, attempt `-XX:+UseTransparentHugePages` (Linux) or skip
- 10-20% throughput improvement for GC-heavy workloads

### 5.3 String Deduplication
- Already in Phase 1 flags (`-XX:+UseStringDeduplication`)
- Minecraft generates millions of duplicate strings (block names, item IDs, JSON parsing)
- Reduces heap usage by 5-15%, fewer GC pauses

### 5.4 Shader Pre-Compilation
- After installing Sodium/Iris/Oculus:
  - Pre-compile shaders by running a headless render pass
  - Cache compiled shaders to disk
  - Eliminates first-time stutter when entering new biomes/dimensions

---

## Implementation Order

```
Phase 1 (JVM) ─────────────────→ Phase 2 (Mods) ────────→ Phase 3 (options.txt)
     ↓                                ↓                        ↓
Phase 4 (CPU/OS) ←──────────────────────────────────────── Phase 5 (Advanced)
```

### Recommended Sprint Plan:

| Sprint | Work Items | Est. Days |
|--------|-----------|-----------|
| **1** | 1.1 JVM smart defaults + 1.3 memory guidance | 2 |
| **2** | 2.1 Multi-loader mod support + 2.2 mod bundle | 2-3 |
| **3** | 1.2 JVM preset UI + 3.1/3.2 options.txt config | 2 |
| **4** | 4.1 Power plan + 4.2 CPU affinity + 4.3 GPU | 1-2 |
| **5** | 5.1 AppCDS + 5.2 Large pages + 5.4 Shaders | 3-4 |

Total: ~10-13 days for all phases.

---

## Files to Modify

| File | Changes |
|------|---------|
| `electron-main.cjs` | `buildJvmArgs()`, modify launch handlers, AppCDS, power plan, CPU affinity |
| `src/features/settings/settings-feature.js` | Memory guidance UI, preset selector, options.txt integration |
| `src/app/app-shell.js` | JVM preset dropdown, memory recommendation, mod bundle UI |
| `src/style.css` | Performance profile cards, memory guidance styles |
| `src/features/versions/version-feature.js` | Sodium → multi-mod version detection, graphics preset UI |
| `src/features/launch/launch-feature.js` | Pass preset selection to main process |
| `preload.cjs` | New IPC channels: `writeOptionsTxt`, `optimize-profile` |
| `src/backend/settings-manager.cjs` | New settings: `jvmPreset`, `graphicsPreset`, `optimizationMods` |
| `.github/workflows/release.yml` | (no changes needed) |
| `package.json` | (maybe new dep for powercfg/CoreInfo on Windows) |

---

## Success Metrics

| Metric | Current Baseline | Target |
|--------|-----------------|--------|
| FPS (integrated GPU, 1.20+, Fabric) | ~30-40 | 60+ (with mod bundle) |
| FPS (discrete GPU, 1.20+, Fabric) | ~80-100 | 144+ (with mod bundle + JVM) |
| GC pause time | 50-200ms | <10ms (ZGC) |
| Startup time | 15-30s | <10s (AppCDS + JVM tuning) |
| Memory usage | 4-6GB | 3-5GB (string dedup + FerriteCore) |
