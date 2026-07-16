#!/usr/bin/env python3
"""Run VLM audit on all screenshots — batch mode."""
import os, json, subprocess, sys, time

DIR = "/home/z/my-project/idk-launcher/screenshots/full-audit"
OUT = "/home/z/my-project/idk-launcher/screenshots/audit-results/round-final"
os.makedirs(OUT, exist_ok=True)

PROMPT = """You are an elite UI/UX auditor with expertise in WCAG 2.2 AA, Nielsen's 10 Heuristics, and Laws of UX.
Audit this Minecraft launcher screenshot for EVERY issue:

1. SCROLL: Clipping, overflow, content cut off, scrollbar issues, fixed elements overlapping scrollable content
2. BUTTONS: Missing text, text too small/large, misaligned, missing hover/focus states, unclear labels, inconsistent sizing
3. LAYOUT: Elements beyond containers, horizontal scroll, modal/dropdown clipping, misalignment
4. SPACING: Inconsistent gaps, too much/little whitespace, cramped sections
5. TEXT: Truncated, overlapping, inconsistent font sizes, poor contrast, missing labels
6. ACCESSIBILITY: Missing ARIA, no focus indicators, poor contrast, keyboard nav issues
7. CONSISTENCY: Same components styled differently, inconsistent patterns

For EACH issue: [ISSUE #] [SEVERITY: Critical/High/Medium/Low] [CATEGORY] Description + exact CSS fix.
If a category is perfect: "[CATEGORY]: PASS"
Be brutally thorough — check every pixel."""

def audit(img_path, out_path):
    try:
        r = subprocess.run(
            ["z-ai", "vision", "-p", PROMPT, "-i", img_path, "-o", out_path],
            capture_output=True, text=True, timeout=90
        )
        return r.returncode == 0
    except:
        return False

# Process in batches of 3 to avoid rate limits
screens = sorted([f for f in os.listdir(DIR) if f.endswith('.png')])
print(f"Processing {len(screens)} screenshots in batches of 3...")

all_issues = []
for i in range(0, len(screens), 3):
    batch = screens[i:i+3]
    procs = []
    for s in batch:
        img = os.path.join(DIR, s)
        out = os.path.join(OUT, s.replace('.png', '.json'))
        if os.path.exists(out):
            print(f"  SKIP {s} (already done)")
            continue
        p = subprocess.Popen(
            ["z-ai", "vision", "-p", PROMPT, "-i", img, "-o", out],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        procs.append((s, p))
    
    for s, p in procs:
        p.wait(timeout=120)
        out = os.path.join(OUT, s.replace('.png', '.json'))
        if os.path.exists(out):
            try:
                d = json.load(open(out))
                content = d.get('choices',[{}])[0].get('message',{}).get('content','')
                issues = [l for l in content.split('\n') if '[ISSUE' in l]
                passes = content.count('PASS')
                print(f"  {s}: {len(issues)} issues, {passes} passes")
                all_issues.append({"screen": s, "issues": len(issues), "passes": passes, "content": content})
            except:
                print(f"  {s}: parse error")
        else:
            print(f"  {s}: FAILED")
    
    if i + 3 < len(screens):
        time.sleep(2)  # Rate limit cooldown

# Summary
total_issues = sum(a["issues"] for a in all_issues)
total_passes = sum(a["passes"] for a in all_issues)
print(f"\n=== SUMMARY ===")
print(f"Screens audited: {len(all_issues)}")
print(f"Total issues: {total_issues}")
print(f"Total passes: {total_passes}")

# Save consolidated
with open(os.path.join(OUT, "summary.json"), "w") as f:
    json.dump(all_issues, f, indent=2)

# List screens with issues
for a in sorted(all_issues, key=lambda x: -x["issues"]):
    if a["issues"] > 0:
        print(f"  {a['screen']}: {a['issues']} issues")
