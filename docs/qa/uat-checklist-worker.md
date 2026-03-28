# UAT Checklist — Construction Worker

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Environment**: Web `https://staging.gada.vn` · Mobile (EAS preview build)
**Tester**: _________________________
**Test date**: _________________________
**Test account**: `worker-01` (phone: `+84900000001`, OTP: `123456`)

---

## Instructions

- Mark each item: `[x]` PASS · `[!]` FAIL · `[-]` SKIP (with reason)
- For every FAIL: describe expected result, actual result, and attach a screenshot
- The primary surface for workers is the **mobile app** — steps default to mobile unless marked **[WEB]**
- All P0 items must pass before UAT sign-off
- Estimated total time: ~4 hours

---

## 1. Account Creation and Login

### 1.1 New Worker Registration

Use a fresh phone number not yet registered for this section.

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.1.1 | P0 | Open the app; tap "회원가입" (Register) | Registration screen appears with phone number input | | |
| 1.1.2 | P0 | Enter a valid Vietnamese phone number; tap "인증번호 받기" (Get OTP) | OTP SMS received within 30 seconds | | |
| 1.1.3 | P0 | Enter the 6-digit OTP | OTP verified; proceed to profile setup screen | | |
| 1.1.4 | P0 | Enter OTP incorrectly 3 times | Error message after each incorrect attempt; account not locked prematurely | | |
| 1.1.5 | P0 | Enter OTP after it expires | Error: "인증번호가 만료되었습니다"; resend button active | | |
| 1.1.6 | P0 | Tap "인증번호 다시 받기" (Resend OTP) | New OTP sent; old OTP no longer accepted | | |
| 1.1.7 | P0 | Complete basic profile: name, date of birth, primary trade | Profile saved; navigate to worker home screen | | |
| 1.1.8 | P1 | Register with a phone number already in the system | Error: "이미 가입된 번호입니다"; redirected to login | | |

### 1.2 Login — Returning Worker

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.2.1 | P0 | Open the app; enter registered phone number; tap "인증번호 받기" | OTP SMS received | | |
| 1.2.2 | P0 | Enter correct OTP | Logged in; worker home screen shown | | |
| 1.2.3 | P0 | Enter incorrect OTP | Error: "인증번호가 올바르지 않습니다"; login blocked | | |
| 1.2.4 | P1 | Close the app after login; reopen | Session still active; home screen shown without re-login (within 7 days) | | |
| 1.2.5 | P1 | **[WEB]** Log in on the web at `https://staging.gada.vn/ko/login` | Login succeeds; worker dashboard accessible | | |

### 1.3 Facebook Social Login

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.3.1 | P1 | Tap "Facebook으로 로그인" (Login with Facebook) | Facebook OAuth screen opens | | |
| 1.3.2 | P1 | Authorize the app in Facebook | Returned to GADA VN; logged in as worker | | |
| 1.3.3 | P2 | Cancel the Facebook OAuth screen | Returned to the login screen; no crash or partial login state | | |

### 1.4 Suspended Account

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.4.1 | P0 | (Admin suspends this account externally) Try to log in with the suspended worker's phone | Login blocked: "계정이 비활성화 상태입니다" | | |
| 1.4.2 | P0 | While already logged in, admin suspends the account; try to navigate to a protected screen | Subsequent API call returns 403; app shows "계정이 비활성화 상태입니다"; redirected to error state | | |

---

## 2. Worker Profile

### 2.1 View and Edit Profile

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 2.1.1 | P0 | Navigate to "내 프로필" (My Profile) | Name, phone, date of birth, primary trade, experience level displayed | | |
| 2.1.2 | P1 | Edit full name and save | Name updated; visible on profile and applicant list (manager view) | | |
| 2.1.3 | P1 | Change primary trade from dropdown and save | New trade saved; visible to managers when browsing applicants | | |
| 2.1.4 | P1 | Update work experience (months) and save | Updated value saved; displayed in applicant card | | |
| 2.1.5 | P2 | Enter 0 months of experience and save | Accepted as valid (0 is allowed) | | |
| 2.1.6 | P2 | Enter a negative number for experience | Validation error: "경력은 0개월 이상이어야 합니다" | | |

### 2.2 Identity Document Upload

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 2.2.1 | P0 | Navigate to "신분증 등록" (ID Registration); upload a JPG/PNG of an ID card | Upload succeeds; "신분증 검토 중" (Under review) status shown | | |
| 2.2.2 | P0 | Upload a file over 10MB | Error: "파일 크기가 너무 큽니다 (최대 10MB)" | | |
| 2.2.3 | P1 | Upload a PDF as an ID document | Accepted (PDF is supported) OR error if only images accepted | | |
| 2.2.4 | P1 | Upload a non-document file (e.g. `.exe`) | Error: "지원하지 않는 파일 형식입니다" | | |
| 2.2.5 | P1 | After uploading, admin verifies the ID; check profile | "신분증 인증 완료" (ID Verified) badge appears on profile | | |
| 2.2.6 | P2 | Replace an already-uploaded ID document with a new one | New document replaces old; re-enters "검토 중" state | | |

### 2.3 Signature Registration

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 2.3.1 | P0 | Navigate to "서명 등록" (Signature Registration) | Blank canvas shown with drawing instructions | | |
| 2.3.2 | P0 | Draw a signature on the canvas with finger/stylus | Signature drawn smoothly; line visible in real time | | |
| 2.3.3 | P0 | Tap "저장" (Save) | Signature saved to profile; "서명 등록 완료" shown | | |
| 2.3.4 | P1 | Tap "다시 그리기" (Clear/Redo) | Canvas cleared; can draw new signature | | |
| 2.3.5 | P1 | Attempt to save an empty canvas (no drawing) | Error: "서명을 그려 주세요" | | |
| 2.3.6 | P2 | **[WEB]** Register signature on the web using mouse | Mouse drawing works; signature saved | | |

---

## 3. Browsing Jobs

### 3.1 Public Job Listing **[WEB]**

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.1.1 | P0 | Navigate to `https://staging.gada.vn/ko/jobs` without logging in | Job listing visible to anonymous visitors | | |
| 3.1.2 | P0 | Verify job cards show: job title, trade, province, work date, daily wage, slot progress | All fields present and readable | | |
| 3.1.3 | P1 | Filter by province "Hà Nội" | Only jobs at Hà Nội sites shown | | |
| 3.1.4 | P1 | Filter by trade "콘크리트" (Concrete) | Only concrete trade jobs shown | | |
| 3.1.5 | P1 | Filter by both province and trade together | Results filtered to both criteria | | |
| 3.1.6 | P1 | Navigate to page 2 using pagination | Second page of jobs loads; first-page jobs no longer shown | | |
| 3.1.7 | P1 | Click "공고 마감" (FILLED) job card | Detail page loads; "지원하기" button hidden or disabled | | |

### 3.2 Job Detail **[WEB]**

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.2.1 | P0 | Click on a job card to view detail | Detail page shows: full description, work conditions, site info, wage | | |
| 3.2.2 | P1 | Verify JSON-LD structured data in page source | Page contains `<script type="application/ld+json">` with JobPosting schema | | |
| 3.2.3 | P1 | Verify site card shows site name, address | Site card present with link to site page | | |
| 3.2.4 | P1 | Verify "같은 직종 다른 공고" (Related Jobs) section | Up to 4 related jobs shown at the bottom | | |
| 3.2.5 | P2 | Share the job URL with another browser; open it | Page loads; job detail visible without login | | |

### 3.3 Job Browsing on Mobile

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.3.1 | P0 | Open Jobs tab in mobile app | Job list loads; cards show trade, province, wage, work date | | |
| 3.3.2 | P1 | Scroll down to load more jobs | Pagination or infinite scroll works; more jobs appear | | |
| 3.3.3 | P1 | Tap a job card | Job detail screen opens | | |
| 3.3.4 | P1 | Filter by province on mobile | Province picker works; list refreshes | | |

---

## 4. Applying for a Job

### 4.1 Submit an Application

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.1.1 | P0 | Log in; open an OPEN job; tap/click "지원하기" (Apply) | Application confirmation screen or prompt appears | | |
| 4.1.2 | P0 | Confirm the application | Application submitted; status shows "검토중" (PENDING) | | |
| 4.1.3 | P0 | Apply to the same job again | Error: "이미 지원한 공고입니다" | | |
| 4.1.4 | P0 | Apply to a FILLED job | "지원하기" button absent or disabled; error if attempted via API | | |
| 4.1.5 | P1 | Apply without completing a profile (no name or trade set) | Warning or error prompting profile completion | | |

### 4.2 Withdraw an Application

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.2.1 | P1 | Navigate to "내 지원" (My Applications); find a PENDING application; tap "지원 취소" (Withdraw) | Confirmation dialog appears | | |
| 4.2.2 | P1 | Confirm withdrawal | Application status changes to `WITHDRAWN`; slot freed; job re-shows as available | | |
| 4.2.3 | P1 | Attempt to withdraw an ACCEPTED application | Error: "합격된 지원은 취소할 수 없습니다" or blocked | | |
| 4.2.4 | P2 | After withdrawing, apply to the same job again | Application accepted (not duplicate-blocked, since previous was WITHDRAWN) | | |

### 4.3 Application Status Updates

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.3.1 | P0 | Manager accepts your application; check "내 지원" list | Application status shows "합격" (ACCEPTED) | | |
| 4.3.2 | P1 | Receive notification for acceptance | "합격 알림" push notification and/or in-app notification received | | |
| 4.3.3 | P1 | Manager rejects your application; check "내 지원" list | Application status shows "불합격" (REJECTED) | | |
| 4.3.4 | P1 | Receive notification for rejection | "불합격 알림" notification received | | |
| 4.3.5 | P2 | Apply to 5 jobs in rapid succession | All 5 applications submitted correctly; no race condition duplicates | | |

---

## 5. Contract Signing

### 5.1 View the Contract

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.1.1 | P0 | After acceptance, navigate to "계약서" (Contracts) or find the contract notification | Contract visible with status `PENDING_WORKER_SIGN` | | |
| 5.1.2 | P0 | Open the contract | Contract shows: your name, DOB, manager company, job site, work date, start/end time, daily wage | | |
| 5.1.3 | P1 | Verify all contract details are correct (not another worker's name or job) | All fields match the accepted job's details | | |
| 5.1.4 | P1 | Confirm contract party section shows "갑 (사업주)" and "을 (근로자)" sections | Both sections present with correct information | | |

### 5.2 Sign the Contract

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.2.1 | P0 | Scroll to the worker signature block; tap "서명하기" (Sign) | Signature canvas opens | | |
| 5.2.2 | P0 | Draw signature using finger on mobile | Signature drawn; line smooth and responsive | | |
| 5.2.3 | P0 | Tap "서명 완료" (Complete Signing) | Signature submitted; contract status changes to `PENDING_MANAGER_SIGN` | | |
| 5.2.4 | P0 | View the contract after signing | Worker signature block shows the drawn signature image; manager block shows "서명 대기 중" | | |
| 5.2.5 | P1 | Attempt to sign the contract a second time | Error: "이미 서명한 계약서입니다"; re-signing blocked | | |
| 5.2.6 | P1 | Attempt to submit an empty signature (tap "서명 완료" without drawing) | Error: "서명을 그려 주세요"; submission blocked | | |
| 5.2.7 | P1 | **[WEB]** Sign the contract on the web using mouse drawing | Mouse drawing works; signature submitted | | |

### 5.3 Fully Signed Contract

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.3.1 | P0 | After manager signs: view the contract | Status shows "서명 완료" (FULLY_SIGNED); both signature images visible | | |
| 5.3.2 | P1 | Download the signed contract | Download link works; HTML file opens in browser and is readable | | |
| 5.3.3 | P1 | Receive notification when manager signs | "계약 완료 알림" (contract completion) notification received | | |
| 5.3.4 | P1 | Verify that the contract response does NOT include the manager's direct signature URL | Manager's S3 presigned URL not exposed in the worker-facing API response | | |
| 5.3.5 | P2 | View the same contract on both mobile and web | Content identical on both platforms | | |

---

## 6. Attendance and Work Records

### 6.1 Attendance Status

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 6.1.1 | P0 | On the day of work, check "출퇴근 기록" (Attendance) or equivalent section | Today's job shown; attendance status shows "대기" (PENDING) | | |
| 6.1.2 | P0 | After manager marks you as ATTENDED: check the attendance view | Status shows "출석" (ATTENDED) with any recorded time | | |
| 6.1.3 | P0 | After manager marks you as ABSENT: check the attendance view | Status shows "결석" (ABSENT) | | |
| 6.1.4 | P1 | After manager marks you as HALF_DAY: check the attendance view | Status shows "반차" (HALF_DAY) | | |
| 6.1.5 | P1 | View hours worked when check-in/check-out times are recorded | Hours worked displayed (e.g. "8.0시간") | | |

### 6.2 Work History

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 6.2.1 | P1 | Navigate to "근무 내역" (Work History) | Past jobs listed with work date, site name, daily wage, and attendance status | | |
| 6.2.2 | P1 | Tap a past job entry | Detail shows contract summary and attendance record | | |
| 6.2.3 | P2 | View work history for a job that was CANCELLED after attendance was marked | Cancelled job shown with appropriate label; attendance record preserved | | |

---

## 7. Notifications

### 7.1 Notification Center

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 7.1.1 | P0 | Open the notification center (bell icon) | List of recent notifications shown with read/unread state | | |
| 7.1.2 | P1 | Tap an unread notification | Marked as read; navigates to relevant screen (job, contract, etc.) | | |
| 7.1.3 | P1 | After reading all notifications, check unread badge count | Badge on bell icon shows 0 or disappears | | |
| 7.1.4 | P2 | Scroll down in notifications list | Older notifications load (pagination or infinite scroll) | | |

### 7.2 Push Notifications (Mobile)

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 7.2.1 | P1 | Application accepted → receive push notification | "합격 알림: [Job Title]" notification appears on device lock screen | | |
| 7.2.2 | P1 | Application rejected → receive push notification | "불합격 알림: [Job Title]" notification appears | | |
| 7.2.3 | P1 | Contract ready to sign → receive push notification | "계약서 서명 요청: [Job Title]" notification appears | | |
| 7.2.4 | P1 | Contract fully signed → receive push notification | "계약 완료: [Job Title]" notification appears | | |
| 7.2.5 | P1 | Tap a push notification while app is closed | App opens directly to the relevant screen (not just the home screen) | | |
| 7.2.6 | P2 | Tap a push notification while app is in the background | App foregrounds to the relevant screen | | |
| 7.2.7 | P2 | Revoke notification permission in device settings; trigger a notification event | App does not crash; silent notification or in-app-only notification delivered | | |

---

## 8. Language and Localization

### 8.1 Language Switching

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 8.1.1 | P0 | View the app in Korean (default) | All screens, buttons, labels, and error messages are in Korean | | |
| 8.1.2 | P1 | Change language to Vietnamese in app settings | All screens update to Vietnamese immediately without app restart | | |
| 8.1.3 | P1 | **[WEB]** Navigate to `/vi/jobs` | Job listing in Vietnamese; trade names in Vietnamese (e.g. "Bê tông") | | |
| 8.1.4 | P1 | **[WEB]** Navigate to `/en/jobs` | Job listing in English; province names in English (e.g. "Hanoi") | | |
| 8.1.5 | P1 | Switch language to Vietnamese; verify currency format | Wages shown in Vietnamese format (e.g. "500.000 ₫") | | |
| 8.1.6 | P2 | Switch language mid-session (while browsing jobs) | Currently visible content updates language without full page reload | | |

### 8.2 Localized Content

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 8.2.1 | P1 | View job listing in Vietnamese; check trade names | Trade names shown in Vietnamese ("Bê tông", "Cốt thép", not Korean) | | |
| 8.2.2 | P1 | View job listing in Korean; check trade names | Trade names in Korean ("콘크리트", "철근") | | |
| 8.2.3 | P1 | View a date (work date) in Korean locale | Date format: "2026년 06월 15일 (월)" | | |
| 8.2.4 | P1 | View the same date in Vietnamese locale | Date format: "15/06/2026" or locale-appropriate format | | |
| 8.2.5 | P2 | View status labels in all three languages | PENDING → "검토중" / "Đang xem xét" / "Under Review"; etc. | | |

---

## 9. Settings

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 9.1 | P1 | Navigate to Settings | Language, notification preferences, account info visible | | |
| 9.2 | P1 | Toggle notification preferences (e.g. disable application result notifications) | Preference saved; relevant notifications no longer received | | |
| 9.3 | P1 | Change language preference in Settings | Language updates throughout the app | | |
| 9.4 | P1 | Tap "로그아웃" (Logout) | Logged out; returned to login screen; session cookie cleared | | |
| 9.5 | P1 | Tap "계정 삭제" (Delete Account) | Confirmation dialog with clear warning about data loss | | |
| 9.6 | P1 | Confirm account deletion | Account deleted; logged out; Firebase account disabled; login with this number shows error | | |
| 9.7 | P2 | Cancel account deletion at the confirmation dialog | Account not deleted; returned to Settings | | |

---

## 10. Edge Cases and Failure Scenarios

| # | Priority | Scenario | Expected result | Result | Notes |
|---|----------|----------|-----------------|--------|-------|
| 10.1 | P0 | Attempt to sign a contract that belongs to a different worker | 403 error; contract detail not accessible; signature blocked | | |
| 10.2 | P0 | Submit an extremely large signature data URL (over 2MB) | Error: "서명 이미지가 너무 큽니다"; submission blocked (SEC-P0-03 fix) | | |
| 10.3 | P0 | Apply to a job after it has been cancelled by the manager | "공고가 취소되었습니다" error; application not created | | |
| 10.4 | P1 | Application accepted; then manager cancels the hire (before contract signing) | Application status reverts to REJECTED; notification sent; contract (if created) voided | | |
| 10.5 | P1 | Two workers both apply at the exact same moment for the last available slot | Only one accepted; the other is waitlisted or rejected; no over-booking | | |
| 10.6 | P1 | Worker starts signing a contract; network drops mid-submission | Contract state unchanged (not partially signed); error message shown; can retry | | |
| 10.7 | P1 | Worker uploads ID document; image is corrupt (broken JPEG) | Error: "파일을 업로드할 수 없습니다. 올바른 이미지 파일을 선택해 주세요." | | |
| 10.8 | P1 | Worker's profile has no trade set; manager views applicant list | Worker shows as "직종 미설정" or trade field blank; not a crash | | |
| 10.9 | P1 | Worker applies to 10 different jobs; views "내 지원" list | All 10 applications shown; list scrollable; no truncation | | |
| 10.10 | P1 | Work date passes without attendance being marked; worker checks attendance | Status shows "대기" (PENDING); no auto-marking to absent | | |
| 10.11 | P2 | Worker receives a push notification; taps it; the referenced job has since been deleted | App navigates gracefully (shows "공고를 찾을 수 없습니다"); no crash | | |
| 10.12 | P2 | Worker uses app with system language set to Japanese (not supported) | App defaults to Korean; no missing translation keys visible | | |
| 10.13 | P2 | Worker has a signed contract; job is then marked CANCELLED by admin | Contract remains valid; work history shows "취소된 공고" label; contract viewable | | |
| 10.14 | P2 | Worker deletes their account while a contract is in PENDING_WORKER_SIGN state | Account deleted; contract voided; manager notified | | |
| 10.15 | P2 | Spam-tap "지원하기" (Apply) button 5 times rapidly | Only 1 application created; duplicate prevented; no API error cascade | | |

---

## 11. Accessibility and Usability (Mobile)

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 11.1 | P1 | Navigate entire main flow using only screen touch (no back button) | All flows completable; no dead ends; back navigation available | | |
| 11.2 | P1 | Test on a small screen (5" / 360dp width) | No content cut off; all buttons tappable without zooming | | |
| 11.3 | P2 | Use VoiceOver (iOS) or TalkBack (Android) to navigate | Screen elements have accessible labels; navigation order logical | | |
| 11.4 | P2 | Use the app with text size set to "Large" in device accessibility settings | Text does not overflow buttons or cards; layout still readable | | |

---

## Sign-Off

| Section | Pass | Fail count | Notes |
|---------|------|------------|-------|
| 1. Account Creation & Login | | | |
| 2. Worker Profile | | | |
| 3. Browsing Jobs | | | |
| 4. Applying for a Job | | | |
| 5. Contract Signing | | | |
| 6. Attendance | | | |
| 7. Notifications | | | |
| 8. Language & Localization | | | |
| 9. Settings | | | |
| 10. Edge Cases | | | |
| 11. Accessibility | | | |

**P0 items passing**: ___ / ___
**P1 items passing**: ___ / ___
**Total open bugs**: ___

**UAT result**: ⬜ PASS — all P0 items pass, known P1/P2 issues logged
**Signed off by**: _________________________
**Date**: _________________________
