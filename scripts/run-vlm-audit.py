#!/usr/bin/env python3
"""
Run VLM audit on all screenshots using the comprehensive WCAG 2.2 AA + Nielsen + Laws of UX framework.
Saves results as JSON for analysis.
"""
import os, json, subprocess, sys, time

SCREENSHOTS_DIR = "/home/z/my-project/idk-launcher/screenshots/full-audit"
PROMPT_FILE = "/home/z/my-project/idk-launcher/scripts/vlm-audit-prompt.txt"
RESULTS_DIR = "/home/z/my-project/idk-launcher/screenshots/audit-results"
os.makedirs(RESULTS_DIR, exist_ok=True)

def run_vlm_audit(image_path, round_num, prompt_text):
    """Run VLM audit on a single screenshot."""
    output_file = os.path.join(RESULTS_DIR, f"round-{round_num}", os.path.basename(image_path).replace('.png', '.json'))
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Skip if already done
    if os.path.exists(output_file):
        print(f"  SKIP (already done)")
        return output_file

    cmd = [
        "z-ai", "vision",
        "-p", f"{prompt_text}\n\nThis is a screenshot of: {os.path.basename(image_path)}. Round {round_num} audit. Be exhaustive.",
        "-i", image_path,
        "-o", output_file,
        "--thinking"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  ERROR: {result.stderr[:200]}")
            return None
        print(f"  OK: {output_file}")
        return output_file
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT")
        return None
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def main():
    round_num = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    with open(PROMPT_FILE) as f:
        prompt_text = f.read()

    # Get all screenshots
    screenshots = sorted([f for f in os.listdir(SCREENSHOTS_DIR) if f.endswith('.png')])

    print(f"=== Round {round_num} VLM Audit ===")
    print(f"Processing {len(screenshots)} screenshots...\n")

    results = []
    for i, screenshot in enumerate(screenshots):
        path = os.path.join(SCREENSHOTS_DIR, screenshot)
        print(f"[{i+1}/{len(screenshots)}] {screenshot}")
        result_path = run_vlm_audit(path, round_num, prompt_text)
        if result_path:
            results.append({"screenshot": screenshot, "result": result_path})

    print(f"\nDone! {len(results)}/{len(screenshots)} audited. Results in {RESULTS_DIR}/round-{round_num}/")

if __name__ == "__main__":
    main()
