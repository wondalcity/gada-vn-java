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

/** @param {{ config: import('@expo/config').ExpoConfig }} config */
module.exports = ({ config }) => ({
  ...config,

  // ── Android ──────────────────────────────────────────────────────────────
  android: {
    ...config.android,
    versionCode: config.android?.versionCode ?? 1,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '',
      },
    },
  },

  // ── iOS ──────────────────────────────────────────────────────────────────
  ios: {
    ...config.ios,
    config: {
      ...(config.ios?.config ?? {}),
      // Enables Google Maps on iOS (instead of default Apple Maps).
      // Set GOOGLE_MAPS_IOS_KEY in .env.local; leave blank to use Apple Maps.
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY ?? '',
    },
  },
});
