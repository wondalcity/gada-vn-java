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

const { withAndroidManifest } = require('@expo/config-plugins');

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

  return withFixFirebaseMessagingColor(base);
};

module.exports = buildConfig;
