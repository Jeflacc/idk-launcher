#!/usr/bin/env python3
"""
Comprehensive screenshot capture for ALL pages, UI modes, and modals.
Captures 27+ screenshots covering every visible screen state.
"""
import os, sys, time, threading, http.server, socketserver, json
from playwright.sync_api import sync_playwright

RENDERER_DIR = "/home/z/my-project/idk-launcher/dist-renderer"
PORT = 8091
OUTPUT_DIR = "/home/z/my-project/idk-launcher/screenshots/full-audit"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def start_server():
    os.chdir(RENDERER_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    handler.log_message = lambda *a: None
    httpd = socketserver.TCPServer(("0.0.0.0", PORT), handler)
    httpd.allow_reuse_address = True
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

# All screens to capture: (filename, view_selector, ui_mode, modal_to_show, description)
SCREENS = [
    # === CLASSIC MODE (body without .ui-advanced) ===
    # Views
    ("01-login-classic",        "#view-login",       "classic",  None, "Login (Classic)"),
    ("02-main-classic",         "#view-main",        "classic",  None, "Main/Home (Classic)"),
    ("03-mods-classic",         "#view-mods",        "classic",  None, "Modpacks (Classic)"),
    ("04-profile-classic",      "#view-profile",     "classic",  None, "Profile (Classic)"),
    ("05-settings-classic",     "#view-settings",    "classic",  None, "Settings (Classic)"),
    ("06-idk-connect-classic",  "#view-idk-connect", "classic",  None, "IDK Connect (Classic)"),

    # Settings tabs (Classic)
    ("05a-settings-perf-classic",   "#view-settings", "classic", None, "Settings Performance tab"),
    ("05b-settings-launch-classic", "#view-settings", "classic", None, "Settings Launch tab"),
    ("05c-settings-access-classic", "#view-settings", "classic", None, "Settings Accessibility tab"),
    ("05d-settings-about-classic",  "#view-settings", "classic", None, "Settings About tab"),

    # === ADVANCED MODE (body.ui-advanced) ===
    ("07-main-advanced",        "#view-main",        "advanced", None, "Main/Home (Advanced)"),
    ("08-mods-advanced",        "#view-mods",        "advanced", None, "Modpacks (Advanced)"),
    ("09-profile-advanced",     "#view-profile",     "advanced", None, "Profile (Advanced)"),
    ("10-settings-advanced",    "#view-settings",    "advanced", None, "Settings (Advanced)"),
    ("11-idk-connect-advanced", "#view-idk-connect", "advanced", None, "IDK Connect (Advanced)"),

    # === MODALS (Classic mode) ===
    ("12-confirm-dialog",       "#view-main",  "classic", "#confirm-dialog-modal", "Confirm Dialog"),
    ("13-list-dialog",          "#view-main",  "classic", "#list-dialog-modal", "List Dialog"),
    ("14-delete-modpack",       "#view-mods",  "classic", "#delete-modpack-modal", "Delete Modpack Modal"),
    ("15-render-engine",        "#view-main",  "classic", "#render-engine-modal", "Render Engine Modal"),
    ("16-mp-create",            "#view-mods",  "classic", "#mp-create-modal", "Create Modpack Modal"),
    ("17-mp-settings",          "#view-mods",  "classic", "#mp-settings-modal", "Modpack Settings Modal"),
    ("18-mp-all-versions",      "#view-mods",  "classic", "#mp-all-versions-modal", "All Versions Modal"),
    ("19-launch-overlay",       "#view-main",  "classic", "#launch-overlay", "Launch Overlay"),
    ("20-error-modal",          "#view-main",  "classic", "#error-modal", "Error Modal"),
    ("21-update-modal",         "#view-main",  "classic", "#update-modal", "Update Modal"),
    ("22-mod-updates-modal",    "#view-mods",  "classic", "#mod-updates-modal", "Mod Updates Modal"),
    ("23-changelog-modal",      "#view-mods",  "classic", "#changelog-modal", "Changelog Modal"),
    ("24-crash-analyzer-modal", "#view-mods",  "classic", "#crash-analyzer-modal", "Crash Analyzer Modal"),
    ("25-dependencies-modal",   "#view-mods",  "classic", "#dependencies-modal", "Dependencies Modal"),
    ("26-dl-confirm-modal",     "#view-mods",  "classic", "#dl-confirm-modal", "Download Confirm Modal"),
    ("27-download-detail",      "#view-mods",  "classic", "#download-detail-panel", "Download Detail Panel"),
]

def capture_page(page, name, view_selector, ui_mode, modal_selector, description):
    """Capture a single screenshot."""
    print(f"  Capturing: {name} — {description}")

    # Set UI mode
    if ui_mode == "advanced":
        page.evaluate("() => document.body.classList.add('ui-advanced')")
    else:
        page.evaluate("() => document.body.classList.remove('ui-advanced')")

    time.sleep(0.3)

    # Activate the view
    page.evaluate("""(sel) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.querySelector(sel);
        if (target) target.classList.add('active');
    }""", view_selector)
    time.sleep(0.5)

    # Settings tab switching
    if "settings-perf" in name:
        page.evaluate("""() => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
            const tab = document.querySelector('[data-tab="performance"]');
            const panel = document.getElementById('settings-panel-performance');
            if (tab) tab.classList.add('active');
            if (panel) panel.classList.add('active');
        }""")
    elif "settings-launch" in name:
        page.evaluate("""() => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
            const tab = document.querySelector('[data-tab="launch"]');
            const panel = document.getElementById('settings-panel-launch');
            if (tab) tab.classList.add('active');
            if (panel) panel.classList.add('active');
        }""")
    elif "settings-access" in name:
        page.evaluate("""() => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
            const tab = document.querySelector('[data-tab="accessibility"]');
            const panel = document.getElementById('settings-panel-accessibility');
            if (tab) tab.classList.add('active');
            if (panel) panel.classList.add('active');
        }""")
    elif "settings-about" in name:
        page.evaluate("""() => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
            const tab = document.querySelector('[data-tab="about"]');
            const panel = document.getElementById('settings-panel-about');
            if (tab) tab.classList.add('active');
            if (panel) panel.classList.add('active');
        }""")

    time.sleep(0.3)

    # Show modal if requested
    if modal_selector:
        # For modals, add 'active' class
        if "overlay" in modal_selector or "panel" in modal_selector:
            page.evaluate(f"""() => {{
                const el = document.querySelector('{modal_selector}');
                if (el) {{ el.classList.add('active'); el.style.display = 'flex'; }}
            }}""")
        else:
            page.evaluate(f"""() => {{
                const el = document.querySelector('{modal_selector}');
                if (el) {{ el.classList.add('active'); el.style.display = 'flex'; el.style.opacity = '1'; el.style.pointerEvents = 'all'; }}
            }}""")
        time.sleep(0.3)

    # Take screenshot
    path = os.path.join(OUTPUT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=False)
    return path

def main():
    # Build renderer first
    os.system("cd /home/z/my-project/idk-launcher && node_modules/.bin/vite build --config vite.config.ts > /dev/null 2>&1")

    httpd = start_server()
    time.sleep(1)

    import urllib.request
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=5)
    except Exception as e:
        print(f"Server not reachable: {e}")
        return

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        context = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=2)
        page = context.new_page()

        page.goto(f"http://127.0.0.1:{PORT}/", wait_until="domcontentloaded", timeout=15000)
        time.sleep(3)

        for name, view_sel, ui_mode, modal_sel, desc in SCREENS:
            try:
                path = capture_page(page, name, view_sel, ui_mode, modal_sel, desc)
                size = os.path.getsize(path) if os.path.exists(path) else 0
                results.append({"name": name, "description": desc, "path": path, "size": size, "status": "ok"})
            except Exception as e:
                print(f"  ERROR: {name}: {e}")
                results.append({"name": name, "description": desc, "status": "error", "error": str(e)})

        browser.close()

    httpd.shutdown()

    # Write manifest
    with open(os.path.join(OUTPUT_DIR, "manifest.json"), "w") as f:
        json.dump(results, f, indent=2)

    ok = sum(1 for r in results if r["status"] == "ok")
    err = sum(1 for r in results if r["status"] == "error")
    print(f"\nDone! {ok} captured, {err} errors. Screenshots in {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
