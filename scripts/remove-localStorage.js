#!/usr/bin/env python3
"""Remove redundant localStorage.setItem calls from renderer files.
The backend SettingsStore is authoritative — localStorage is a v1 compat mirror.
Only remove setItem calls for keys that are already saved via saveSettings() IPC.
"""
import re, os

FILES = [
    "/home/z/my-project/idk-launcher/src/renderer/features/settings/settings-feature.js",
    "/home/z/my-project/idk-launcher/src/renderer/features/launch/launch-feature.js",
    "/home/z/my-project/idk-launcher/src/renderer/features/modpacks/modpacks-feature.js",
    "/home/z/my-project/idk-launcher/src/renderer/features/auth/auth-feature.js",
    "/home/z/my-project/idk-launcher/src/renderer/features/versions/version-feature.js",
    "/home/z/my-project/idk-launcher/src/renderer/features/tutorial/tutorial.js",
    "/home/z/my-project/idk-launcher/src/renderer/features/profile/profile-feature.js",
    "/home/z/my-project/idk-launcher/src/renderer/core/settings-migration.js",
]

# Keys that are already persisted via saveSettings() IPC — safe to remove localStorage.setItem
# These are the settings keys that the backend SettingsStore manages
SAFE_TO_REMOVE = [
    "idk_launcher_theme",
    "idk_accent_color",
    "idk_border_radius",
    "idk_animation_speed",
    "idk_font_scale",
    "idk_blur_intensity",
    "idk_compact_mode",
    "idk_language",
    "idk_background_effect",
    "idk_background_intensity",
    "idk_concurrent_downloads",
    "idk_concurrent_io",
    "idk_auto_updates",
    "idk_discord_presence",
    "idk_beta_updates",
    "idk_open_logs",
    "idk_analytics",
    "idk_hide_launcher",
    "idk_enable_overlay",
    "idk_custom_minecraft_path",
    "idk_default_window_width",
    "idk_default_window_height",
    "idk_default_fullscreen",
    "idk_global_java_args",
    "idk_launcher_performance_mode",
    "idk_launcher_ui_mode",
    "craftlaunch_username",
    "craftlaunch_authmode",
    "craftlaunch_javaPath",
    "craftlaunch_maxMemory",
    "craftlaunch_autoOptimization",
    "craftlaunch_performanceRenderer",
    "craftlaunch_forceUpdate",
]

# Keys that are NOT in the backend settings store — keep these localStorage calls
# These are app-runtime state that doesn't belong in settings
KEEP_KEYS = [
    "idk_last_played",
    "idk_last_played_is_modpack",
    "idk_last_played_modpack_id",
    "idk_selected_loader",
    "idk_downloaded_versions",
    "idk_version_settings",
    "idk_playtime",
    "idk_player_pose",
    "idk_tutorial_modpack_manager_completed",
    "idk_agreed_eula",
    "idk_connect_prompted_v2",
    "idk_connect_token",
    "idk_connect_user",
    "idk_backend_url",
    "idk_hideRenderPopup",
]

total_removed = 0

for fpath in FILES:
    if not os.path.exists(fpath):
        continue
    with open(fpath) as f:
        lines = f.readlines()

    new_lines = []
    removed = 0
    for line in lines:
        # Check if this line has localStorage.setItem
        if 'localStorage.setItem' in line:
            # Check if the key is in SAFE_TO_REMOVE
            should_remove = False
            for key in SAFE_TO_REMOVE:
                if f'"{key}"' in line or f"'{key}'" in line:
                    should_remove = True
                    break
            if should_remove:
                # Replace with a comment
                indent = len(line) - len(line.lstrip())
                new_lines.append(' ' * indent + '// REMOVED: localStorage.setItem — backend SettingsStore is authoritative\n')
                removed += 1
                continue
        new_lines.append(line)

    if removed > 0:
        with open(fpath, 'w') as f:
            f.writelines(new_lines)
        print(f"  {os.path.basename(fpath)}: removed {removed} localStorage.setItem calls")
        total_removed += removed

print(f"\nTotal: {total_removed} localStorage.setItem calls removed")
