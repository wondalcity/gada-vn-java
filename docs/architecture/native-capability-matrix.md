# GADA VN — Native Capability Matrix

Screen-by-screen breakdown of Capacitor plugin requirements, loading mode, web fallback behavior, and platform permission requirements.

---

## 1. Column Definitions

| Column | Meaning |
|---|---|
| **Screen** | Screen name from screen-map |
| **ID** | Screen identifier (A-xx, B-xx, C-xx, D-xx) |
| **Can Share Web** | Whether the screen works identically in a web browser (✓ yes / ✗ no / ~ partial with caveats) |
| **Loading Mode** | How the screen is loaded in Capacitor: `Bundled` (static export), `Live URL` (loaded from gada.vn), or `Bundled+LiveNav` (bundled shell that navigates to live URL) |
| **Native Plugins Required** | `@capacitor/*` packages the screen uses |
| **Web Fallback** | Behavior when running in a web browser where Capacitor plugins are unavailable |
| **Notes** | Implementation notes |

---

## 2. Full Screen Matrix

### Auth Screens (A-01 to A-05)

| Screen | ID | Can Share Web | Mode | Native Plugins | Web Fallback | Notes |
|---|---|---|---|---|---|---|
| Phone OTP Login | A-01 | ✓ | Bundled | none (Firebase JS SDK runs in WebView) | ✓ same | +84 default; Firebase JS SDK handles OTP entirely in JS |
| OTP Verification | A-02 | ✓ | Bundled | none | ✓ same | 6-digit input; no native plugin needed |
| Password Login | A-03 | ✓ | Bundled | none | ✓ same | Email/password fallback path |
| Facebook Login | A-04 | ~ | Bundled | `@capacitor/browser` | `window.open` (standard redirect) | `@capacitor/browser` gives in-app browser with better UX; plain `window.open` is the web fallback |
| Registration | A-05 | ✓ | Bundled | none | ✓ same | Multi-step form; no native capability needed at registration time |

---

### Worker Screens (B-01 to B-12)

| Screen | ID | Can Share Web | Mode | Native Plugins | Web Fallback | Notes |
|---|---|---|---|---|---|---|
| Worker Home | B-01 | ✓ | Bundled | `@capacitor/geolocation`, `@capacitor/network` | Hide distance column; hide offline banner | GPS used to calculate Haversine distance to each job site; gracefully degrades |
| Worker Profile | B-02 | ✓ | Bundled | `@capacitor/preferences` | `localStorage` | Preferences used for session token and locale; localStorage is the web fallback |
| ID Document Upload | B-03 | ~ | Bundled | `@capacitor/camera`, `@capacitor/filesystem` | `<input type="file" accept="image/*">` | Camera plugin gives native camera/gallery prompt; file input is adequate web fallback but no EXIF stripping on some browsers |
| Signature Draw | B-04 | ✓ | Bundled | `@capacitor/filesystem`, `@capacitor/haptics` | No haptic feedback; canvas still works | `signature_pad` canvas runs identically in browser; only haptics and Filesystem temp save are native-only |
| Application List | B-05 | ✓ | Bundled | none | ✓ same | Read-only list; no native capability needed |
| Application Detail | B-06 | ✓ | Bundled | none | ✓ same | Status display + withdraw action; no native capability needed |
| Contract List | B-07 | ✓ | Bundled | none | ✓ same | Read-only list |
| Contract Detail + Sign | B-08 | ✓ | Bundled | none | ✓ same | PDF loaded via presigned S3 URL in iframe; signature capture uses canvas (see B-04) |
| Notifications | B-09 | ✓ | Bundled | `@capacitor/push-notifications` | No push badge; in-app notification list still renders | Push registration happens on app launch; this screen displays the notification inbox |
| Work Experience | B-10 | ✓ | Bundled | none | ✓ same | Form to add/edit work history |
| Hire List | B-11 | ✓ | Bundled | none | ✓ same | Active and past hires; read-only |
| Attendance History | B-12 | ✓ | Bundled | none | ✓ same | Worker's own attendance records; read-only |

---

### Manager Screens (C-01 to C-10)

| Screen | ID | Can Share Web | Mode | Native Plugins | Web Fallback | Notes |
|---|---|---|---|---|---|---|
| Manager Home | C-01 | ✓ | Bundled | `@capacitor/network` | Hide offline banner | Dashboard summary; network plugin for offline detection only |
| Manager Registration | C-02 | ~ | Bundled | `@capacitor/camera`, `@capacitor/filesystem` | `<input type="file">` | Business license and company document upload; same pattern as B-03 |
| Site List | C-03 | ✓ | Bundled | `@capacitor/geolocation` | Hide distance from site | Optional distance display to sites; gracefully degrades |
| Site Detail/Edit | C-04 | ✓ | Bundled | `@capacitor/camera` | `<input type="file">` | Gallery image upload for site photos; allowEditing: true for crop |
| Site Jobs | C-05 | ✓ | Bundled | none | ✓ same | Job list under a site; no native capability needed |
| Job Detail/Edit | C-06 | ✓ | Bundled | none | ✓ same | Job posting form; no native capability needed |
| Applicant List | C-07 | ✓ | Bundled | none | ✓ same | Accept/reject applicants; no native capability needed |
| Attendance Sheet | C-08 | ✓ | Bundled | none | ✓ same | Bulk daily attendance upsert form |
| Hire List | C-09 | ✓ | Bundled | none | ✓ same | Active hires per site/job |
| Manager Profile | C-10 | ✓ | Bundled | none | ✓ same | Registration status, account settings |

---

### Public Screens (D-01 to D-06)

Public screens are SSR/ISR pages served from `https://gada.vn`. They are loaded as Live URLs in Capacitor — the WebView navigates to the production server. Native plugins are not accessible on these pages (and are not needed, since these are browse-only discovery screens).

| Screen | ID | Can Share Web | Mode | Native Plugins | Web Fallback | Notes |
|---|---|---|---|---|---|---|
| Landing / Home | D-01 | ✓ | Live URL | none | ✓ same | SSG page; no native capability needed |
| Job Listing | D-02 | ✓ | Live URL | `@capacitor/geolocation` (future) | Hide distance filter | Distance-based filtering is a post-MVP enhancement; for MVP, location is not used on this page |
| Job Detail | D-03 | ✓ | Live URL | none | ✓ same | SSR page; the "Apply" CTA deep-links into the Bundled `(app)/` flow |
| Province Jobs | D-04 | ✓ | Live URL | none | ✓ same | Geo SEO page; read-only |
| Site Detail | D-05 | ✓ | Live URL | none | ✓ same | SSR page; read-only |
| Search Results | D-06 | ✓ | Live URL | none | ✓ same | Search is handled server-side; no native capability needed |

---

## 3. Plugin Permission Requirements

### Android `AndroidManifest.xml`

```xml
<!-- Geolocation — show distance to job site (B-01, C-03) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Camera + Gallery — ID document (B-03), manager docs (C-02), site images (C-04) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<!-- For Android < 13 (API 32 and below): -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />

<!-- Push Notifications (FCM) — application status, contract ready, attendance (B-09) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Network — all API calls; offline detection banner (B-01, C-01) -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Vibration — haptic feedback during signature drawing (B-04) -->
<uses-permission android:name="android.permission.VIBRATE" />
```

### iOS `Info.plist` Entries

```xml
<!-- Camera — ID document capture (B-03), site gallery (C-04), manager docs (C-02) -->
<key>NSCameraUsageDescription</key>
<string>신분증 및 현장 사진 업로드를 위해 카메라가 필요합니다. / Cần camera để tải lên ảnh CMND và công trường.</string>

<!-- Photo Library — pick existing images from gallery (B-03, C-02, C-04) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>신분증 및 현장 사진 업로드를 위해 사진 접근이 필요합니다. / Cần truy cập ảnh để tải lên ảnh CMND và công trường.</string>

<!-- Location — distance to job site display (B-01, C-03) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>현장까지의 거리를 표시하기 위해 위치 정보가 필요합니다. / Cần vị trí để hiển thị khoảng cách đến công trường.</string>

<!-- Background push notifications — FCM via APNs (B-09, all push types) -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

---

## 4. Web vs Native Feature Parity

| Feature | Web Browser | Capacitor Android | Capacitor iOS | Gap / Notes |
|---|---|---|---|---|
| Phone OTP | ✓ Firebase JS SDK | ✓ same JS SDK in WebView | ✓ same JS SDK in WebView | No gap |
| Facebook Login | ✓ standard OAuth redirect | ✓ via `@capacitor/browser` in-app browser | ✓ via `@capacitor/browser` in-app browser | Minor: in-app browser UX is smoother on native; redirect UX differs slightly |
| Camera capture | ✓ `<input accept="image/*">` — triggers OS camera | ✓ native camera app via plugin | ✓ native camera app via plugin | Better UX on native (full camera controls, flash, etc.) |
| Gallery pick | ✓ `<input type="file">` file picker | ✓ native Photos picker | ✓ native Photos picker | No functional gap; native picker is more polished |
| Signature draw | ✓ `signature_pad` HTML5 canvas | ✓ same canvas in Capacitor WebView | ✓ same canvas in Capacitor WebView | No gap — canvas runs identically |
| Push notifications | ~ Web Push (unreliable on iOS < 16.4; requires user permission grant via non-standard flow) | ✓ FCM full support; background + foreground | ✓ APNs via FCM; full support | Significant gap on web for iOS: push is the primary reason for native app |
| GPS distance | ✓ `navigator.geolocation` | ✓ `@capacitor/geolocation` (same API surface) | ✓ `@capacitor/geolocation` | No functional gap; plugin adds caching and better permission UX |
| Secure token storage | ~ `localStorage` — not encrypted, cleared on browser data wipe | ✓ `@capacitor/preferences` → Android Encrypted SharedPreferences | ✓ `@capacitor/preferences` → iOS Keychain | Security gap on web; native storage is significantly more secure |
| Deep links | ~ URL scheme not supported in browser; HTTPS links open browser normally | ✓ intent filter handles `gada://` + verified HTTPS links | ✓ URL scheme + Universal Links | Deep links not available in browser context |
| Haptic feedback | ✗ not available | ✓ `@capacitor/haptics` — ImpactStyle.Light during signature | ✓ `@capacitor/haptics` | Minor enhancement only; signature works without haptics |
| Offline detection | ✓ `navigator.onLine` + `online/offline` events | ✓ `@capacitor/network` (same semantic; more reliable on Android) | ✓ `@capacitor/network` | No functional gap |
| App icon + home screen presence | N/A (PWA install prompt inconsistent) | ✓ native app icon in launcher | ✓ native app icon on home screen | Distribution and trust gap resolved by app store presence |
| Status bar control | ✗ not available | ✓ `@capacitor/status-bar` — color + style | ✓ `@capacitor/status-bar` | Visual polish; not functional |
| Splash screen | ✗ not available | ✓ `@capacitor/splash-screen` — branded 2s splash | ✓ `@capacitor/splash-screen` | Perceived launch performance |

---

## 5. Build Variants

| Variant | Command | Output | `webDir` | `server.url` | Used for |
|---|---|---|---|---|---|
| Web production | `pnpm --filter web-next build` | Vercel / Node server | N/A | N/A | `gada.vn` web deployment |
| Capacitor development | `pnpm dev:android` or `pnpm dev:ios` | Live dev server | N/A | `http://192.168.x.x:3000` | Development with HMR; native plugins work against the live dev server |
| Capacitor production | `pnpm build:web && npx cap sync` | `apps/web-next/out/` static | `../web-next/out` | none (bundled) | App Store / Play Store release build |
| Capacitor staging | `BUILD_TARGET=capacitor pnpm --filter web-next build && npx cap sync` | `apps/web-next/out/` static | `../web-next/out` | none (bundled) | QA testing; mirrors production bundle |

### Build Variant Notes

- **Development variant**: `capacitor.config.ts` `server.url` must be set to the developer's LAN IP. The `cleartext: true` flag allows HTTP (Android blocks cleartext by default). This block must be removed before a production build.
- **Production variant**: `server.url` must be `undefined` (or the `server` block removed entirely). Capacitor serves pages from the bundled `android/app/src/main/assets/public/` directory via the `capacitor://localhost` protocol.
- **Staging variant**: Identical to production bundle but built against the staging API (`NEXT_PUBLIC_API_URL=https://staging-api.gada.vn`). Distributed via Firebase App Distribution for QA.

---

## 6. Screen Count Summary

| Category | Count | Mode | Plugin Dependency Level |
|---|---|---|---|
| Auth screens | 5 | Bundled | Low (Firebase JS only) |
| Worker screens | 12 | Bundled | Medium (camera, GPS, push) |
| Manager screens | 10 | Bundled | Medium (camera, GPS) |
| Public screens | 6 | Live URL | None (browse only) |
| **Total** | **33** | — | — |

Note: The original screen-map contains 58 screens when all sub-screens, modals, and tab states are counted individually. The 33 top-level screens above represent the primary navigation destinations. Sub-screens (e.g., contract signing modal within B-08, site map view within C-03) inherit the plugin requirements of their parent screen.
