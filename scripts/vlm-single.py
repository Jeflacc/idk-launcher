#!/usr/bin/env python3
"""Run VLM audit on a single screenshot — fast mode without thinking."""
import os, sys, subprocess, json

PROMPT = """You are an elite UI/UX auditor. Analyze this Minecraft launcher screenshot against:
1. WCAG 2.2 AA (contrast ≥4.5:1, focus visible, keyboard nav, ARIA labels)
2. Nielsen's 10 Heuristics (visibility of status, consistency, error prevention, recognition over recall, aesthetic minimalism)
3. Laws of UX (Fitts's Law, Hick's Law, Law of Proximity, Miller's Law, Aesthetic-Usability Effect)

Check EVERY category:
- VISUAL HIERARCHY & LAYOUT (spacing, alignment, regions, balance)
- COLOR & CONTRAST (all text ≥4.5:1, borders ≥3:1)
- INTERACTIVE FEEDBACK (hover, active, focus-visible on ALL controls)
- FORM DESIGN (labels, errors, placeholders, focus management)
- NAVIGATION (current location clear, back paths, tab order)
- LOADING/EMPTY STATES (indicators, helpful empty states)
- ERROR HANDLING (clear messages, recovery paths)
- ACCESSIBILITY (ARIA, keyboard, screen reader, focus management)
- CONSISTENCY (same components styled identically)
- MINIMALISM (no visual noise, clean)

For EACH issue output:
[ISSUE #] [SEVERITY: Critical/High/Medium/Low] [FRAMEWORK] Description | Impact | Fix (exact CSS/HTML)

If a category is perfect, state: "[CATEGORY]: PASS"
Be BRUTALLY thorough. Report even minor issues."""

def audit(image_path, output_path):
    cmd = ["z-ai", "vision", "-p", PROMPT, "-i", image_path, "-o", output_path]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        return r.returncode == 0
    except:
        return False

if __name__ == "__main__":
    img = sys.argv[1]
    out = sys.argv[2]
    ok = audit(img, out)
    if ok:
        with open(out) as f:
            data = json.load(f)
        content = data.get("choices",[{}])[0].get("message",{}).get("content","")
        # Count issues
        issues = [l for l in content.split('\n') if l.strip().startswith('[ISSUE')]
        print(f"OK: {len(issues)} issues found")
    else:
        print("FAILED")
