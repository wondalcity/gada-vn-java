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

if len(sys.argv) < 4:
    print("Usage: patch_settings_gradle.py <rn_pkg> <gradle_plugin_pkg> <expo_pkg> [cli_pkg]")
    sys.exit(1)

rn_pkg = sys.argv[1]
gp_pkg = sys.argv[2]
expo_pkg = sys.argv[3]
cli_pkg = sys.argv[4] if len(sys.argv) > 4 else ""

settings_path = os.path.join(os.path.dirname(__file__), "..", "android", "settings.gradle")
settings_path = os.path.normpath(settings_path)

with open(settings_path, "r") as f:
    content = f.read()

original = content

# Pattern: dynamic resolution of @react-native/gradle-plugin (appears twice)
gp_pattern = (
    '["node", "--print", "require.resolve(\'@react-native/gradle-plugin/package.json\', '
    '{ paths: [require.resolve(\'react-native/package.json\')] })"].execute(null, rootDir).text.trim()'
)
content = content.replace(gp_pattern, '"' + gp_pkg + '"')

# Pattern: dynamic resolution of react-native/package.json
rn_pattern = '["node", "--print", "require.resolve(\'react-native/package.json\')"].execute(null, rootDir).text.trim()'
content = content.replace(rn_pattern, '"' + rn_pkg + '"')

# Pattern: dynamic resolution of expo/package.json
expo_pattern = '["node", "--print", "require.resolve(\'expo/package.json\')"].execute(null, rootDir).text.trim()'
content = content.replace(expo_pattern, '"' + expo_pkg + '"')

# Pattern: dynamic resolution of @react-native-community/cli-platform-android (optional)
if cli_pkg:
    cli_pattern = (
        '["node", "--print", "require.resolve(\'@react-native-community/cli-platform-android/package.json\', '
        '{ paths: [require.resolve(\'react-native/package.json\')] })"].execute(null, rootDir).text.trim()'
    )
    content = content.replace(cli_pattern, '"' + cli_pkg + '"')

if content == original:
    print("WARNING: No patterns were replaced. The settings.gradle may have already been patched or the patterns changed.")
else:
    with open(settings_path, "w") as f:
        f.write(content)
    print("settings.gradle patched successfully")
