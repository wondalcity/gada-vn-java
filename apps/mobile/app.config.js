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
 * a fatal error. Firebase Swift pods (FirebaseCoreInternal, FirebaseCrashlytics,
 * FirebaseSessions) depend on ObjC pods (GoogleUtilities, nanopb, etc.) that do
 * not define modules by default.
 *
 * Root cause: the Expo SDK 51 Podfile template does NOT include use_modular_headers!
 * at the global scope, and adding it globally causes "redefinition of module
 * 'ReactCommon'" because React Native pods define their own module maps.
 *
 * Fix:
 *   1. Set $RNFirebaseAsStaticFramework = true (tells RNFirebase to use static)
 *   2. Add :modular_headers => true for the specific ObjC pods that Firebase
 *      Swift pods depend on (GoogleUtilities, nanopb, FirebaseCore, etc.).
 *      This generates module maps only for those pods without touching React
 *      Native's module maps, satisfying CocoaPods 1.15+.
 */
function withFirebaseStaticFramework(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Prepend $RNFirebaseAsStaticFramework = true if not already present.
      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = `$RNFirebaseAsStaticFramework = true\n${contents}`;
      }

      // 2. Add :modular_headers => true for specific Firebase ObjC pods.
      //    The Expo SDK 51 template does NOT include use_modular_headers! globally,
      //    and adding it globally causes "redefinition of module 'ReactCommon'" in
      //    Xcode because React Native pods define their own module maps.
      //    Using per-pod :modular_headers => true is the targeted fix: it generates
      //    module maps only for the ObjC pods that Firebase Swift pods depend on,
      //    satisfying CocoaPods 1.15+ without conflicting with React Native.
      if (!contents.includes('modular_headers')) {
        const modularHeadersPods = [
          "  pod 'GoogleUtilities', :modular_headers => true",
          "  pod 'nanopb', :modular_headers => true",
          "  pod 'FirebaseCore', :modular_headers => true",
          "  pod 'FirebaseInstallations', :modular_headers => true",
          "  pod 'GoogleDataTransport', :modular_headers => true",
          "  pod 'FirebaseCoreExtension', :modular_headers => true",
        ].join('\n');
        // Inject inside the target block, right before use_react_native!(
        contents = contents.replace(
          /^( {2}use_react_native!\()/m,
          `${modularHeadersPods}\n\n$1`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

/**
 * Allow cleartext (HTTP) traffic on Android when the API URL uses http://.
 * Android 9+ blocks plaintext traffic by default; the staging API runs on HTTP
 * so we must opt in. Production (HTTPS) builds do not need this.
 */
function withCleartextTraffic(config) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!apiUrl.startsWith('http://')) return config;
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:usesCleartextTraffic'] = 'true';
    }
    return cfg;
  });
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

  return withFirebaseStaticFramework(withCleartextTraffic(withHardwareAcceleration(withFixFirebaseMessagingColor(base))));
};

module.exports = buildConfig;
