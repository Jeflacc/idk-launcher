✨ **Networking & Multiplayer (IDK Connect)**

* **FreeFRP Server Migration**: Moved back to the reliable and free `frp.freefrp.net` node to bypass Pterodactyl panel single-port limitations, enabling smooth P2P IDK Connect functionality.
* **Smart Port Collision Handling**: Added a smart connection retry mechanism that will dynamically search for a random available remote port if the current generated port is already in use by someone else. Now IDK Connect will flawlessly auto-connect without throwing unhandled port collision errors!

🎨 **UX & UI Fixes**

* **Glassmorphic Compilation Fix**: Resolved a critical bug where Chromium-specific CSS prefixes (`-webkit-backdrop-filter`) overrode the standard `backdrop-filter` property during production builds. The Mod Browser and Settings panels are back to being beautifully transparent with their signature frosted glass effect!
