#!/usr/bin/env python3
"""Fast screenshot capture — uses a simpler approach."""
import os, sys, time, threading, http.server, socketserver
from playwright.sync_api import sync_playwright

RENDERER_DIR = "/home/z/my-project/idk-launcher/dist-renderer"
PORT = 8199
OUT = "/home/z/my-project/idk-launcher/screenshots/full-audit"
os.makedirs(OUT, exist_ok=True)

os.chdir(RENDERER_DIR)
handler = http.server.SimpleHTTPRequestHandler
handler.log_message = lambda *a: None
httpd = socketserver.TCPServer(("0.0.0.0", PORT), handler)
httpd.allow_reuse_address = True
threading.Thread(target=httpd.serve_forever, daemon=True).start()
time.sleep(1)

SCREENS = [
    ("01-login-classic", "#view-login", "classic", None),
    ("02-main-classic", "#view-main", "classic", None),
    ("03-mods-classic", "#view-mods", "classic", None),
    ("04-profile-classic", "#view-profile", "classic", None),
    ("05-settings-classic", "#view-settings", "classic", None),
    ("06-idk-connect-classic", "#view-idk-connect", "classic", None),
    ("07-main-advanced", "#view-main", "advanced", None),
    ("08-mods-advanced", "#view-mods", "advanced", None),
    ("09-profile-advanced", "#view-profile", "advanced", None),
    ("10-settings-advanced", "#view-settings", "advanced", None),
    ("11-idk-connect-advanced", "#view-idk-connect", "advanced", None),
    ("12-confirm-dialog", "#view-main", "classic", "#confirm-dialog-modal"),
    ("13-list-dialog", "#view-main", "classic", "#list-dialog-modal"),
    ("14-delete-modpack", "#view-mods", "classic", "#delete-modpack-modal"),
    ("15-render-engine", "#view-main", "classic", "#render-engine-modal"),
    ("16-mp-create", "#view-mods", "classic", "#mp-create-modal"),
    ("17-mp-settings", "#view-mods", "classic", "#mp-settings-modal"),
    ("18-mp-all-versions", "#view-mods", "classic", "#mp-all-versions-modal"),
    ("19-launch-overlay", "#view-main", "classic", "#launch-overlay"),
    ("20-error-modal", "#view-main", "classic", "#error-modal"),
    ("21-update-modal", "#view-main", "classic", "#update-modal"),
    ("22-mod-updates-modal", "#view-mods", "classic", "#mod-updates-modal"),
    ("23-changelog-modal", "#view-mods", "classic", "#changelog-modal"),
    ("24-crash-analyzer-modal", "#view-mods", "classic", "#crash-analyzer-modal"),
    ("25-dependencies-modal", "#view-mods", "classic", "#dependencies-modal"),
    ("26-dl-confirm-modal", "#view-mods", "classic", "#dl-confirm-modal"),
    ("27-download-detail", "#view-mods", "classic", "#download-detail-panel"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="domcontentloaded", timeout=15000)
    time.sleep(3)

    for name, view, mode, modal in SCREENS:
        try:
            if mode == "advanced":
                page.evaluate("() => document.body.classList.add('ui-advanced')")
            else:
                page.evaluate("() => document.body.classList.remove('ui-advanced')")
            time.sleep(0.2)
            page.evaluate(f"""() => {{
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                const t = document.querySelector('{view}');
                if (t) t.classList.add('active');
            }}""")
            time.sleep(0.3)
            if modal:
                page.evaluate(f"""() => {{
                    const el = document.querySelector('{modal}');
                    if (el) {{ el.classList.add('active'); el.style.display='flex'; el.style.opacity='1'; el.style.pointerEvents='all'; }}
                }}""")
                time.sleep(0.2)
            page.screenshot(path=os.path.join(OUT, f"{name}.png"))
            print(f"  {name}: OK")
        except Exception as e:
            print(f"  {name}: ERROR - {e}")

    browser.close()
httpd.shutdown()
print(f"\nDone! {len(SCREENS)} screenshots in {OUT}")
