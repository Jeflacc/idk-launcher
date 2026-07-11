#!/usr/bin/env python3
"""
Start a local HTTP server and take screenshots of every page in the IDK Launcher renderer.
Runs server + screenshots in a single process so neither dies.
"""
import os
import sys
import time
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

RENDERER_DIR = "/home/z/my-project/idk-launcher/dist-renderer"
PORT = 8090
OUTPUT_DIR = "/home/z/my-project/idk-launcher/screenshots"

os.makedirs(OUTPUT_DIR, exist_ok=True)

PAGES = [
    ("01-login", "#view-login", "Login view"),
    ("02-main", "#view-main", "Main/Home view"),
    ("03-mods", "#view-mods", "Modpack Manager"),
    ("04-profile", "#view-profile", "Profile page"),
    ("05-settings", "#view-settings", "Settings"),
    ("06-idk-connect", "#view-idk-connect", "IDK Connect"),
]

def start_server():
    """Start a simple HTTP server in a background thread."""
    os.chdir(RENDERER_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    # Silence logs
    handler.log_message = lambda *args: None
    httpd = socketserver.TCPServer(("0.0.0.0", PORT), handler)
    httpd.allow_reuse_address = True
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"HTTP server started on port {PORT}")
    return httpd

def take_screenshots():
    httpd = start_server()
    time.sleep(1)

    # Verify server is reachable
    import urllib.request
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=5)
        print("Server is reachable")
    except Exception as e:
        print(f"Server not reachable: {e}")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2,
        )
        page = context.new_page()

        console_errors = {}

        for name, selector, description in PAGES:
            print(f"\n=== {name}: {description} ===")

            errors = []
            page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
            page.on("pageerror", lambda err: errors.append(f"[pageerror] {err}"))

            try:
                page.goto(f"http://127.0.0.1:{PORT}/", wait_until="domcontentloaded", timeout=15000)
                time.sleep(3)  # Wait for JS to render

                # If this isn't the login page, activate the target view
                if selector != "#view-login":
                    page.evaluate("""(sel) => {
                        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                        const target = document.querySelector(sel);
                        if (target) target.classList.add('active');
                    }""", selector)
                    time.sleep(1)

                # Take screenshot
                screenshot_path = os.path.join(OUTPUT_DIR, f"{name}.png")
                page.screenshot(path=screenshot_path, full_page=False)
                print(f"  Screenshot: {screenshot_path} ({os.path.getsize(screenshot_path)} bytes)")

                # Full page
                full_path = os.path.join(OUTPUT_DIR, f"{name}-full.png")
                page.screenshot(path=full_path, full_page=True)
                print(f"  Full: {full_path}")

            except Exception as e:
                print(f"  ERROR: {e}")
                errors.append(f"[screenshot] {e}")

            console_errors[name] = errors
            if errors:
                print(f"  Console issues ({len(errors)}):")
                for e in errors[:5]:
                    print(f"    {e}")

        browser.close()

    # Write console errors
    with open(os.path.join(OUTPUT_DIR, "console-errors.txt"), "w") as f:
        for name, errors in console_errors.items():
            f.write(f"\n=== {name} ===\n")
            if errors:
                for e in errors:
                    f.write(f"  {e}\n")
            else:
                f.write("  (none)\n")

    httpd.shutdown()
    print(f"\nDone! Screenshots in {OUTPUT_DIR}")

if __name__ == "__main__":
    take_screenshots()
