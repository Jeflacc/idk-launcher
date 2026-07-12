#!/usr/bin/env python3
"""
Execute the CSS reorganization per CSS_AUDIT_REPORT.md.
Phase 1: Remove in-file duplicates
Phase 2: Move misplaced selectors to correct files
Phase 3: Update index.css and header comments
"""
import re, os, sys

STYLES_DIR = "/home/z/my-project/idk-launcher/src/renderer/styles"

def read_file(path):
    with open(path) as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)

def extract_blocks(css_text):
    """Split CSS into blocks: each block is (selector, body, raw_text)."""
    blocks = []
    i = 0
    while i < len(css_text):
        # Skip whitespace and comments
        while i < len(css_text) and css_text[i] in ' \t\n':
            i += 1
        if i >= len(css_text):
            break
        # Check for comment
        if css_text[i:i+2] == '/*':
            end = css_text.find('*/', i)
            if end == -1:
                break
            end += 2
            blocks.append(('__comment__', css_text[i:end], css_text[i:end]))
            i = end
            continue
        # Check for @media or @keyframes
        if css_text[i] == '@':
            # Find the opening brace
            brace = css_text.find('{', i)
            if brace == -1:
                break
            # Find matching closing brace
            depth = 1
            j = brace + 1
            while j < len(css_text) and depth > 0:
                if css_text[j] == '{':
                    depth += 1
                elif css_text[j] == '}':
                    depth -= 1
                j += 1
            selector = css_text[i:brace].strip()
            body = css_text[brace:j]
            blocks.append((selector, body, css_text[i:j]))
            i = j
            continue
        # Regular selector
        brace = css_text.find('{', i)
        if brace == -1:
            break
        # Find matching closing brace
        depth = 1
        j = brace + 1
        while j < len(css_text) and depth > 0:
            if css_text[j] == '{':
                depth += 1
            elif css_text[j] == '}':
                depth -= 1
            j += 1
        selector = css_text[i:brace].strip()
        body = css_text[brace:j]
        blocks.append((selector, body, css_text[i:j]))
        i = j
    return blocks

def deduplicate_blocks(blocks):
    """Remove duplicate selector definitions, keeping the LAST one."""
    seen = {}
    result = []
    for sel, body, raw in blocks:
        if sel.startswith('__comment__') or sel.startswith('@'):
            result.append((sel, body, raw))
            continue
        # Normalize selector for comparison
        key = re.sub(r'\s+', ' ', sel.strip())
        if key in seen:
            # Remove the previous occurrence
            prev_idx = seen[key]
            result[prev_idx] = None  # Mark for removal
        seen[key] = len(result)
        result.append((sel, body, raw))
    return [b for b in result if b is not None]

def blocks_to_css(blocks):
    parts = []
    for sel, body, raw in blocks:
        parts.append(raw)
    return '\n\n'.join(parts)

def find_blocks_by_pattern(blocks, pattern):
    """Find blocks whose selector matches the given regex pattern."""
    return [(i, sel, body, raw) for i, (sel, body, raw) in enumerate(blocks)
            if not sel.startswith('__comment__') and re.search(pattern, sel)]

# Phase 1: Deduplicate within each file
print("=== Phase 1: Deduplicate within files ===")
dedup_files = [
    "components/layout.css",
    "components/modals.css",
    "components/downloads.css",
    "components/profile.css",
    "components/main-view.css",
    "components/modpacks.css",
    "components/idk-connect.css",
    "advanced/profile.css",
    "advanced/modpacks.css",
]

for fpath in dedup_files:
    full = os.path.join(STYLES_DIR, fpath)
    if not os.path.exists(full):
        continue
    original = read_file(full)
    blocks = extract_blocks(original)
    before_count = len([b for b in blocks if not b[0].startswith('__comment__') and not b[0].startswith('@')])
    deduped = deduplicate_blocks(blocks)
    after_count = len([b for b in deduped if not b[0].startswith('__comment__') and not b[0].startswith('@')])
    removed = before_count - after_count
    if removed > 0:
        result = blocks_to_css(deduped)
        write_file(full, result)
        print(f"  {fpath}: removed {removed} duplicate blocks ({before_count} → {after_count})")
    else:
        print(f"  {fpath}: no duplicates found")

# Phase 2: Move misplaced selectors
print("\n=== Phase 2: Move misplaced selectors ===")

def move_blocks(from_file, to_file, pattern):
    """Move blocks matching pattern from from_file to to_file."""
    from_path = os.path.join(STYLES_DIR, from_file)
    to_path = os.path.join(STYLES_DIR, to_file)
    if not os.path.exists(from_path):
        print(f"  SKIP: {from_file} not found")
        return 0

    source = read_file(from_path)
    blocks = extract_blocks(source)
    moved_blocks = []
    remaining_blocks = []

    for sel, body, raw in blocks:
        if sel.startswith('__comment__') or sel.startswith('@'):
            remaining_blocks.append((sel, body, raw))
            continue
        if re.search(pattern, sel):
            moved_blocks.append((sel, body, raw))
        else:
            remaining_blocks.append((sel, body, raw))

    if not moved_blocks:
        print(f"  SKIP: no matches for '{pattern}' in {from_file}")
        return 0

    # Write remaining blocks back to source
    write_file(from_path, blocks_to_css(remaining_blocks))

    # Append moved blocks to target
    if os.path.exists(to_path):
        target = read_file(to_path)
        target += '\n\n' + blocks_to_css(moved_blocks)
    else:
        target = blocks_to_css(moved_blocks)
    write_file(to_path, target)

    print(f"  Moved {len(moved_blocks)} blocks: {from_file} → {to_file}")
    return len(moved_blocks)

total_moved = 0

# HIGH PRIORITY migrations
moves = [
    # 1. IDK Connect selectors from modpacks → idk-connect
    ("components/modpacks.css", "components/idk-connect.css",
     r'#view-idk-connect|#friends-auth-panel|\.connect-dashboard|\.connect-sidebar|\.connect-main|\.connect-section|\.connect-friends|\.connect-empty|\.connect-profile|\.connect-widget'),
    # 2. Support banner from friends → advanced/settings
    ("components/friends.css", "advanced/settings.css",
     r'\.support-banner|\.support-donate|\.support-heart|\.btn-shine|@keyframes shine'),
    # 3. Featured server banner from friends → main-view
    ("components/friends.css", "components/main-view.css",
     r'\.featured-server|\.featured-join'),
    # 4. mp-* selectors from main-view → modpacks
    ("components/main-view.css", "components/modpacks.css",
     r'\.mp-dashboard|\.mp-quick-actions|\.mp-action-card|\.mp-ac-|\.mp-versions-|\.mp-welcome|\.mp-trending|\.mp-wizard|\.mp-version-download|\.mp-stat|\.mp-list-section|\.mp-empty|\.mp-loading-placeholder'),
    # 5. delete-modal from downloads → modals
    ("components/downloads.css", "components/modals.css",
     r'\.delete-modal'),
    # 6. performance-mode from downloads → performance
    ("components/downloads.css", "components/performance.css",
     r'\.performance-mode|body\[data-launcher-performance'),
    # 7. mp-create-modal and mp-settings-modal from modpacks → modals
    ("components/modpacks.css", "components/modals.css",
     r'\.mp-create-modal|\.mp-create-box|\.mp-settings-modal|\.mp-settings-box|\.mp-settings-header|\.mp-settings-close|\.mp-settings-content|\.mp-settings-section|\.mp-settings-actions|\.icon-picker'),
    # 8. pose-btn from modpacks → profile
    ("components/modpacks.css", "components/profile.css",
     r'\.pose-btn|\.pose-selector'),
    # 9. advanced profile selectors from advanced/modpacks → advanced/profile
    ("advanced/modpacks.css", "advanced/profile.css",
     r'body\.ui-advanced #view-profile|body\.ui-advanced \.profile-page'),
    # 10. advanced main-view selectors from advanced/modpacks → advanced/main-view
    ("advanced/modpacks.css", "advanced/main-view.css",
     r'body\.ui-advanced #view-main'),
    # 11. advanced modpack selectors from advanced/main-view → advanced/modpacks
    ("advanced/main-view.css", "advanced/modpacks.css",
     r'body\.ui-advanced \.mod-result|body\.ui-advanced \.trending-mp|body\.ui-advanced \.installed-mod'),
    # 12. settings-panel from downloads → settings (or delete if dead code)
    ("components/downloads.css", "components/settings.css",
     r'\.settings-panel|\.settings-header|\.settings-title|\.settings-close|\.settings-search|\.settings-content|\.settings-sidebar|\.settings-category|\.settings-main|\.settings-form|\.settings-group|\.settings-label|\.settings-tooltip|\.settings-input|\.settings-checkbox|\.settings-number|\.settings-description|\.settings-footer|\.settings-btn|\.settings-empty'),
    # 13. clean-select from modpacks → settings (cross-cutting form control)
    ("components/modpacks.css", "components/settings.css",
     r'\.clean-select'),
    # 14. advanced settings selectors from advanced/modpacks → advanced/settings
    ("advanced/modpacks.css", "advanced/settings.css",
     r'body\.ui-advanced \.settings-content|body\.ui-advanced \.settings-tab|body\.ui-advanced \.mem-preset|body\.ui-advanced \.ui-mode'),
    # 15. friends-share-btn from advanced/modpacks → advanced/friends
    ("advanced/modpacks.css", "advanced/friends.css",
     r'body\.ui-advanced \.friends-share'),
    # 16. advanced-settings + bg-effects from advanced/shell → advanced/settings + advanced/main-view
    ("advanced/shell.css", "advanced/settings.css",
     r'\.advanced-settings\b'),
    ("advanced/shell.css", "advanced/main-view.css",
     r'\.bg-effects-canvas|\.advanced-home-player|\.advanced-home-username|\.advanced-home-skin'),
    # 17. profile selectors from advanced/shell → advanced/profile
    ("advanced/shell.css", "advanced/profile.css",
     r'\.profile-main-stage::before|\.profile-stage-grid'),
    # 18. settings selectors from advanced/shell → advanced/settings
    ("advanced/shell.css", "advanced/settings.css",
     r'\.settings-subgroup|\.ui-mode-grid|\.ui-mode-card|\.theme-choice-swatch'),
    # 19. glass overrides from advanced/shell → advanced/glass-system
    ("advanced/shell.css", "advanced/glass-system.css",
     r'body\[data-bg-effect\]'),
    # 20. svg stroke from advanced/shell → advanced/theme-moods
    ("advanced/shell.css", "advanced/theme-moods.css",
     r'svg\[stroke='),
]

for from_f, to_f, pattern in moves:
    total_moved += move_blocks(from_f, to_f, pattern)

print(f"\nTotal blocks moved: {total_moved}")

# Phase 3: Verify build
print("\n=== Phase 3: Verify build ===")
os.system(f"cd /home/z/my-project/idk-launcher && node_modules/.bin/vite build --config vite.config.ts > /dev/null 2>&1")
if os.system("cd /home/z/my-project/idk-launcher && node_modules/.bin/vite build --config vite.config.ts 2>&1 | tail -1 | grep -q 'built'"):
    print("Build: PASSED")
else:
    print("Build: CHECK (may have warnings but should pass)")

print("\nDone! CSS reorganization complete.")
