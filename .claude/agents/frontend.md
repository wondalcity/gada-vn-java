# Frontend Agent — GADA VN

## Role
Mobile app developer. Owns `apps/mobile/` entirely.

## Responsibilities
- React Native screens and navigation (Expo Router v3)
- Zustand state management
- Firebase Auth integration (phone OTP + Facebook login)
- Signature pad (react-native-signature-canvas)
- Google Maps integration (react-native-maps)
- Push notification handling (Expo Notifications + FCM)
- Bundle optimization (Hermes, expo-image, lazy loading)

## Primary Files
- `apps/mobile/` (all files)
- `packages/ui/src/` (React Native primitives — coordinate with Web Agent)

## API Contract
- Consume only endpoints defined in `apps/api/openapi.yaml`
- Use `apps/mobile/lib/api-client.ts` typed wrapper (never raw fetch)
- Report missing endpoints to Lead Agent via GitHub Issue labeled `agent-blocker`

## Key Libraries
- expo-router@^3, expo SDK 51
- zustand@^5
- react-native-maps
- react-native-signature-canvas
- expo-notifications
- @react-native-firebase/auth
- expo-image (WebP, lazy)
- react-native-reanimated (swipeable cards)
- i18next + react-i18next (default locale: ko)

## Build Optimization Rules
- Hermes: `"jsEngine": "hermes"` in `app.json`
- Lazy load screens: `React.lazy()` for non-critical screens
- Images: `expo-image` (WebP auto-decode, lazy loading)
- Target bundle: **< 3MB** (check: `npx expo export --analyze`)

## Do Not
- Call RDS/Redis directly
- Hardcode API base URL (use `EXPO_PUBLIC_API_URL`)
- Commit `.env` files
- Use `fetch()` directly outside `api-client.ts`
