# IDK Launcher Changelog

## 🎮 IDK Launcher v1.4.0-preview.26w21e Changelog

Welcome to the hotfix preview revision **v1.4.0-preview.26w21e**! This is a critical build fix that resolves a crash on startup introduced in the previous preview build.

---

### 🔧 Fixes

* **🛠️ Critical Startup Crash Fix — Missing Backend Modules**
  - Fixed a startup crash (`Error: Cannot find module './src/backend/achievements-scanner.cjs'`) that occurred in all installed preview builds.
  - Root cause: `src/backend/` was not included in the `electron-builder` file packaging list, causing all backend `.cjs` modules (`achievements-scanner`, `download-queue-manager`, `integrity-verifier`, `settings-manager`) to be stripped from the `.asar` bundle.
  - Also ensured `image-worker.cjs` is correctly packaged alongside the main process.

---

### 📦 Build Specifications
* **Version:** `1.4.0-preview.26w21e`
* **Release Channel:** Preview / Hotfix Release
* **Platform:** Windows, macOS, Linux

---

## 🎮 IDK Launcher v1.4.0-preview.26w21d Changelog

Welcome to the Minecraft snapshot style unstable preview revision **v1.4.0-preview.26w21d**! This update introduces a setting to hide the launcher during gameplay, direct messaging in IDK Connect, near-instant version launching, and unified character skin rendering.

---

### 🚀 New Features & Enhancements

* **👥 Direct Messaging / Chat in IDK Connect**
  - Left-clicking any friend in the sidebar opens a Direct Message chat view.
  - Interactive speech bubbles, message polling (every 3 seconds), and automatic bottom scrolling.
  - Friends list items now display green unread count notification badges when new messages arrive.
  - Fully integrated with the `idk-backend` storage layer.

* **⚙️ "Hide Launcher on Launch" Option**
  - Added a toggle setting to hide/minimize the launcher window while Minecraft is running to conserve system memory and CPU.
  - Re-opens the launcher page seamlessly upon exiting the game.

* **⚡ Near-Instant Game Launching**
  - Bypasses file integrity checksum validation for version files that are already present on disk before launch, significantly speeding up Minecraft loading times.

* **🎨 Unified Character Skin Rendering**
  - Fixed avatar rendering issues and username casing inconsistencies between IDK Connect profiles and in-game overlays.

---

### 📦 Build Specifications
* **Version:** `1.4.0-preview.26w21d`
* **Release Channel:** Preview / Unstable Release
* **Platform:** Windows, macOS, Linux

---

## 🎮 IDK Launcher v1.3.0-preview.26w21c Changelog

Welcome to the Minecraft snapshot style unstable preview revision **v1.3.0-preview.26w21c**! This update introduces host cancellation support, VPS connection improvements, and premium visual feedback during the connection phase.

---

### 🚀 New Features & Enhancements

* **🛑 Host Connection Cancellation Support**
  - Added a dedicated red **"Cancel"** button to the "Host LAN World" panel in both the main launcher UI and the in-game overlay.
  - Allows you to immediately abort the process if the `frpc` download hangs or if the tunnel takes too long to connect.
  - Automatically aborts active HTTP/HTTPS file download streams (`ensure-frpc` requests) or terminates the spawned Fast Reverse Proxy client process instantly in the background.
  - Intelligently suppresses generic backend process exit error warning toasts during user-initiated cancellations for a polished, error-free experience.

* **🌐 play.somniac.me VPS Integration**
  - Updated all connection, API, and presence reporting endpoints to use the new `play.somniac.me` domain (instead of `api.somniac.me` or `somniac.me`), ensuring faster and more stable proxy routing.

* **🎨 Live Download Progress in In-Game Overlay**
  - Integrated a progress listener into the in-game overlay that updates the disabled SHARE button dynamically with status and percentages (e.g., `DOWNLOADING FRPC... (42%)`), giving immediate visual feedback without cluttered UI layouts.

---

### 📦 Build Specifications
* **Version:** `1.3.0-preview.26w21c`
* **Release Channel:** Preview / Unstable Release
* **Platform:** Windows, macOS, Linux

---

## 🎮 IDK Launcher v1.3.0-preview.26w21a Changelog

Welcome to the Minecraft snapshot style unstable preview revision **v1.3.0-preview.26w21a**! This massive update introduces a completely redesigned Modular Feature-Based Architecture, a comprehensive Version Mods Management system, advanced performance optimizations, and crash analysis tools.

---

### 🚀 New Features & Enhancements

* **📂 Version Mods Management System**
  - Added a **"Manage Mods"** option to downloaded Minecraft versions directly from the Play view.
  - Integrated downloaded versions into the sidebar, allowing you to manage mods, resource packs, and shaders per version just like modpacks.
  - Added per-version settings (custom loader, JVM arguments, and window size configuration) persisting in local storage.
  - Automatically scans and detects version loaders (Fabric, Forge, NeoForge, Quilt, Vanilla) from folder structures.

* **⚙️ Redesigned Modular Architecture**
  - Refactored the core launcher into a robust, feature-based modular system under `src/features/`.
  - Improved application maintainability, cleaner code organization, and decoupled feature states.

* **⚡ Performance & Memory Optimizations**
  - **Asset Caching & CPU Tuning**: Optimized rendering flows and CPU load.
  - **Memory Management**: Implemented renderer memory destruction via `about:blank` transitions and V8 Garbage Collection to free up RAM.
  - **UI Offloading**: Delegated heavy tasks away from the main thread for smooth UX interactions.
  - Scrubbed and corrected style.css UTF-16 null byte formatting errors.

* **🛡️ Crash Analyzer & Mod Updates**
  - **Crash Report Parser**: Injected a crash analysis helper to detect missing dependencies and runtime exceptions.
  - **Mod Updates Integration**: Automatically scans for update availability from Modrinth and CurseForge.
  - **Auto-Dependency Installer**: One-click installer for downloading missing dependencies.

* **🖥️ Borderless Fullscreen Overlay & Window Control Improvements**
  - Implemented borderless fullscreen overlay mode along with customizable overlay toggles.
  - Enhanced window resizing, maximizing, minimizing, and closing controls in the Electron main process.
  - Auto-hide launcher window during gameplay and automatically restore it on exit.

---

### 🔧 Fixes & Stability

* **📁 Modpack Deletion & File Scans**
  - Added recursive local folder purging upon deleting modpacks with multi-attempt fail-safe strategy.
  - Fixed issues where modpack profiles were not correctly loaded after reset.
* **📦 Parallel Downloader Queue**
  - Added a download queue manager with concurrency limiting, integrity verification, and performance monitoring.

---

### 📦 Build Specifications
* **Version:** `1.3.0-preview.26w21a`
* **Release Channel:** Preview / Unstable Release
* **Platform:** Windows, macOS, Linux

---

## 🎮 IDK Launcher v1.3.0 Changelog

Hello everyone! The stable release **v1.3.0** is officially here! This major update elevates the launcher to the next level by introducing integrated P2P multiplayer connectivity, local modpack archiving management (Import/Export), and extensive modpack compatibility enhancements.

---

### 🚀 New & Highlighted Features

* **📥 Import Local Modpack from `.zip` Archives**
  - You can now import any CurseForge-compatible modpack directly from a local `.zip` file on your computer!
  - Mod downloads are incredibly fast thanks to a custom **parallel downloading queue (up to 12 files concurrently)**.
  - Automatically extracts and registers all bundled configurations (*configs*), *resource packs*, *shaders*, and custom game menus (*overrides*) from the archive!

* **📤 Export Modpack to Portable `.zip` Archives**
  - Created a custom modpack you want to share with friends? Simply click the blue **Export** icon (up-arrow button) next to any modpack!
  - Generates a CurseForge-compliant portable `.zip` archive containing your exact selection of mods, configurations, and assets.
  - **Privacy & Size Optimization:** The export process intelligently filters and purges game logs (`logs/`) to protect your account tokens/privacy and significantly reduce the output zip size!

* **👥 IDK CONNECT (Beta) — Real-Time Social & Multiplayer System**
  - A brand-new social sidebar nested in the top-right corner of the launcher dashboard!
  - Add friends, manage your friends list, and view real-time online status and game activities (*e.g., "Playing TerraFirmaCraft Optimized"*).
  - Connect with friends and join P2P worlds with a single click — no manual IP setups required!
  - Features an intuitive pending invitation badge to keep track of incoming requests.

* **🖼️ Automated Modpack Logo Rendering**
  - When importing a modpack, the launcher automatically queries and retrieves the official modpack thumbnail/logo from the catalog, applying it as the modpack's profile picture for a beautiful dashboard appearance.

---

### 🔧 Compatibility Fixes & Optimizations

* **🛠️ TerraFirmaCraft & Custom Title Menu Alignment**
  - Resolved compatibility bugs where custom main menus, custom title modifications, or custom game logos failed to load when launching modpacks.
  - Optimized game launching directories (*working directory alignment*) to ensure all branding overrides, custom title menus, and specific mod configs load 100% correctly!

* **⚡ Concurrent Downloader Refinements**
  - Refactored the core mod downloader to run on a robust concurrency-limited scheduling engine, preventing network timeout issues and server throttling on large modpacks.

---

### 📦 Build Specifications
* **Version:** `1.3.0`
* **Release Channel:** Stable Release
* **Platform:** Windows, macOS, Linux
* **CI/CD Build:** Fully integrated with GitHub Actions Workflows for automated multiplatform builds triggered upon pushing release tags!

---

## 🎮 IDK Launcher v1.2.0-preview.26w20c Changelog

Halo semuanya! Versi preview **v1.2.0-preview.26w20c** kini hadir dengan fitur super seru yang paling ditunggu-tunggu: **Integrasi Discord Rich Presence!** Sekarang, teman-teman Anda di Discord bisa melihat aktivitas game Anda secara langsung dengan tampilan yang sangat premium.

---

### 🚀 Fitur Baru & Keren

* **👾 Status Bermain di Discord (Discord Rich Presence)**
  - Status profil Discord Anda akan otomatis berubah mengikuti apa yang sedang Anda lakukan di launcher: **Idle di Launcher**, **Sedang Menyiapkan Game**, atau **Sedang Asik Bermain**.
  - Dilengkapi penghitung waktu bermain (*playtime timer*) agar Anda tahu sudah berapa lama Anda berpetualang di Minecraft.

* **📬 Kirim Undangan Bermain & Tombol "Join" Langsung di Chat Discord**
  - Sekarang Anda bisa pamer status bermain di chat Discord! Cukup klik tombol `+` di Discord Anda untuk membagikan kartu undangan bermain yang keren.
  - Kartu undangan ini lengkap dengan tombol putih **"Join"** dan info sisa slot bermain (*contoh: 1 dari 10 pemain*).

* **👑 Nama & Logo Kustom "Indkingdom Launcher"**
  - Menggunakan logo utama resmi launcher Anda sendiri untuk mempercantik kartu undangan dan profil Discord.
  - Semua nama, status, dan teks detail di profil Discord Anda sekarang tertulis rapi sebagai **Indkingdom Launcher**.

* **🌀 Deteksi Modpack & Mod Loader Otomatis**
  - Discord Anda akan otomatis menampilkan ikon kecil loader yang sedang Anda pakai seperti **Fabric**, **Forge**, **NeoForge**, **Quilt**, atau **Vanilla**.
  - Jika Anda memainkan Modpack kustom, judul Modpack Anda juga akan muncul di status profil Discord!

---

### 🔧 Perbaikan & Peningkatan Kenyamanan

* **🩹 Anti-Lag & Auto-Connect Tangguh**
  - Launcher sekarang sangat pintar! Jika Anda membuka Discord setelah launcher menyala, status Anda akan otomatis terhubung kembali di latar belakang tanpa membuat launcher Anda macet (*freeze*).
  - Status bermain akan langsung terhapus dan kembali menjadi "Idle" secara otomatis saat Anda menutup game Minecraft.

---

### 📦 Informasi Build
* **Versi:** `1.2.0-preview.26w20c`
* **Status:** Preview / Unstable Release
* **Platform:** Windows, macOS, Linux

---

## 🎮 IDK Launcher v1.2.0-preview.26w20b Changelog

Welcome to the Minecraft snapshot **v1.2.0-preview.26w20b** unstable preview revision! This update introduces a breathtaking 3D Character Skin Viewer directly embedded into the user interface, incorporating next-generation styling, performance optimizations, and zero-compromise CORS/responsiveness engineering.

---

### 🚀 New Features

* **🎨 Premium Overlapping 3D Torso Card (Feather-Style Dashboard)**
  - Re-imagined the top-right user profile into a stunning, sky-blue to cyan glowing gradient pill card.
  - Embedded a dynamic 3D WebGL upper torso and head canvas utilizing CSS masking and cropping to let the 3D player model overlap the top border of the card for a high-fidelity depth perspective.
  - Injected an organic Idle Breathing animation so the character feels fully alive directly on the dashboard.

* **🌀 Interactive 3D Character Viewer Modal**
  - Added a "View 3D Skin" option to the profile dropdown that spawns a premium glassmorphic modal overlay.
  - Fully interactive: drag to rotate 360 degrees, scroll to zoom in/out, and click to inspect.
  - Dynamic Motion Engine: toggle auto-rotation ON/OFF and switch animations on the fly between **Walking**, **Running**, **Breathing (Idle)**, **Flying**, and **Static**.

---

### 🔧 Bug Fixes & Architectural Enhancements

* **🔒 Node.js CORS Proxying & Protocol-Independent Loader**
  - Implemented the `fetch-image-base64` IPC channel on the backend main process to fetch remote skin texture sheets (Mojang and Ely.by) securely, bypassing all Chromium WebGL CORS restrictions.
  - Engineered the backend request handler to dynamically detect and support both `http://` and `https://` protocol schemes (resolving Ely.by skinsystem protocol mismatches).

* **⚡ Fail-Safe Event Bindings & Memory Management**
  - Re-architected modal control flows to bind close buttons *instantly* upon DOM attachment, ensuring that close/done buttons remain 100% responsive and clickable even if textures are slow to load or network requests fail.
  - Added a beautiful loading spinner to the modal that fades out smoothly once WebGL rendering initializes.
  - Zero-RAM Leaks: Automatically executes `viewer.dispose()` on context closure to garbage-collect WebGL resources immediately.

---

### 📦 Build Specifications
* **Version:** `1.2.0-preview.26w20b` (Minecraft Snapshot Style)
* **Release Channel:** Preview / Unstable Release
* **Platform:** Windows x64 NSIS Standalone Installer
* **Build Signature:** Packed with `electron-builder` utilizing automated asset code-splitting (Vite chunking).

---

## 🎮 IDK Launcher v1.2.0-preview.26w20a Changelog

We are thrilled to introduce the Minecraft-style snapshot release **v1.2.0-preview.26w20a**! This unstable preview release focuses on revolutionizing multiplayer P2P sharing, introducing an automated secure tunneling bridge, and optimizing version alignments for both classic and modern Minecraft versions.

---

### 🚀 New Features

* **🌐 Unified HTTP/TCP Tunnel Decoder (Host Side)**
  - Upgraded the host regex parsing engine to dynamically decode both `https://` (standard free `trycloudflare.com` quick tunnels) and `tcp://` prefixes.
  - Cut tunnel establishment and IDK Network broadcast latency from 20 seconds to **under 1 second**!

* **🔒 Secure Jembatan / Client-Side Access Bridge (Client Side)**
  - Implemented an automated background bridge using Cloudflare Access (`cloudflared access tcp`).
  - Automatically spins up a secure local tunnel listener on port `25565` targeting the host's remote HTTPS tunnel url.
  - Allows client-side players to connect securely using standard local IPs (`127.0.0.1:25565`), fully bypassing Minecraft's inability to read HTTPS links.

* **🏎️ Intelligent Auto-Join Selector (Classic & Modern Support)**
  - Built a version-conditional launching engine (`isModernVersion`) to align with Mojang's changing standards:
    - **Minecraft Modern (1.20+)**: Automatically appends `--quickPlayMultiplayer 127.0.0.1:25565` arguments, letting players bypass the Main Menu and direct-connect straight into the world!
    - **Minecraft Classic (1.19 & older, like 1.8.9)**: Safely injects native `--server` and `--port` parameters, filtering out modern parameters to prevent game client parser crashes.

* **🛡️ Fail-Safe Version Matching Fallback**
  - Designed a smart fail-safe parser: if a host's active game version is pending or not yet resolved, the joining client defaults to their currently selected version dropdown instead of launching a blank version (`""`), completely preventing any launcher core unhandled crashes.

---

### 🔧 Bug Fixes & Code Stability

* **🐛 Scope Variable Declaration Resolution**
  - Declared the `activeSharePort` variable at the top-level of the sidebar controller scope, completely resolving the `ReferenceError: activeSharePort is not defined` crash when clicking Share.

* **⚡ Corrected Client Access Flag Syntax**
  - Resolved `Incorrect Usage: Cannot use two forms of the same flag` in `cloudflared` by changing the duplicate `--url` parameter to the official `--hostname` parameter.
  - Guarantees 100% connection bridge stability.

* **🧼 Automated Cleanups on Disconnect**
  - Automatically terminates any active client access processes (`stopCloudflaredAccess`) upon logging out or disconnecting from the IDK Network.

---

### 📦 Build Specifications
* **Version:** `1.2.0-preview.26w20a` (Minecraft Snapshot Style)
* **Release Channel:** Preview / Unstable Release
* **Platform:** Windows x64 NSIS Standalone Installer
* **Build Signature:** Compiled and packaged with `electron-builder` utilizing automated asset minification.

---

# IDK Launcher v1.2.0 Changelog

We are excited to release **v1.2.0** of the IDK Launcher! This major release focuses on restoring high-fidelity skin support, future-proofing distribution with automated update checking, and perfecting visual stability.

---

## 🚀 New Features

* **✨ Ely.by Skin System Integration**
  - Fully resolved avatar rendering bugs by routing queries directly to the `skinsystem.ely.by` profile database API.
  - Added seamless case-insensitive nickname lookup, allowing player skins (like your Enderman avatar) to render instantly on the dashboard.
  
* **🔔 Automatic Update Notifications**
  - Built an automated, non-intrusive update checker that checks your GitHub releases page (`Jeflacc/idk-launcher-landing`) on launcher startup.
  - Designed a premium, animated glassmorphic update modal displaying your latest release notes directly inside the launcher.
  - Integrated an instant, one-click upgrade button to safely launch browser-based downloads of your latest setups.

---

## 🔧 Optimizations & UI Polish

* **🧼 Zero-Error Developer Console**
  - Bypassed redundant calls to non-existent skins, completely eliminating annoying red `404` errors from your launcher's developer tools.
  
* **🛡️ Secure Release Notes Engine**
  - Built a secure, automated markdown-to-HTML parser with raw script escaping to keep launcher rendering safe from script injection.
  
* **🎨 Progressive Rendering Fallbacks**
  - Implemented a smart rendering chain: *Ely.by custom skin* ➔ *Premium Mojang skin* ➔ *Official high-fidelity Steve skin* to guarantee the avatar canvas never stays grey.

---

## 📦 Build Specifications
* **Version:** `1.2.0`
* **Release Channel:** Stable Release
* **Platform:** Windows x64 NSIS Standalone Installer
* **Build Signature:** Compiled and packaged with `electron-builder` utilizing automated asset minification.
