<p align="center">
  <img src="logo.png" width="128" height="128" alt="IDK Launcher Logo" />
</p>

<h1 align="center">IDK Launcher</h1>

<p align="center">
  <strong>The next-generation, high-performance, and beautifully sandboxed Minecraft experience.</strong>
</p>

<p align="center">
  <a href="https://github.com/Jeflacc/idk-launcher/releases/latest">
    <img src="https://img.shields.io/github/v/release/Jeflacc/idk-launcher?style=for-the-badge&color=3b82f6" alt="Latest Release" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-60a5fa?style=for-the-badge" alt="Platforms" />
  <img src="https://img.shields.io/badge/License-MIT-34d399?style=for-the-badge" alt="License" />
</p>

---

## ✨ Overview

**IDK Launcher** is a state-of-the-art Minecraft client manager built from the ground up to prioritize speed, visual beauty, and complete user freedom. Bypassing traditional cluttered launchers, it offers a glassmorphic user interface designed to make modpack management, runtime configuration, and profile loading completely effortless.

---

## 🚀 Key Features

* **📦 Sandbox Modpack Isolation**
  - Create and configure multiple persistent modpack profiles.
  - Every single modpack is fully sandboxed in its own directory. Say goodbye to folder clutter and directory conflicts!

* **🧩 Live Marketplace Integration**
  - Seamlessly search and install thousands of mods directly from the launcher via **Modrinth** and **CurseForge** endpoints.

* **⚡ Performance First**
  - Smart Java Virtual Machine allocation with auto-healer recovery.
  - Built-in one-click configurations for performance mods like **Sodium** to instantly maximize your gameplay FPS.

* **🦊 Native Custom Skins**
  - High-fidelity integration with the **Ely.by Skins System**.
  - Renders custom player skins and premium head textures directly on the canvas without CORS or 404 network overhead.

* **🔔 Auto-Update Notifications**
  - Direct background checker that safely parses version tags and renders beautiful in-app upgrade alerts so you never miss a new feature.

---

## 🛠️ Cross-Platform Cloud Builds

This repository is equipped with fully automated **GitHub Actions** workflows. Every time a version tag starting with `v` is pushed:
* 🪟 **Windows:** Natively compiles standalone `.exe` installers.
* 🍏 **macOS:** Natively compiles Apple Silicon `.dmg` and `.zip` applications.
* 🐧 **Linux:** Natively compiles `.AppImage` executables and Debian `.deb` packages.

All output packages are automatically compiled and attached to your GitHub Releases draft page.

---

## 💻 Tech Stack

* **Frontend:** [Vite](https://vite.dev/) + Vanilla HTML5/CSS3 (Harmonious Sleek HSL palettes)
* **Core Bridge:** [Electron](https://www.electronjs.org/) + Secure Context Bridge Preloads
* **Package Manager:** [npm](https://www.npmjs.com/)
* **Engine:** [Node.js](https://nodejs.org/)

---

## 📦 Developer Guide (Local Run)

If you would like to run the launcher in a local development environment:

### Prerequisites
* [Node.js v20+](https://nodejs.org/)

### Setup and Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jeflacc/idk-launcher.git
   cd idk-launcher
   ```
2. **Install all dependencies:**
   ```bash
   npm install
   ```
3. **Run in development mode:**
   ```bash
   npm run dev:electron
   ```

---

## 🛠️ Compile Scripts

* **Windows compilation:** `npm run dist:win`
* **macOS compilation (on macOS):** `npm run dist:mac`
* **Linux compilation (on Linux):** `npm run dist:linux`
* **Compile all packages:** `npm run dist:all`

---

<p align="center">
  Built with 💖 by the community for players who demand excellence.
</p>
