#!/usr/bin/env python3
"""
Patch android/settings.gradle after expo prebuild to replace dynamic node-based
path resolution (which fails inside Gradle's Java Process.exec()) with hardcoded
absolute paths resolved from the host shell.

Usage:
    python3 scripts/patch_settings_gradle.py <rn_pkg> <gradle_plugin_pkg> <expo_pkg> [cli_pkg]

Arguments:
    rn_pkg             - Absolute path to react-native/package.json
    gradle_plugin_pkg  - Absolute path to @react-native/gradle-plugin/package.json
    expo_pkg           - Absolute path to expo/package.json
    cli_pkg            - Absolute path to @react-native-community/cli-platform-android/package.json
                         (optional, pass empty string "" to skip)
"""

import sys
import os
import re

if len(sys.argv) < 4:
    print("Usage: patch_settings_gradle.py <rn_pkg> <gradle_plugin_pkg> <expo_pkg> [cli_pkg]")
    sys.exit(1)

rn_pkg = sys.argv[1]
gp_pkg = sys.argv[2]
expo_pkg = sys.argv[3]
cli_pkg = sys.argv[4] if len(sys.argv) > 4 else ""

settings_path = "android/settings.gradle"

with open(settings_path, "r") as f:
    content = f.read()

# --- Debug: print the file so CI logs show the exact content ---
print("=== android/settings.gradle (before patch) ===")
for i, line in enumerate(content.splitlines(), 1):
    print(f"{i:3}: {line}")
print("=== end ===")

original = content

def replace_node_exec(text, pkg_substring, resolved_path):
    """
    Replace any Groovy construct:
        ["node", "--print", "...require.resolve('<pkg_substring>'...)"].execute(null, rootDir).text.trim()
    with the literal resolved_path string (quoted).

    Uses DOTALL regex so the Groovy array can span lines.
    """
    # Match: ["node", "--print", "...ANYTHING CONTAINING pkg_substring..."].execute(null, rootDir).text.trim()
    pattern = (
        r'\["node",\s*"--print",\s*"[^"]*'
        + re.escape(pkg_substring)
        + r'[^"]*"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)'
    )
    replacement = f'"{resolved_path}"'
    new_text, count = re.subn(pattern, replacement, text, flags=re.DOTALL)
    if count > 0:
        print(f"  Replaced {count} occurrence(s) for: {pkg_substring}")
    return new_text

# 1. @react-native/gradle-plugin — must be replaced BEFORE react-native/package.json
#    because the gradle-plugin pattern also contains 'react-native/package.json'
content = replace_node_exec(content, "@react-native/gradle-plugin/package.json", gp_pkg)

# 2. react-native/package.json (standalone occurrences)
content = replace_node_exec(content, "require.resolve('react-native/package.json')", rn_pkg)

# 3. expo/package.json
content = replace_node_exec(content, "require.resolve('expo/package.json')", expo_pkg)

# 4. @react-native-community/cli-platform-android (optional)
if cli_pkg:
    content = replace_node_exec(content, "@react-native-community/cli-platform-android/package.json", cli_pkg)

if content == original:
    print("WARNING: No patterns were replaced. Check the debug output above.")
    sys.exit(1)

with open(settings_path, "w") as f:
    f.write(content)

print("settings.gradle patched successfully")
print("=== android/settings.gradle (after patch) ===")
for i, line in enumerate(content.splitlines(), 1):
    print(f"{i:3}: {line}")
print("=== end ===")
