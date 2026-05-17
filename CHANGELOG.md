# IDK Launcher Changelog

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
