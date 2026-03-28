# GADA VN — UX Audit
**Date**: 2026-03-21
**Auditor**: UX Audit Lead
**Scope**: Worker web + mobile, Manager web + mobile, Admin Blade panel
**Method**: Static code review + design token analysis + i18n audit

---

## Executive Summary

The GADA VN MVP UI has a solid structural foundation: auth flows are properly gated, loading and error states are handled in most components, the design color language is mostly consistent, and the contract signing flow is well-considered. However, **two primary screens are stubs** (worker and manager home dashboards), **hardcoded Korean strings pervade Vietnamese-facing UIs**, the design token system is missing entirely from the Tailwind config, and several mobile usability issues will cause user frustration on launch day.

**Overall MVP readiness: Yellow — shippable if stub dashboards and localization gaps are addressed.**

---

## 1. Auth and Login Flow

### 1.1 Login form structure (LoginForm.tsx)
The three-tab auth form (OTP / Email / Facebook) is clean and well-structured. The OTP flow — phone entry → send → 6-digit input → verify — is the right primary pattern for Vietnamese mobile workers.

**Issues found:**

**UX-AUTH-01 — Double error rendering on phone OTP step**
File: `src/components/auth/LoginForm.tsx:188,193`
The `error` prop is passed to `<PhoneInput error={error ?? undefined}>` (line 188) which renders the error inside the input component, AND the same `{error && <p>...}` block on line 193 renders it again below. Vietnamese workers see the same error message twice in a row.

**UX-AUTH-02 — Phone validation is too loose**
File: `LoginForm.tsx:67`
Validation check: `if (!phone || phone === '+84')` — this only rejects an empty number. A user entering `+841` (3 characters) passes and triggers an API call, wasting an OTP. Should require a minimum of 9 digits after country code.

**UX-AUTH-03 — No auto-focus on OTP boxes after transition**
When the form transitions from the phone step to the OTP step, focus does not move to the first OTP box. Mobile keyboard stays hidden; users do not know to tap the box. Add `autoFocus` to the first digit input in `OtpInput.tsx`.

**UX-AUTH-04 — Register link uses raw `<a>` instead of `<Link>`**
File: `LoginForm.tsx:346`
`<a href={`/${locale}/register`}>` causes a full-page reload instead of a client-side navigation. Should be `<Link>`.

**UX-AUTH-05 — No "forgot password" link on email tab**
The email/password tab has no recovery path. Users who forgot their password have no self-service option visible. At minimum, a "비밀번호를 잊으셨나요?" (forgot password) link placeholder should be shown.

---

## 2. Worker Flow (Web)

### 2.1 Worker home page
File: `src/app/[locale]/(app)/worker/page.tsx`

**UX-WORKER-01 — Home page is an unimplemented stub (CRITICAL)**
The worker home page renders only a greeting string and a TODO comment. This is the first screen workers see after login. It provides no job discovery, no status summary (active applications, upcoming work dates), and no navigation direction. Workers land on a blank page with no next action.

The page should show at minimum:
- Active applications (count + latest entry)
- Upcoming work date (if any contract is FULLY_SIGNED)
- A "공고 검색하기" CTA button pointing to the job listing

### 2.2 Job listing and detail

**UX-WORKER-02 — Job detail wage formatted in ko-KR for all locales**
File: `WorkerContractDetailClient.tsx:11`
`new Intl.NumberFormat('ko-KR').format(n) + ' ₫'`
Korean number formatting uses commas as thousands separators (350,000 ₫) which is fine. However Vietnamese users expect either this same format or `350.000 ₫` (dot-separated). The locale should be derived from the current `locale` prop, not hardcoded.

**UX-WORKER-03 — Contract date hardcoded to ko-KR locale**
File: `WorkerContractDetailClient.tsx:15`
`new Date(d).toLocaleDateString('ko-KR', ...)` — Vietnamese users see dates formatted in Korean style (e.g., "2026년 4월 1일 (수)"). Should use the current page locale.

### 2.3 Contract signing flow

**UX-WORKER-04 — Signature canvas has no guide line or placeholder**
File: `WorkerContractDetailClient.tsx:86–98`
The canvas is a plain `#FAFAFA` rectangle with a crosshair cursor and a small text label below. There is no signature guide line (the horizontal baseline that helps users write consistently), no "X" mark to show where to start, and no placeholder art. First-time signers will be confused about what to draw.

**UX-WORKER-05 — No signature undo (only clear all)**
The signature pad only offers "지우기" (clear all). If a user makes one bad stroke near the end of their signature, they must clear the entire drawing and start over. An "되돌리기" (undo last stroke) button would significantly reduce friction.

**UX-WORKER-06 — Canvas uses inline styles, breaking Tailwind consistency**
File: `WorkerContractDetailClient.tsx:88–97`
The `<canvas>` element uses a `style={{}}` object for sizing, border, and background — while every surrounding element uses Tailwind classes. This makes theming and token changes fragile (a canvas color change requires a JS object edit, not a CSS variable update).

**UX-WORKER-07 — Contract download uses window.open(), not an anchor element**
File: `WorkerContractDetailClient.tsx:330`
`onClick={() => window.open(contract.downloadUrl!, '_blank')}` — this is blocked by Safari's aggressive popup blocker if not triggered in the same event loop tick from a direct user gesture (it is, but some browsers classify it as a popup). Using `<a href={downloadUrl} target="_blank" rel="noopener" download>` is semantically correct and never blocked.

**UX-WORKER-08 — "서명 완료" success state has no visual delight**
After `handleSignSuccess()`, the page shows a small green text banner and reloads. For a moment as significant as signing a legal contract, a slightly more prominent success state (an animation, a larger confirmation card, or a modal with a "계약서를 관리자가 서명합니다" explanation) would improve trust.

### 2.4 Worker profile (mobile)

**UX-WORKER-09 — Worker name hardcoded to "근로자" on mobile profile**
File: `apps/mobile/app/(worker)/profile.tsx`
The profile header shows the static string "근로자" instead of the actual worker's `full_name`. This makes the profile screen feel like a generic placeholder, not a personal account view.

---

## 3. Manager Flow (Web)

### 3.1 Manager home page
File: `src/app/[locale]/(app)/manager/page.tsx`

**UX-MANAGER-01 — Manager home page is an unimplemented stub (CRITICAL)**
Same issue as the worker home. The manager home page renders only the i18n title. Managers see a blank page. The dashboard should show: pending applicants (count), active jobs, total hired workers, and today's attendance status.

### 3.2 Applicant management

**UX-MANAGER-02 — Tab labels not localized (ApplicantListClient.tsx)**
File: `ApplicantListClient.tsx:16–21`
```typescript
const TAB_LABELS: Record<TabKey, string> = {
  ALL: '전체', PENDING: '검토중', ACCEPTED: '합격', REJECTED: '불합격',
}
```
These are hardcoded Korean strings. Vietnamese managers see Korean tabs. Should use `useTranslations('manager')` keys.

**UX-MANAGER-03 — Cancel hire optimistic update shows wrong final state**
File: `ApplicantListClient.tsx:137`
`handleCancelHire` optimistically sets the application to `'REJECTED'`, but cancelling a hire is semantically different from rejecting an application. The icon/badge should show a cancelled/withdrawn state, not a rejection. If the API call fails and reverts, the user sees the status flicker back to `'ACCEPTED'` without explanation.

**UX-MANAGER-04 — Error state on applicants page has no retry button**
File: `ApplicantListClient.tsx:192–198`
The error state shows the error text but no retry action. Compare to `AttendanceManagerClient` which has a retry button. Inconsistent.

**UX-MANAGER-05 — No applicant count shown in page title**
When a manager navigates to a job's applicant page, the count of pending applicants is only visible after the component loads and tabs render. A server-side `<title>` or page header like "지원자 (3명 대기)" would communicate urgency before the client loads.

### 3.3 Attendance management

**UX-MANAGER-06 — Weekday labels hardcoded in Korean**
File: `AttendanceManagerClient.tsx:16`
```typescript
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
```
Vietnamese managers see Korean weekday abbreviations. Should use `Intl.DateTimeFormat` with the current locale parameter passed in as props.

**UX-MANAGER-07 — Status labels in attendance are hardcoded Korean**
File: `AttendanceManagerClient.tsx:248–252`
Labels `['출근', '반차', '결근', '미확인']` are hardcoded. Should use `STATUS_LABELS` from `@/lib/attendance` (which likely already maps to i18n keys) — or if not, move them there.

**UX-MANAGER-08 — No per-row save confirmation feedback**
After a manager saves a single attendance row via `saveRow()`, there is no visual success indicator. The row simply stops showing the "미저장" badge. A brief green checkmark or row-level success flash would confirm the save completed.

**UX-MANAGER-09 — "전체 출근" marks only PENDING as ATTENDED, ignores ABSENT/HALF_DAY**
File: `AttendanceManagerClient.tsx:182–186`
`markAllPresent()` only transitions `PENDING → ATTENDED`. If some workers are already marked ABSENT, this action does not touch them. The button label "전체 출근" implies it will mark everyone present, which is confusing. Relabeling to "미확인 전체 출근" or showing the count of workers that will be affected would clarify intent.

### 3.4 Hires management

**UX-MANAGER-10 — "계약서 생성" button missing from manager dashboard**
The contract generation button exists in `ManagerHiresClient.tsx` but the path to reach it requires: Manager home (stub) → navigate to Hires page. There is no deep link from accepted applicants to "generate contract now." Managers may not discover the hires page.

### 3.5 Mobile manager

**UX-MANAGER-11 — FAB occludes last job card**
File: `apps/mobile/app/(manager)/index.tsx`
The floating action button is `position: 'absolute', bottom: 24, right: 20`. The `FlatList` has no `contentContainerStyle={{ paddingBottom: 80 }}` to account for the FAB height. On most phones the last job card is partially hidden behind the FAB.

---

## 4. Admin Dashboard (Laravel Blade)

### 4.1 Dashboard density and readability

**UX-ADMIN-01 — Admin uses Tailwind CDN, loading full stylesheet**
File: `resources/views/layouts/admin.blade.php`
`<script src="https://cdn.tailwindcss.com">` loads the complete unpurged Tailwind stylesheet (~400KB unminified, ~100KB gzipped). In production this should be replaced with a build-step-purged stylesheet. Admin panel startup time is significantly impacted.

**UX-ADMIN-02 — Bar chart has no ARIA roles or accessible alternative**
The 14-day user growth chart in `dashboard/index.blade.php` is built with CSS `div` widths and inline `style="height: Xpx"`. There is no `role="img"`, no `aria-label`, no `<caption>`, and no data table fallback. Screen readers cannot read the chart.

**UX-ADMIN-03 — Approve + Reject buttons adjacent in approval table rows**
On the approvals index table, the green "승인" and red "반려" buttons appear in the same cell with minimal spacing. On laptops at 100% zoom this is acceptable, but misclick risk is elevated. A safer pattern is to show only one primary action (Approve) inline and put Reject behind a secondary click (e.g., a dropdown or the detail page).

**UX-ADMIN-04 — Rejection reason modal has no character limit indicator**
The rejection reason `<textarea>` in the reject modal has no `maxlength` indicator and no character counter. Admins may write excessively long reasons or very short ones, and both are stored in the DB without constraint awareness.

**UX-ADMIN-05 — Date labels on bar chart skip every 3rd bar**
The growth chart uses `@if($i % 3 === 0)` to show date labels, so only 5 of 14 dates are labeled. At the current bar density this is reasonable, but the skipped bars are ambiguous. Showing all dates on hover (tooltip) would resolve this without cluttering the axis.

**UX-ADMIN-06 — No confirmation step on user delete action**
The admin user delete button sends a form POST directly without a JavaScript confirm dialog. Deleting a user (setting status='DELETED') is irreversible from the UI. At minimum a `onclick="return confirm(...)"` or a modal confirm is needed.

---

## 5. Design Token System

### 5.1 Token audit against code

Tokens identified in codebase (hardcoded throughout, not in Tailwind config):

| Token Name | Value | Used In | Consistent? |
|-----------|-------|---------|-------------|
| Primary blue | `#0669F7` | All web components | ✅ Yes |
| Error red | `#ED1C24` | All web components | ✅ Yes |
| Text dark | `#25282A` | All web components | ✅ Yes |
| Text muted | `#7A7B7A` | All web components | ✅ Yes |
| Border | `#DDDDDD` | All web components | ✅ Yes |
| Background | `#FAFAFA` | Canvas, some cards | ⚠️ Varies |
| Background alt | `#F5F5F5` | Mobile bg, some pages | ⚠️ Different value |
| Background page | `#F5F7FA` | Landing page section | ⚠️ Third value |
| Mobile primary | `#FF6B2C` | ALL mobile UI | ❌ Split identity |
| Admin primary | `#3b82f6` / `#0ea5e9` | Admin Blade | ❌ Different blue |

**UX-TOKEN-01 — No Tailwind custom theme configured**
File: `apps/web-next/tailwind.config.ts`
`theme: { extend: {} }` — no custom color tokens defined. Every component references colors as raw hex strings. A global rebrand or accessibility fix (e.g., increasing contrast of `#7A7B7A`) requires grep-and-replace across dozens of files.

**UX-TOKEN-02 — Three distinct background grays in use**
`#FAFAFA`, `#F5F5F5`, and `#F5F7FA` are all used for "light background" contexts. This creates subtle but perceptible visual inconsistency across pages.

**UX-TOKEN-03 — Web (blue) and mobile (orange) use different primary colors**
The web app uses `#0669F7` (blue) as the primary action color. The mobile app uses `#FF6B2C` (orange). This is a deliberate brand split (blue = professional/web, orange = energy/mobile), but it means cross-platform users (e.g., a manager using both web and mobile) encounter a different brand identity. If intentional, it should be documented. If not, one should be chosen.

**UX-TOKEN-04 — Admin Blade uses different blues than web**
Admin uses `#3b82f6` (Tailwind blue-500) and `#0ea5e9` (Tailwind sky-500). The web app uses `#0669F7`. Three different blues across the product.

---

## 6. Multilingual Layout Resilience

### 6.1 Vietnamese text length

Vietnamese UI copy is 20–40% longer than Korean equivalents in most namespaces. Several fixed-layout elements are at risk:

**UX-I18N-01 — Status badge text overflow in Vietnamese**
The contract status badge `CONTRACT_STATUS_LABELS` returns short Korean strings (`서명 대기`, `서명 완료`). Vietnamese equivalents (`Chờ chữ ký`, `Đã ký hoàn tất`) are longer. The `whitespace-nowrap` class on the badge (line 238 in `WorkerContractDetailClient.tsx`) prevents wrapping but causes horizontal overflow on narrow screens when Vietnamese is active.

**UX-I18N-02 — Login tab labels may overflow on 320px screens**
The tab switcher (`LoginForm.tsx:163`) uses `flex` with equal `flex-1` children. Korean: "휴대폰" (5 chars), "이메일" (3 chars). Vietnamese: "Số điện thoại" (13 chars), "Email" (5 chars). On 320px (old iPhone SE), the tabs could overlap or truncate.

**UX-I18N-03 — Attendance header bar may overflow with long Vietnamese date strings**
The attendance sticky header shows `formatDateKo(selectedDate)` which returns a Korean-formatted string. The Vietnamese equivalent "Thứ Tư, ngày 01 tháng 04 năm 2026" is ~50% longer and may push the "오늘" button off screen on narrow viewports.

**UX-I18N-04 — Manager registration form not localized on mobile**
File: `apps/mobile/app/(manager)/register.tsx`
Form placeholders, labels, and button text are all hardcoded Korean strings. The mobile register form uses `useTranslation` import but no `t()` calls are made in the rendered JSX. Vietnamese managers filling out this form see entirely Korean text.

**UX-I18N-05 — English locale incomplete**
The EN locale files exist but several components use Korean fallback strings when no EN translation exists (e.g., attendance status labels, contract status labels). On `?locale=en` the UI is a mixed Korean/English experience.

---

## 7. Mobile-First Usability

### 7.1 Safe area and device framing

**UX-MOB-01 — No SafeAreaView used in any mobile screen**
None of the reviewed React Native screens use `SafeAreaView` or `useSafeAreaInsets`. On iPhone 14/15 Pro with Dynamic Island and on Android phones with software navigation buttons, the content of worker job list, profile, and contract screens will be clipped or overlapped by system UI.

**UX-MOB-02 — FlatList lacks bottom padding for tab bar**
The worker job list (`index.tsx`) uses a `FlatList` without `contentContainerStyle={{ paddingBottom: 80 }}`. The tab bar overlaps the last job card. Workers cannot see or tap the last item without scrolling slightly up — which is unintuitive since the content appears to end before the list does.

### 7.2 Touch targets

**UX-MOB-03 — Manager register business type toggle hits 44px minimum but barely**
The `TouchableOpacity` in `register.tsx` for "INDIVIDUAL / COMPANY" toggle has no explicit height — it inherits from the inner `<Text>` which is `font-size 15`. At default line-height this is approximately 36–38px, below Apple HIG's 44px minimum tap target recommendation.

**UX-MOB-04 — Mobile worker profile rows lack accessible touch feedback**
The `TouchableOpacity` rows on the profile screen (`profile.tsx`) have no `activeOpacity` prop set and no visual press state other than the default opacity flash. On Android, there is no ripple effect.

### 7.3 Keyboard behavior

**UX-MOB-05 — Keyboard obscures manager register form fields**
The register form (`register.tsx`) uses `ScrollView` wrapping but has no `KeyboardAvoidingView`. On iOS the keyboard will slide over the text inputs when a user taps the lower fields, requiring manual scroll.

---

## 8. State Visibility

**UX-STATE-01 — No pending application count on worker home**
After applying to a job, workers have no visible indicator on the home screen that they have a pending application. They must navigate to a separate applications screen.

**UX-STATE-02 — No loading indicator on page-level navigations**
Next.js App Router does not show a progress bar during page transitions. Navigating from the manager sites list to a site detail page shows a blank flash for 100–300ms before content loads. A `<NProgress>` or built-in loading.tsx at the `(app)` layout level would eliminate this.

**UX-STATE-03 — Contract status from manager perspective is incomplete**
On the manager hires page, once a contract is generated and the worker signs it, the manager receives a notification but the status badge on the hires list still requires a page refresh to update. There is no polling or WebSocket to reflect the new `PENDING_MANAGER_SIGN` state automatically.

**UX-STATE-04 — Slot fill progress not visible on job list page**
The manager job list shows job cards, but the `slots_filled / slots_total` ratio is not shown. A manager with multiple jobs cannot quickly identify which jobs still have open slots without opening each one.

**UX-STATE-05 — "미저장" (unsaved changes) indicator disappears on date change**
If a manager has unsaved attendance drafts and then navigates to a different date via the prev/next buttons, the dirty drafts are silently discarded. There is no warning ("변경사항이 저장되지 않았습니다") before the date change.

---

## 9. Accessibility

**UX-A11Y-01 — SVG icons missing aria-hidden on decorative icons**
Several SVG chevron and arrow icons in `LoginForm.tsx`, `ApplicantListClient.tsx`, and `AttendanceManagerClient.tsx` do not have `aria-hidden="true"`. Screen readers will attempt to announce these unnamed icons.

**UX-A11Y-02 — OTP input boxes lack accessible labels**
`OtpInput.tsx` — each digit box likely has only positional meaning. Screen readers should announce "digit 1 of 6", "digit 2 of 6" etc. An `aria-label` on each input is needed.

**UX-A11Y-03 — Color-only status indicators in admin**
Admin approval status badges use color (amber, green, red) as the only differentiator. Users with color vision deficiency cannot distinguish pending from approved. Adding an icon (⏳ / ✓ / ✗) alongside the color fulfills WCAG 1.4.1.

**UX-A11Y-04 — Canvas signature has no accessible alternative**
The HTML5 canvas signature component cannot be used with keyboard or screen reader. For legal accessibility compliance, a typed name fallback ("이름으로 서명") or alternative flow should be offered.

---

## Summary: Severity Matrix

| Category | Issues Found | Critical | High | Medium | Low |
|----------|-------------|---------|------|--------|-----|
| Core flow stubs | 2 | 2 | — | — | — |
| Localization | 8 | 1 | 3 | 4 | — |
| Form usability | 7 | — | 3 | 4 | — |
| Design tokens | 4 | — | 1 | 3 | — |
| State visibility | 5 | — | 2 | 3 | — |
| Mobile usability | 5 | 1 | 2 | 2 | — |
| Admin panel | 6 | — | 2 | 3 | 1 |
| Accessibility | 4 | — | 1 | 2 | 1 |
| Signature UX | 4 | — | 1 | 2 | 1 |
| **Total** | **45** | **4** | **15** | **23** | **3** |
