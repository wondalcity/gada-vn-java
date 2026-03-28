# GADA VN — UI Fix List (Prioritized)
**Date**: 2026-03-21
**Source**: docs/qa/ux-audit.md
**Total issues**: 45 across 9 categories

---

## Priority Key

| Level | Criteria | Must fix before |
|-------|----------|----------------|
| **P0** | Blank/broken screen, blocking user journey | MVP launch |
| **P1** | Wrong behavior, localization failure, security perception | MVP launch |
| **P2** | Usability friction, inconsistency, accessibility | Post-launch sprint 1 |
| **P3** | Polish, nice-to-have | Post-launch sprint 2+ |

---

## P0 — Launch Blockers

### UI-P0-01 — Worker home page is a blank stub
**Source**: UX-WORKER-01
**File**: `apps/web-next/src/app/[locale]/(app)/worker/page.tsx`
**Problem**: Worker dashboard shows only a greeting string after login. No job listings, no application status, no action CTA.
**Fix**:
- Fetch `GET /worker/applications` (latest 3) and `GET /worker/hires` (upcoming) server-side
- Render an "활성 지원 현황" card with application count/status
- Add a prominent "일자리 찾기 →" CTA button linking to `/[locale]/jobs`
- Add a "다음 출근일" card if a contract is FULLY_SIGNED with a future work date

**Effort**: 4h

---

### UI-P0-02 — Manager home page is a blank stub
**Source**: UX-MANAGER-01
**File**: `apps/web-next/src/app/[locale]/(app)/manager/page.tsx`
**Problem**: Manager dashboard renders only the page title. Managers have no overview of pending applicants, active jobs, or today's attendance.
**Fix**:
- Fetch `GET /manager/hires` (count) + `GET /manager/sites` (active count) server-side
- Show 3 stat cards: pending applicants, active jobs, hired workers
- Add quick-links to "현장 관리", "채용 현황", "출근 관리"

**Effort**: 4h

---

### UI-P0-03 — Manager register mobile form shows Korean text to Vietnamese users
**Source**: UX-I18N-04
**File**: `apps/mobile/app/(manager)/register.tsx`
**Problem**: All labels, placeholders, and button text are hardcoded Korean. The `useTranslation` hook is imported but never called.
**Fix**:
- Replace all hardcoded strings with `t('manager.registration.*')` calls
- Add missing keys to `vi/manager.json` for registration flow
- Verify iOS/Android renders Vietnamese text correctly (font fallback)

**Effort**: 2h

---

### UI-P0-04 — Mobile screens have no SafeAreaView
**Source**: UX-MOB-01
**Files**: `apps/mobile/app/(worker)/index.tsx`, `profile.tsx`, `jobs/[id].tsx`, `contracts/[id].tsx`, `(manager)/index.tsx`, `register.tsx`
**Problem**: Content is clipped behind Dynamic Island on iPhone 14/15 Pro and behind Android navigation bars.
**Fix**: Wrap root `<View>` in each screen with `<SafeAreaView style={{ flex: 1 }}>` from `react-native-safe-area-context`. The tab navigator in `_layout.tsx` may already handle some of this — audit per screen.

**Effort**: 2h

---

## P1 — Must Fix Before Launch

### UI-P1-01 — Double error display on OTP phone step
**Source**: UX-AUTH-01
**File**: `apps/web-next/src/components/auth/LoginForm.tsx:188,193`
**Problem**: Error message appears twice when phone OTP send fails.
**Fix**: Remove the standalone `{error && <p>...}` block at line 193 on the phone tab. The `PhoneInput` component already renders the error via its `error` prop.

**Effort**: 15min

---

### UI-P1-02 — Phone number validation too loose
**Source**: UX-AUTH-02
**File**: `apps/web-next/src/components/auth/LoginForm.tsx:67`
**Problem**: `phone === '+84'` only catches the empty default. Single-digit entries pass.
**Fix**:
```typescript
const digits = phone.replace(/\D/g, '')
if (digits.length < 10) {   // country code (2) + 8 digit minimum
  setError(t('otp.phone_too_short'))
  return
}
```
Add `otp.phone_too_short` key to both `ko` and `vi` locale files.

**Effort**: 30min

---

### UI-P1-03 — Weekday labels hardcoded Korean in attendance
**Source**: UX-MANAGER-06
**File**: `apps/web-next/src/components/manager/attendance/AttendanceManagerClient.tsx:16`
**Problem**: `WEEKDAY_LABELS = ['일','월','화','수','목','금','토']` shown to Vietnamese managers.
**Fix**:
```typescript
function formatDateLocale(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}
```
Remove `WEEKDAY_LABELS` constant and `formatDateKo()`, replace with `formatDateLocale(date, locale)`. The `locale` prop is already passed to `AttendanceManagerClient`.

**Effort**: 1h

---

### UI-P1-04 — Applicant tab labels hardcoded Korean
**Source**: UX-MANAGER-02
**File**: `apps/web-next/src/components/manager/applicants/ApplicantListClient.tsx:16–21`
**Problem**: `TAB_LABELS` object contains Korean strings.
**Fix**: Replace with `useTranslations('manager')` and map:
```typescript
const t = useTranslations('manager')
const TAB_LABELS = {
  ALL: t('applicants.tab_all'),
  PENDING: t('applicants.tab_pending'),
  ACCEPTED: t('applicants.tab_accepted'),
  REJECTED: t('applicants.tab_rejected'),
}
```
Add missing i18n keys to `ko/manager.json` and `vi/manager.json`.

**Effort**: 1h

---

### UI-P1-05 — Attendance status labels hardcoded Korean
**Source**: UX-MANAGER-07
**File**: `AttendanceManagerClient.tsx:248–252`
**Problem**: Chip labels `['출근','반차','결근','미확인']` are hardcoded.
**Fix**: Import from `STATUS_LABELS` constant in `@/lib/attendance` (which should contain locale-aware labels). If not, add locale map:
```typescript
const STATUS_CHIP_LABELS = {
  ATTENDED: t('attendance.attended'),
  HALF_DAY: t('attendance.half_day'),
  ABSENT:   t('attendance.absent'),
  PENDING:  t('attendance.pending'),
}
```

**Effort**: 1h

---

### UI-P1-06 — formatVND and formatDate hardcoded to ko-KR
**Source**: UX-WORKER-02, UX-WORKER-03
**File**: `apps/web-next/src/components/worker/contracts/WorkerContractDetailClient.tsx:11,15`
**Problem**: Currency and date formatting use Korean locale regardless of page locale.
**Fix**: Pass `locale` prop to `WorkerContractDetailClient` and update:
```typescript
function formatVND(n: number, locale: string): string {
  const l = locale === 'vi' ? 'vi-VN' : locale === 'en' ? 'en-US' : 'ko-KR'
  return new Intl.NumberFormat(l).format(n) + ' ₫'
}
function formatDate(d: string, locale: string): string {
  const l = locale === 'vi' ? 'vi-VN' : locale === 'en' ? 'en-US' : 'ko-KR'
  return new Date(d).toLocaleDateString(l, { year:'numeric', month:'long', day:'numeric', weekday:'short' })
}
```
Update call sites to pass `locale`.

**Effort**: 1h

---

### UI-P1-07 — Worker mobile profile shows "근로자" instead of real name
**Source**: UX-WORKER-09
**File**: `apps/mobile/app/(worker)/profile.tsx`
**Problem**: Header name is the static string "근로자".
**Fix**: Call `GET /worker/profile` on mount, store `full_name` in state, display it in the header. Show a skeleton or "---" while loading.

**Effort**: 1h

---

### UI-P1-08 — FAB occludes last job card on manager mobile
**Source**: UX-MANAGER-11
**File**: `apps/mobile/app/(manager)/index.tsx`
**Problem**: Last item in `FlatList` is hidden behind the FAB.
**Fix**:
```typescript
<FlatList
  contentContainerStyle={{ paddingBottom: 88 }}  // FAB height + gap
  ...
/>
```

**Effort**: 15min

---

### UI-P1-09 — Register link in LoginForm is a `<a>` tag (full-page reload)
**Source**: UX-AUTH-04
**File**: `apps/web-next/src/components/auth/LoginForm.tsx:346`
**Fix**:
```tsx
import Link from 'next/link'
// Replace <a href={...}> with:
<Link href={`/${locale}/register`} className="text-[#0669F7] font-medium">
  {t('login.register_link')}
</Link>
```

**Effort**: 5min

---

### UI-P1-10 — No warning before unsaved attendance is discarded on date change
**Source**: UX-STATE-05
**File**: `apps/web-next/src/components/manager/attendance/AttendanceManagerClient.tsx`
**Problem**: Navigating dates silently discards dirty drafts.
**Fix**: Before applying `setSelectedDate` in the nav buttons, check `dirtyCount > 0` and show a confirmation:
```typescript
function navigateDate(offset: number) {
  if (dirtyCount > 0 && !window.confirm('저장되지 않은 변경사항이 있습니다. 이동하시겠습니까?')) return
  setSelectedDate(d => addDays(d, offset))
}
```

**Effort**: 30min

---

### UI-P1-11 — No admin confirmation step on user delete
**Source**: UX-ADMIN-06
**File**: `apps/admin-laravel/resources/views/admin/users/index.blade.php`
**Problem**: Delete button submits immediately without confirmation.
**Fix**: Add `onclick="return confirm('이 사용자를 삭제하시겠습니까? 이 작업은 되돌릭 수 없습니다.')"` to the delete form submit button.

**Effort**: 15min

---

### UI-P1-12 — Contract download should be an anchor, not window.open
**Source**: UX-WORKER-07
**File**: `apps/web-next/src/components/worker/contracts/WorkerContractDetailClient.tsx:327–335`
**Fix**: Replace the button with:
```tsx
{contract.status === 'FULLY_SIGNED' && contract.downloadUrl && (
  <a
    href={contract.downloadUrl}
    target="_blank"
    rel="noopener noreferrer"
    download
    className="block w-full py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm text-center hover:bg-blue-700 transition-colors"
  >
    계약서 다운로드
  </a>
)}
```

**Effort**: 15min

---

### UI-P1-13 — Applicant error state has no retry button
**Source**: UX-MANAGER-04
**File**: `apps/web-next/src/components/manager/applicants/ApplicantListClient.tsx:192–198`
**Fix**: Add a retry button to the error state:
```tsx
if (error) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-center">
      <p className="text-[#ED1C24] text-sm mb-4">{error}</p>
      <button
        type="button"
        onClick={() => { setError(null); setIsLoading(true) /* re-trigger effect */ }}
        className="px-4 py-2 rounded-full border border-[#DDDDDD] text-sm"
      >
        다시 시도
      </button>
    </div>
  )
}
```

**Effort**: 20min

---

## P2 — Post-Launch Sprint 1 (Usability)

### UI-P2-01 — Add Tailwind custom theme tokens
**Source**: UX-TOKEN-01
**File**: `apps/web-next/tailwind.config.ts`
**Problem**: All colors are hardcoded hex strings. A change to the primary color requires grep-replace across the codebase.
**Fix**:
```typescript
theme: {
  extend: {
    colors: {
      primary:  { DEFAULT: '#0669F7', hover: '#0553CC' },
      error:    '#ED1C24',
      'text-dark':   '#25282A',
      'text-muted':  '#7A7B7A',
      border:   '#DDDDDD',
      'bg-page':     '#F5F7FA',
      'bg-card':     '#FAFAFA',
    },
  },
},
```
Then replace `text-[#0669F7]` → `text-primary`, `border-[#DDDDDD]` → `border-border`, etc.

**Effort**: 4h (global find-replace + test)

---

### UI-P2-02 — Add signature canvas guide line and placeholder
**Source**: UX-WORKER-04
**File**: `apps/web-next/src/components/worker/contracts/WorkerContractDetailClient.tsx`
**Fix**: After canvas renders, draw a dashed guide line at 70% canvas height:
```typescript
React.useEffect(() => {
  const canvas = canvasRef.current
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = '#E0E0E0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(16, canvas.height * 0.7)
  ctx.lineTo(canvas.width - 16, canvas.height * 0.7)
  ctx.stroke()
  ctx.setLineDash([])
}, [canvasRef])
```
Also add a small "✕" icon placeholder in the top-left quadrant when the canvas is empty.

**Effort**: 1h

---

### UI-P2-03 — Add undo for signature last stroke
**Source**: UX-WORKER-05
**File**: `apps/web-next/src/hooks/useSignatureCanvas.ts`
**Fix**: Track individual strokes as an array of path segments. Add `undoStroke()` to the hook that pops the last path and redraws. Expose in `SignaturePad` as a third button between "지우기" and "서명하기".

**Effort**: 2h

---

### UI-P2-04 — Auto-focus first OTP box after phone step
**Source**: UX-AUTH-03
**File**: `apps/web-next/src/components/auth/OtpInput.tsx`
**Fix**: Add `autoFocus` to the first input (index 0) so the keyboard opens automatically when the OTP step is shown.

**Effort**: 15min

---

### UI-P2-05 — Add page transition loading indicator
**Source**: UX-STATE-02
**File**: `apps/web-next/src/app/[locale]/(app)/layout.tsx`
**Fix**: Add `loading.tsx` files to key route segments, or install `npx-progress` with the `useRouter` events:
```
apps/web-next/src/app/[locale]/(app)/loading.tsx
→ export default function Loading() { return <div className="...skeleton..." /> }
```

**Effort**: 2h

---

### UI-P2-06 — Move canvas to Tailwind-compatible approach
**Source**: UX-WORKER-06
**File**: `WorkerContractDetailClient.tsx:88–97`
**Fix**: Replace the `style={{}}` object on the `<canvas>` with CSS classes. Add a `.signature-canvas` class to `globals.css`:
```css
.signature-canvas {
  @apply w-full border border-border rounded-sm bg-[#FAFAFA] block cursor-crosshair;
  height: 160px;
  touch-action: none;
}
```

**Effort**: 30min

---

### UI-P2-07 — Show slots filled/total on manager job list cards
**Source**: UX-STATE-04
**Problem**: Job cards in the manager sites/jobs list do not show slot fill ratio.
**Fix**: Add `{slotsFilled}/{slotsTotal}` with a small progress bar to each job card component. Color the bar green when full.

**Effort**: 1h

---

### UI-P2-08 — "전체 출근" button label clarification
**Source**: UX-MANAGER-09
**File**: `AttendanceManagerClient.tsx:266`
**Fix**: Change label to `전체 출근 (미확인 ${pendingCount}명)` to make the scope explicit. Disable the button when `pendingCount === 0`.

**Effort**: 30min

---

### UI-P2-09 — Per-row save confirmation flash
**Source**: UX-MANAGER-08
**File**: `AttendanceManagerClient.tsx`
**Fix**: After `saveRow()` succeeds, set a transient `savedId` state and render a brief green checkmark on the row for 1.5s:
```typescript
const [savedId, setSavedId] = React.useState<string | null>(null)
// After save:
setSavedId(workerId)
setTimeout(() => setSavedId(null), 1500)
```

**Effort**: 1h

---

### UI-P2-10 — Replace admin Tailwind CDN with build step
**Source**: UX-ADMIN-01
**File**: `apps/admin-laravel/resources/views/layouts/admin.blade.php`
**Fix**: Install Tailwind as a dev dependency in `apps/admin-laravel`:
```bash
pnpm --filter admin-laravel add -D tailwindcss postcss autoprefixer
npx tailwindcss init
```
Build CSS to `public/css/admin.css` and update layout to load the static file. Remove CDN script tag.

**Effort**: 2h

---

### UI-P2-11 — Add accessible alternatives to admin status badges
**Source**: UX-A11Y-03
**Fix**: Prefix each status badge text with an icon:
- PENDING → ⏳ 검토중
- APPROVED → ✓ 승인됨
- REJECTED → ✗ 반려됨
And add `aria-label` to each badge for screen readers.

**Effort**: 1h

---

### UI-P2-12 — Approve/Reject separation in admin table
**Source**: UX-ADMIN-03
**File**: `apps/admin-laravel/resources/views/admin/approvals/index.blade.php`
**Fix**: Show only "승인" in the table row. Move "반려" to the detail page only. This removes the adjacent destructive/constructive button pair that creates misclick risk.

**Effort**: 1h

---

### UI-P2-13 — Add page-level loading skeleton for Next.js app routes
**Source**: UX-STATE-02
**Fix**: Create `loading.tsx` files at:
- `(app)/worker/loading.tsx`
- `(app)/manager/loading.tsx`
- `(app)/manager/sites/loading.tsx`
Each returns a skeleton grid matching the page layout.

**Effort**: 2h

---

### UI-P2-14 — Add KeyboardAvoidingView to mobile manager register form
**Source**: UX-MOB-05
**File**: `apps/mobile/app/(manager)/register.tsx`
**Fix**: Wrap form in:
```tsx
import { KeyboardAvoidingView, Platform } from 'react-native'
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView>{/* form content */}</ScrollView>
</KeyboardAvoidingView>
```

**Effort**: 30min

---

## P3 — Post-Launch Polish

### UI-P3-01 — Unify background token to a single value
**Source**: UX-TOKEN-02
**Problem**: Three background values: `#FAFAFA`, `#F5F5F5`, `#F5F7FA`
**Fix**: Choose one (suggest `#F5F7FA` for pages, `#FAFAFA` for cards). Update Tailwind theme. Do as part of UI-P2-01.

---

### UI-P3-02 — Add "forgot password" link on email login tab
**Source**: UX-AUTH-05
**Fix**: Add a placeholder `<p>` below the login button: `비밀번호를 잊으셨나요? [관리자에게 문의]` (linked to contact email). Full self-service password reset is a post-MVP feature.

---

### UI-P3-03 — Contract signing success state improvement
**Source**: UX-WORKER-08
**Fix**: After successful sign, show a centered modal or full-screen confirmation with:
- A check animation (Lottie or CSS)
- "서명이 완료되었습니다! 사업주의 서명을 기다리는 중입니다."
- A "확인" button that dismisses and returns to the contract view

---

### UI-P3-04 — Add rejection reason character counter on admin modal
**Source**: UX-ADMIN-04
**Fix**: Add `maxlength="500"` and a live character counter to the rejection textarea:
```html
<textarea maxlength="500" id="reason" x-model="reason"></textarea>
<p x-text="`${reason.length}/500`" class="text-xs text-gray-400 text-right"></p>
```

---

### UI-P3-05 — Add accessible aria-label to OTP digit inputs
**Source**: UX-A11Y-02
**File**: `apps/web-next/src/components/auth/OtpInput.tsx`
**Fix**: Add `aria-label={`인증번호 ${index + 1}번째 숫자`}` to each digit input.

---

## Fix Summary by File

| File | P0 | P1 | P2 | P3 |
|------|----|----|----|-----|
| `worker/page.tsx` | 1 | — | — | — |
| `manager/page.tsx` | 1 | — | — | — |
| `mobile/(manager)/register.tsx` | 1 | — | 1 | — |
| `mobile/_layout.tsx` / all screens | 1 | — | — | — |
| `LoginForm.tsx` | — | 2 | 1 | 1 |
| `WorkerContractDetailClient.tsx` | — | 2 | 3 | 1 |
| `AttendanceManagerClient.tsx` | — | 2 | 2 | — |
| `ApplicantListClient.tsx` | — | 2 | — | — |
| `mobile/(worker)/profile.tsx` | — | 1 | — | — |
| `mobile/(manager)/index.tsx` | — | 1 | — | — |
| `admin/layouts/admin.blade.php` | — | — | 1 | — |
| `admin/approvals/index.blade.php` | — | — | 1 | — |
| `admin/users/index.blade.php` | — | 1 | — | — |
| `tailwind.config.ts` | — | — | 1 | 1 |
| `useSignatureCanvas.ts` | — | — | 1 | — |
| `OtpInput.tsx` | — | — | 1 | 1 |
| `(app)/layout.tsx` + loading.tsx | — | — | 2 | — |
| **Totals** | **4** | **11** | **14** | **4** |

**Estimated total effort**: P0 = 11h · P1 = 6h · P2 = 18h · P3 = 4h
**Total before launch**: ~17h for P0+P1 fixes
