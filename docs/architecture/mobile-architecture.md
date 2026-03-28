# GADA VN Mobile Architecture

## 1. Overview

### Mobile Strategy

GADA VN uses **Capacitor 6** to wrap the existing Next.js web application into a native Android and iOS shell. The Next.js app at `apps/web-next/` is the single source of truth for all UI; the native shell at `apps/mobile-shell/` adds native device capabilities on top of it.

### Why Capacitor over React Native

- **Single codebase with web** — the web team ships features that automatically appear in the mobile app with no additional work
- **No native UI reimplementation** — all screens are written once in React/Next.js and run identically in the browser and in Capacitor WebView
- **Web engineers can own both** — no Swift/Kotlin knowledge required for feature work; only plugin integration needs native awareness
- **Capacitor 6 is production-grade** — used by Ionic-based apps at scale; well-maintained plugin ecosystem

### Why Not PWA

- **iOS push notification limitations** — Safari Web Push was only added in iOS 16.4+ and requires specific user interaction; coverage is insufficient for Vietnamese users (many on older iOS or budget Android)
- **Camera/signature capabilities** — `getUserMedia` and `<input type=file>` work for gallery picks but cannot reliably trigger the native camera app with the same UX as a Capacitor plugin
- **App Store distribution** — construction workers trust apps from the Play Store/App Store more than a browser install prompt; app icon on home screen is expected
- **Secure token storage** — `localStorage` is not encrypted; `@capacitor/preferences` maps to Android Encrypted SharedPreferences and iOS Keychain

### Target Platforms

| Platform | Minimum Version | Notes |
|---|---|---|
| Android | 8.0 (API 26+) | Primary market (~90% of Vietnamese smartphones) |
| iOS | 15+ | Secondary market; required for App Store distribution |

### Primary Market Note

Android accounts for approximately 90% of Vietnam's smartphone market. All performance budgets, device testing, and QA priorities are optimized for mid-range Android devices (2–4 GB RAM, Snapdragon 400–600 series).

---

## 2. Hybrid Loading Architecture

### Two-Tier Strategy

The Next.js app has two route groups with different rendering requirements. Capacitor must handle both differently.

---

#### Tier 1 — Bundled Static Assets (CSR App Pages)

All routes under `(app)/` are purely client-side rendered. They fetch data from the Laravel API at runtime and do not require a server for HTML generation.

- **Included routes:** worker home, profile, applications, contracts, manager dashboard, notifications, attendance, signature capture, ID upload, settings
- **Build process:** `next build` with `output: 'export'` (activated via `BUILD_TARGET=capacitor` env var) emits static HTML/JS/CSS into `apps/web-next/out/`
- **Served from:** `apps/mobile-shell/android/app/src/main/assets/public/` (Android) and `apps/mobile-shell/ios/App/App/public/` (iOS)
- **Network dependency:** Page shells load from device storage; only API calls require network
- **Native plugin access:** Full access — Capacitor plugin bridge is available on all bundled pages

---

#### Tier 2 — Live URL Loading (SSR Public Pages)

All routes under `(public)/` require server-side rendering for SEO and fresh content. These cannot be bundled as static files.

- **Included routes:** job listing, job detail, site detail, province pages, landing page, search results
- **Loaded via:** Capacitor WebView navigating to `https://gada.vn` — the production Next.js server handles SSR
- **Native plugin access:** Not available on live-URL pages (they are read-only browse/discovery pages; no camera, GPS, or push interaction needed there)
- **Navigation into bundled tier:** When a user taps "Apply" on a live-URL job detail page, navigation bridges back to the bundled `(app)/` login or application flow

---

#### Why This Split Works

- Public pages are read-only browse and discovery; no native capabilities are needed there
- App pages (authenticated flows) need camera for ID upload, GPS for distance display, push for status alerts — those are all bundled
- Auth pages (login/register/OTP) are bundled so the Firebase JS SDK, Capacitor Preferences, and the session bridge all operate correctly

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Capacitor WebView                     │
│                                                         │
│  ┌───────────────────┐    ┌──────────────────────────┐  │
│  │  Bundled Assets   │    │    Live URL Loading      │  │
│  │  (app pages)      │    │    (public pages)        │  │
│  │                   │    │                          │  │
│  │  /worker/*        │    │  gada.vn/*/jobs          │  │
│  │  /manager/*       │◀──▶│  gada.vn/*/jobs/[slug]   │  │
│  │  /login           │    │  gada.vn/*/sites/[slug]  │  │
│  │  /register        │    │                          │  │
│  └─────────┬─────────┘    └──────────────────────────┘  │
│            │                                            │
│     Capacitor Plugin Bridge                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Geolocation │ Camera │ PushNotifications │ ...   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                          │
    Native Android/iOS         Remote API + CDN
    (GPS, FCM, Camera)         (Laravel + S3)
```

---

## 3. Capacitor Plugin Stack

### Plugins in Use

| Plugin | Package | Version | Purpose | Used in |
|---|---|---|---|---|
| Geolocation | `@capacitor/geolocation` | ^6.0.0 | Distance to job site | Worker home, job detail |
| Push Notifications | `@capacitor/push-notifications` | ^6.0.0 | FCM token registration + receive push | App launch, notifications page |
| Camera | `@capacitor/camera` | ^6.0.0 | ID document photo, site images | ID upload, site gallery upload |
| Filesystem | `@capacitor/filesystem` | ^6.0.0 | Temp file for signature PNG upload | Signature capture page |
| Preferences | `@capacitor/preferences` | ^6.0.0 | Store session token + user locale | Auth flow, middleware |
| Splash Screen | `@capacitor/splash-screen` | ^6.0.0 | Native splash screen (GADA logo) | App launch |
| Status Bar | `@capacitor/status-bar` | ^6.0.0 | Status bar color = brand primary | All app screens |
| App | `@capacitor/app` | ^6.0.0 | Handle deep links, app state | Navigation, background/foreground |
| Browser | `@capacitor/browser` | ^6.0.0 | Open external URLs (terms, etc.) | Settings |
| Keyboard | `@capacitor/keyboard` | ^6.0.0 | Adjust layout when keyboard shows | Form pages |
| Network | `@capacitor/network` | ^6.0.0 | Offline detection + banner | All app screens |
| Haptics | `@capacitor/haptics` | ^6.0.0 | Vibration feedback on signature draw | Signature page |

### Not Needed (MVP)

- **Biometrics** — MVP uses phone OTP only; biometric login is post-MVP
- **Contacts** — not needed for a construction worker marketplace
- **Bluetooth** — no BLE use case in this app
- **In-app purchases** — subscription/payment handled externally if ever needed

---

## 4. Authentication Flow (Mobile-Specific)

### Phone OTP Flow (Primary for Vietnamese Users)

```
User enters phone number (+84 default)
    │
    ▼
App calls POST /auth/otp/send → Laravel → Firebase Admin SMS
    │
    ▼ (6-digit OTP arrives via SMS)
User enters OTP → POST /auth/otp/verify → returns Firebase customToken
    │
    ▼
Firebase JS SDK: signInWithCustomToken(customToken) → Firebase ID Token
    │
    ▼
@capacitor/preferences: set('gada_session', idToken)
    │
    ▼
Subsequent requests: Authorization: Bearer <idToken>
Token refresh: Firebase SDK auto-refreshes; on refresh → update Preferences
```

### Facebook OAuth Flow

```
@capacitor/browser: open Facebook OAuth URL
    │
    ▼ (redirect back to app via deep link gada://auth/facebook?token=...)
Firebase JS SDK: signInWithCredential(FacebookAuthProvider.credential(token))
    │
    ▼ Firebase ID Token → POST /auth/social/facebook → Laravel upsert
    │
    ▼ @capacitor/preferences: set('gada_session', idToken)
```

### Token Storage

| Key | Storage | Value |
|---|---|---|
| `gada_session` | `@capacitor/preferences` | Firebase ID token |
| `gada_locale` | `@capacitor/preferences` | `ko` / `vi` / `en` |
| `gada_fcm_token` | `@capacitor/preferences` | FCM device token |

`@capacitor/preferences` is used instead of `localStorage` because it is more secure (maps to Android Encrypted SharedPreferences and iOS Keychain) and survives app reinstall on iOS.

### Middleware Adaptation for Capacitor

The Next.js `middleware.ts` reads a `gada_session` cookie for route protection. In Capacitor, there is no HTTP response to set cookies — instead, `capacitor-init.ts` runs a session bridge on every app launch:

1. Read `gada_session` from `@capacitor/preferences`
2. Write `document.cookie = 'gada_session=<token>; path=/; SameSite=Strict'`
3. Next.js middleware can now read the cookie normally on subsequent navigation

See `apps/mobile-shell/src/bridge/session-bridge.ts` for implementation.

---

## 5. Push Notification Implementation

### Registration Flow

```
App launch
    │
    ▼
@capacitor/push-notifications: requestPermissions()
    │ (if granted)
    ▼
pushNotifications.register() → triggers FCM token refresh event
    │
    ▼
pushNotifications.addListener('registration', ({ value: fcmToken }) => {
    // Store locally
    Preferences.set({ key: 'gada_fcm_token', value: fcmToken })
    // Register with backend
    PUT /devices/fcm-token { token: fcmToken }
})
```

### Notification Types and Deep Link Routing

| Type | Payload | Deep Link |
|---|---|---|
| `application_status` | `{ jobId, status }` | `gada://worker/applications/{applicationId}` |
| `contract_ready` | `{ contractId }` | `gada://worker/contracts/{contractId}` |
| `attendance_recorded` | `{ jobId, date }` | `gada://worker/hires` |
| `manager_approved` | `{}` | `gada://manager` |
| `manager_rejected` | `{ reason }` | `gada://manager/profile` |
| `hire_cancelled` | `{ jobId }` | `gada://worker/hires` |

### Background Notification Handling

- `pushNotifications.addListener('pushNotificationActionPerformed')` fires when the user taps a notification while the app is in the background or closed
- The listener parses the `type` field from the notification data, maps it to a route, and calls `window.location.href` to navigate within the app
- Deep links are handled by the `@capacitor/app` `appUrlOpen` listener — see `capacitor-init.ts`

---

## 6. Camera and Image Upload

### ID Document Upload

```typescript
// User chooses camera or gallery
const image = await Camera.getPhoto({
  quality: 85,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Prompt, // Shows "Camera" or "Gallery" choice
})

// Convert base64 to Blob
const blob = await base64ToBlob(image.base64String!, image.format)

// Validate size (max 10MB)
if (blob.size > 10 * 1024 * 1024) throw new Error('FILE_TOO_LARGE')

// Upload via multipart form
const formData = new FormData()
formData.append('image', blob, `id-doc.${image.format}`)
await fetch('/api/v1/worker/profile/id-documents', { method: 'POST', body: formData })
```

### Image Quality Targets

| Upload type | Quality | Max size | Format |
|---|---|---|---|
| ID document (front/back) | 85 | 10 MB | JPEG/PNG |
| Signature | 100 (PNG) | 2 MB | PNG only |
| Site gallery image | 80 | 10 MB | JPEG/PNG |

### EXIF Stripping

Strip GPS and device metadata from ID documents before upload for privacy. Use the `browser-image-compression` library in the web layer — it strips EXIF during compression. This runs entirely in the WebView before the multipart POST.

---

## 7. Signature Capture

### Implementation Strategy

- Use `signature_pad` library (HTML5 canvas-based) — runs natively in Capacitor WebView without any native plugin
- No native signature plugin needed
- Save as PNG via `canvas.toDataURL('image/png')`
- Use `@capacitor/filesystem` to write a temporary file, then upload via multipart

```typescript
// On "Save signature" button
const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement
const dataUrl = canvas.toDataURL('image/png')
const base64 = dataUrl.split(',')[1]

// Write to temp file
await Filesystem.writeFile({
  path: 'signature.png',
  data: base64,
  directory: Directory.Cache,
})

// Read back as blob for upload
const file = await Filesystem.readFile({ path: 'signature.png', directory: Directory.Cache })
const blob = base64ToBlob(file.data as string, 'image/png')

// Validate 2MB limit
if (blob.size > 2 * 1024 * 1024) throw new Error('SIGNATURE_TOO_LARGE')

// Upload
const formData = new FormData()
formData.append('signature', blob, 'signature.png')
await fetch('/api/v1/worker/profile/signature', { method: 'POST', body: formData })

// Add haptic feedback during drawing
await Haptics.impact({ style: ImpactStyle.Light })
```

### Canvas Specification

360 × 180 px logical size at 2x DPR renders at 720 × 360 actual pixels — sufficient resolution for a contract signature that will be printed at A4 scale.

---

## 8. GPS / Geolocation

### Use Case

Show the worker's distance from a job site on job cards (worker home screen) and on the job detail page. This is a read-only display — no tracking, no background location.

```typescript
// Request permission once on first use
const permission = await Geolocation.requestPermissions()
if (permission.location !== 'granted') {
  // Show "Enable location" prompt, gracefully degrade (hide distance)
  return
}

// Get current position (cached up to 30s for performance)
const position = await Geolocation.getCurrentPosition({
  enableHighAccuracy: false, // battery-friendly
  timeout: 10000,
})

// Calculate distance to job site (Haversine)
const distance = haversineKm(
  position.coords.latitude, position.coords.longitude,
  job.site.lat, job.site.lng
)
// Display: "현장까지 2.4km" / "Cách 2.4km"
```

### Permission UX

- **Android:** Runtime permission dialog shown on first job list view
- **iOS:** `NSLocationWhenInUseUsageDescription` in `Info.plist` — explanation in Korean + Vietnamese: "현장 거리 표시를 위해 위치 정보가 필요합니다"
- **If denied:** Distance column is hidden; no other app functionality is blocked; user can re-enable from device Settings

---

## 9. Internationalization (Mobile-Specific)

### Locale Initialization Order

```
1. @capacitor/preferences: get('gada_locale')
2. If not set: check device locale (Capacitor Device.getLanguageCode())
3. If device locale not in ['ko','vi','en']: use 'ko' (default)
4. Set in: Next.js URL prefix + document.cookie + API Accept-Language header
```

### Vietnamese Phone Number Handling

- Phone input component: country code selector defaults to Vietnam (+84) when device locale is `vi`
- Input mask: `+84 xxx xxx xxxx` (10 digits after country code)
- Format stored in DB: E.164 format (`+84xxxxxxxxxx`)
- Auto-detect: if device locale is `vi` → pre-select +84; otherwise show Korea +82 as the first option alongside +84

### Locale Switching

A worker can switch from Korean to Vietnamese via profile settings. The switch triggers:

1. `Preferences.set('gada_locale', 'vi')`
2. URL change to `/vi/...` prefix
3. `Accept-Language: vi` on all subsequent API requests

---

## 10. Build Optimization Strategy

### Next.js Build for Capacitor

```bash
# Build static export for app pages only
BUILD_TARGET=capacitor pnpm --filter web-next build
# Output lands in apps/web-next/out/
```

### Static Export Limitations

- `force-dynamic` pages (job detail, site detail) cannot be exported — those are handled by Live URL loading (Tier 2)
- `next/image` optimization server is not available in static export — use `unoptimized: true` for Capacitor builds; CloudFront Lambda@Edge handles WebP conversion for S3-sourced images

### Separate Build Targets

```typescript
// next.config.ts — detect Capacitor build
const isCapacitor = process.env.BUILD_TARGET === 'capacitor'

const nextConfig: NextConfig = {
  output: isCapacitor ? 'export' : undefined,
  images: {
    unoptimized: isCapacitor, // Capacitor can't use Next.js image optimization server
    remotePatterns: [...],
  },
  // For Capacitor: basePath not needed (file:// protocol)
  // For web: basePath = undefined
}
```

### Bundle Size Targets

| Asset | Target | Strategy |
|---|---|---|
| Initial JS bundle | < 150 KB gzipped | Code splitting, dynamic imports |
| Per-route chunk | < 50 KB gzipped | Lazy load per page |
| Images (per screen) | < 200 KB | WebP, lazy load, blur placeholder |
| Total app install size | < 25 MB | Exclude unused Capacitor plugins |
| APK download size | < 12 MB | AAB format — Play Store optimizes per device |

### Code Splitting Strategy

```typescript
// Heavy components: load dynamically
const SignaturePad = dynamic(() => import('@/components/SignaturePad'), { ssr: false })
const ImageCropper = dynamic(() => import('@/components/ImageCropper'), { ssr: false })
const ContractPDFViewer = dynamic(() => import('@/components/ContractPDFViewer'), { ssr: false })
```

### Tree Shaking

- Import only needed Capacitor plugins — each plugin is a separate npm package; unused ones add zero bytes
- Mark unused plugins as `sideEffects: false` in their consuming `package.json`
- Prefer individual plugin package imports over `@capacitor/core` barrel imports

---

## 11. Image Optimization (Mobile Context)

### S3 + CloudFront Strategy

- All uploads go to S3; only the object key is stored in the database
- CloudFront distribution in `ap-southeast-1` (Singapore) — geographically close to Vietnam
- Lambda@Edge performs on-the-fly WebP conversion based on the `Accept: image/webp` request header
- Cache-Control: `max-age=31536000, immutable` — images are content-addressed (key includes hash)

### In Capacitor WebView

- `next/image` with `unoptimized: true` — no Next.js image optimization server in static export
- Use `<img loading="lazy">` directly for Capacitor builds
- Thumbnail URLs include CloudFront query params: `?w=400&h=300&fit=cover&fmt=webp`
- Full-resolution images loaded on tap via a lightbox pattern

### ID Document Images

- Compressed client-side with `browser-image-compression` before upload
- Max upload dimension: 1200px — sufficient for document verification
- Never displayed in job lists or cards — only visible in the admin verification flow

### Signature Images

- PNG format (lossless — required for contract legibility)
- 2x DPR canvas produces 720×360px PNG
- Typical file size: 30–80 KB (stroke vectors compress extremely well in PNG)

---

## 12. Offline Behavior

### MVP Offline Strategy

- Show "인터넷 연결을 확인해 주세요" banner via `@capacitor/network` status change listener
- Cache last-loaded worker profile in `@capacitor/preferences` (read-only offline display)
- Block all form submissions when offline with a user-friendly retry prompt
- POST/PUT/DELETE operations: require online — show a "연결 후 다시 시도해 주세요" dialog

### Post-MVP

Offline queue with IndexedDB sync (e.g., attendance recording, application drafts). Not in scope for MVP.

---

## 13. Deep Link Configuration

### Android `AndroidManifest.xml`

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="gada" android:host="*" />
  <data android:scheme="https" android:host="gada.vn" />
</intent-filter>
```

### iOS `Info.plist`

```xml
<key>CFBundleURLSchemes</key>
<array><string>gada</string></array>
```

### Deep Link Handler

```typescript
App.addListener('appUrlOpen', ({ url }) => {
  const parsed = new URL(url)
  if (parsed.protocol === 'gada:') {
    const path = parsed.pathname  // e.g., /worker/contracts/123
    router.push(`/ko${path}`)  // use stored locale
  }
})
```

HTTPS deep links (`https://gada.vn/...`) are verified via Android App Links (`autoVerify="true"`) and iOS Universal Links (requires `apple-app-site-association` file served at `https://gada.vn/.well-known/apple-app-site-association`).
