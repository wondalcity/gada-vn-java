/**
 * Dynamic Expo config — reads API keys from environment variables.
 *
 * Required env vars (set in .env.local, never commit):
 *   GOOGLE_MAPS_ANDROID_KEY  — Maps SDK for Android (app-signing key restriction in Google Cloud)
 *   GOOGLE_MAPS_IOS_KEY      — Maps SDK for iOS (bundle-ID restriction in Google Cloud)
 *   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY — Places API for address autocomplete (JS bundle)
 *
 * Google Cloud Console: enable the following APIs on the relevant keys:
 *   - Maps SDK for Android  →  GOOGLE_MAPS_ANDROID_KEY
 *   - Maps SDK for iOS      →  GOOGLE_MAPS_IOS_KEY
 *   - Places API (New)      →  EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
 *
 * After editing this file, run:  npx expo prebuild  (to regenerate android/ios native files)
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix manifest merger conflict between expo-notifications and
 * @react-native-firebase/messaging: both define
 * com.google.firebase.messaging.default_notification_color.
 * Adding tools:replace="android:resource" lets the app manifest win.
 */
function withFixFirebaseMessagingColor(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    for (const meta of app['meta-data'] ?? []) {
      if (
        meta.$['android:name'] ===
        'com.google.firebase.messaging.default_notification_color'
      ) {
        meta.$['tools:replace'] = 'android:resource';
      }
    }
    return cfg;
  });
}

/**
 * Configure iOS Podfile for @react-native-firebase with CocoaPods 1.15+.
 *
 * CocoaPods 1.15+ made "Swift pods cannot be integrated as static libraries"
 * a fatal error. The fix is:
 *   1. Set $RNFirebaseAsStaticFramework = true (tells RNFirebase to use static)
 *   2. Replace use_modular_headers! with use_frameworks! :linkage => :static
 *      (required for Firebase Swift pods to see their ObjC dependencies as modules)
 */
function withFirebaseStaticFramework(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Prepend $RNFirebaseAsStaticFramework if not already present
      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = `$RNFirebaseAsStaticFramework = true\n${contents}`;
      }

      // 2. Add use_frameworks! :linkage => :static after use_modular_headers!
      //    Both are needed: use_modular_headers! generates module maps for ObjC pods
      //    that Firebase Swift pods depend on; use_frameworks! :linkage => :static
      //    makes all pods (including Swift ones) static frameworks (required for
      //    CocoaPods 1.15+ which made dynamic Swift static linking a fatal error).
      if (contents.includes('use_modular_headers!') && !contents.includes("use_frameworks! :linkage => :static")) {
        contents = contents.replace(/^(use_modular_headers!)\s*$/m, "$1\nuse_frameworks! :linkage => :static");
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

/**
 * Enable hardware acceleration on MainActivity so that the WebView used by
 * react-native-signature-canvas renders correctly. Without this flag the
 * signature canvas crashes on many Android devices.
 */
function withHardwareAcceleration(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    for (const activity of app.activity ?? []) {
      if (activity.$['android:name'] === '.MainActivity') {
        activity.$['android:hardwareAccelerated'] = 'true';
      }
    }
    return cfg;
  });
}

/** @param {{ config: import('@expo/config').ExpoConfig }} config */
const buildConfig = ({ config }) => {
  const base = {
    ...config,

    // ── Android ──────────────────────────────────────────────────────────────
    android: {
      ...config.android,
      versionCode: config.android?.versionCode ?? 1,
      // EAS builds: use GOOGLE_SERVICES_JSON secret env var (file type)
      // Local builds: fall back to the local file
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      config: {
        googleMaps: {
          // Prefer env var, then fall back to the value already in app.json so
          // CI builds that don't inject GOOGLE_MAPS_ANDROID_KEY still work.
          apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY
            || config.android?.config?.googleMaps?.apiKey
            || '',
        },
      },
    },

    // ── iOS ──────────────────────────────────────────────────────────────────
    ios: {
      ...config.ios,
      // EAS builds: use GOOGLE_SERVICES_PLIST secret env var (file type)
      // Local builds: fall back to the local file
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
      config: {
        ...(config.ios?.config ?? {}),
        // Enables Google Maps on iOS (instead of default Apple Maps).
        // Set GOOGLE_MAPS_IOS_KEY in .env.local; leave blank to use Apple Maps.
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY
          || config.ios?.config?.googleMapsApiKey
          || '',
      },
    },
  };

  return withFirebaseStaticFramework(withHardwareAcceleration(withFixFirebaseMessagingColor(base)));
};

module.exports = buildConfig;
