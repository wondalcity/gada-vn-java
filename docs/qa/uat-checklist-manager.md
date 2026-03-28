# UAT Checklist — Construction Site Manager

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Environment**: Web `https://staging.gada.vn` · Mobile (EAS preview build)
**Tester**: _________________________
**Test date**: _________________________
**Test account**: `manager-approved@staging.gada.vn` (phone: `+84900000020`, OTP: `123456`)

---

## Instructions

- Mark each item: `[x]` PASS · `[!]` FAIL · `[-]` SKIP (with reason)
- For every FAIL: describe expected result, actual result, and attach a screenshot
- Unless noted, perform steps on the **web app** (`https://staging.gada.vn`)
- Mobile-specific steps are marked **[MOBILE]**
- All P0 items must pass before UAT sign-off
- Estimated total time: ~4 hours

---

## 1. Account Registration and Approval

### 1.1 New Manager Registration

Use a fresh phone number not yet in the system for this section.

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.1.1 | P0 | Navigate to `/ko/register`, select "현장 관리자로 등록" (Register as Manager) | Manager registration form appears | | |
| 1.1.2 | P0 | Enter phone number and receive OTP | OTP SMS sent to phone; 6-digit code received | | |
| 1.1.3 | P0 | Enter the OTP within the time limit | OTP verified; proceed to profile form | | |
| 1.1.4 | P0 | Enter OTP after it expires | Error: "인증번호가 만료되었습니다"; option to resend | | |
| 1.1.5 | P0 | Fill in all required fields: company name, representative name, business type, contact phone, first site name, first site address | Form accepts all inputs without error | | |
| 1.1.6 | P0 | Leave a required field empty and submit | Inline validation error on the empty field; form not submitted | | |
| 1.1.7 | P0 | Submit completed registration form | Confirmation screen: "신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다." | | |
| 1.1.8 | P1 | Register with a phone number already in the system as a worker | Error: "이미 가입된 번호입니다" or system routes to existing account flow | | |

### 1.2 Approval-Pending State

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.2.1 | P0 | Log in as the newly registered manager before admin approves | See "승인 대기 중" (Approval Pending) screen; cannot access manager dashboard | | |
| 1.2.2 | P0 | Attempt to create a site or job while pending | Action blocked; shown "승인 후 이용 가능합니다" message | | |
| 1.2.3 | P1 | Admin approves the account; log in again | Manager dashboard now fully accessible; no approval-pending screen | | |
| 1.2.4 | P1 | Check for notification after approval | "승인 완료" notification visible in notification center | | |

### 1.3 Rejected Manager

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.3.1 | P1 | Admin rejects the manager account; log in | "신청이 거부되었습니다" message shown; cannot access manager features | | |
| 1.3.2 | P2 | Rejected manager submits new registration application | System either allows reapplication or shows "재신청하려면 고객센터에 문의하세요" | | |

---

## 2. Manager Profile

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 2.1 | P0 | Navigate to Profile (`/ko/manager/profile`) | Profile page shows company name, representative name, contact phone, business type | | |
| 2.2 | P1 | Edit contact phone number and save | Phone number updated; confirmation shown | | |
| 2.3 | P1 | Edit company address and save | Address updated without error | | |
| 2.4 | P2 | Upload a business registration document | File uploads successfully to S3; confirmation shown | | |
| 2.5 | P2 | Upload a file larger than 10 MB | Error: "파일 크기가 너무 큽니다 (최대 10MB)" | | |

---

## 3. Construction Site Management

### 3.1 Create a New Site

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.1.1 | P0 | Navigate to "현장 관리" → "새 현장 등록" | Site creation form displayed | | |
| 3.1.2 | P0 | Fill in site name, address, province, district, and submit | Site created with status `ACTIVE`; appears in site list | | |
| 3.1.3 | P0 | Leave the address field empty and submit | Validation error: "주소를 입력해 주세요" | | |
| 3.1.4 | P1 | Enter a full street address in the address field | Address accepted; province/district auto-populated (if geocoding is wired) OR manual province/district selection works | | |
| 3.1.5 | P1 | Upload a site cover image (JPG/PNG under 10MB) | Image uploads; thumbnail preview shown on site card | | |
| 3.1.6 | P1 | Upload multiple site images | All images uploaded; carousel or gallery visible on site detail | | |
| 3.1.7 | P2 | Upload a non-image file (e.g. `.pdf`) as a site image | Rejected with "이미지 파일만 업로드 가능합니다" | | |

### 3.2 View and Edit a Site

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.2.1 | P0 | Navigate to "현장 목록" (Site List) | All sites belonging to this manager listed with name and status | | |
| 3.2.2 | P0 | Click on a site to view detail | Site name, address, province, posted jobs, images all visible | | |
| 3.2.3 | P1 | Edit site name and save | Site name updated in the list and detail page | | |
| 3.2.4 | P1 | Change site status to INACTIVE | Site no longer shows active jobs; public listing does not show jobs from this site | | |
| 3.2.5 | P2 | Another manager attempts to access this site via direct URL | 403 error or "접근 권한이 없습니다"; site details not exposed | | |

---

## 4. Job Posting

### 4.1 Create a New Job

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.1.1 | P0 | On the site detail page, click "공고 등록" (Post a Job) | Job creation form displayed | | |
| 4.1.2 | P0 | Fill in: job title, trade (from dropdown), work date, start time, end time, daily wage (VND), total slots, job description | All fields accepted | | |
| 4.1.3 | P0 | Submit the job form | Job created with status `OPEN`; appears in site's job list | | |
| 4.1.4 | P0 | Leave "일당" (daily wage) field empty and submit | Validation error: "일당을 입력해 주세요" | | |
| 4.1.5 | P0 | Enter 0 for total slots and submit | Validation error: "모집 인원은 1명 이상이어야 합니다" | | |
| 4.1.6 | P1 | Enter a work date in the past and submit | Warning or error: "과거 날짜는 선택할 수 없습니다" | | |
| 4.1.7 | P1 | Set start time after end time and submit | Validation error: "종료 시간이 시작 시간보다 빨라야 합니다" | | |
| 4.1.8 | P1 | Verify the new job appears on the public job listing (`/ko/jobs`) | Job visible within ~2 minutes (ISR revalidation) | | |
| 4.1.9 | P1 | Upload a cover image for the job | Image appears on the job card in the public listing | | |

### 4.2 Edit and Manage a Job

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.2.1 | P0 | Navigate to a job and click "수정" (Edit) | Edit form pre-filled with current values | | |
| 4.2.2 | P0 | Change the daily wage and save | Updated wage shown on job detail and public listing | | |
| 4.2.3 | P1 | Change the total slots to a number lower than the current slots_filled | Error: "모집 인원은 이미 합격한 지원자 수보다 적을 수 없습니다" | | |
| 4.2.4 | P1 | Cancel a job (set status to CANCELLED) | Job no longer appears on public listing; existing applicants notified | | |
| 4.2.5 | P1 | Mark a job as COMPLETED after the work date | Job status updates; existing attendance records unaffected | | |
| 4.2.6 | P2 | Try to edit a COMPLETED or CANCELLED job | Form fields disabled or error: "완료/취소된 공고는 수정할 수 없습니다" | | |

---

## 5. Application and Hiring

### 5.1 View Applicants

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.1.1 | P0 | Open a job with at least one applicant; navigate to applicant list | List shows each applicant's name, phone, trade, experience, ID verification status | | |
| 5.1.2 | P0 | Click on an applicant to view worker detail | Worker profile modal/page shows all available info | | |
| 5.1.3 | P1 | Switch to "검토중" (Pending) tab | Only PENDING applicants shown with count | | |
| 5.1.4 | P1 | Switch to "합격" (Accepted) tab | Only ACCEPTED/CONTRACTED applicants shown | | |
| 5.1.5 | P1 | Switch to "불합격" (Rejected) tab | Only REJECTED applicants shown | | |
| 5.1.6 | P2 | View a job with 100+ applicants | List loads in reasonable time (< 3s); no browser freeze | | |

### 5.2 Accept an Applicant

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.2.1 | P0 | Click "합격" (Accept) on a PENDING applicant | Applicant status changes to `ACCEPTED`; slot count increments (e.g. "1/5명") | | |
| 5.2.2 | P0 | Accept applicants until all slots are filled | Job status changes to `FILLED`; "모집 완료" badge shown | | |
| 5.2.3 | P0 | Attempt to accept one more applicant after job is FILLED | Error: "더 이상 선발할 수 없습니다 (정원 초과)" | | |
| 5.2.4 | P1 | Accept an applicant and check worker receives notification | Worker receives "합격 알림" (acceptance notification) | | |

### 5.3 Reject an Applicant

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.3.1 | P0 | Click "불합격" (Reject) on a PENDING applicant | Optional rejection note input; confirm rejection | | |
| 5.3.2 | P0 | Confirm rejection | Applicant status changes to `REJECTED`; slot count does not change | | |
| 5.3.3 | P1 | Reject an ACCEPTED applicant (cancel hire) | Slot count decrements; job status reverts to `OPEN` if it was `FILLED` | | |
| 5.3.4 | P1 | Rejected worker receives notification | "불합격 알림" notification sent to worker | | |

### 5.4 Bulk Accept

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.4.1 | P1 | Select 3 pending applicants using checkboxes and click "일괄 합격" (Bulk Accept) | All 3 accepted simultaneously; slot count increases by 3 | | |
| 5.4.2 | P1 | Attempt bulk-accept more applicants than available slots (e.g. 5 applicants, 2 slots remaining) | Error: "선택한 인원이 잔여 모집 인원을 초과합니다"; no partial accept | | |

---

## 6. Contract Generation and Signing

### 6.1 Contract Generation

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 6.1.1 | P0 | After accepting a worker, navigate to "계약서" (Contracts) section | Contract with status `PENDING_WORKER_SIGN` visible | | |
| 6.1.2 | P0 | View the contract preview | Contract HTML shows: manager company name, worker name, job site, work date, start/end time, daily wage | | |
| 6.1.3 | P1 | Verify the contract is addressed to the correct worker (not another worker's name) | Worker name, phone and DOB in contract match the accepted worker | | |

### 6.2 Manager Signs Contract

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 6.2.1 | P0 | After worker has signed, navigate to the contract (status: `PENDING_MANAGER_SIGN`) | Contract shows worker's signature in the worker signature block | | |
| 6.2.2 | P0 | Open the manager signature pad | Canvas signature area shown; can draw a signature with mouse/touch | | |
| 6.2.3 | P0 | Draw a signature and click "서명 완료" (Sign) | Signature submitted; contract status changes to `FULLY_SIGNED` | | |
| 6.2.4 | P0 | View the finalized contract | Both signature blocks show signature images; "서명 완료" status badge displayed | | |
| 6.2.5 | P1 | Attempt to sign a contract that is still in `PENDING_WORKER_SIGN` state | Error: "근로자 서명 후 서명 가능합니다"; signing blocked | | |
| 6.2.6 | P1 | Download the signed contract | Presigned download URL works; downloaded HTML opens correctly in browser | | |
| 6.2.7 | P2 | Sign the contract on mobile **[MOBILE]** | Signature canvas works on touchscreen; signature submitted successfully | | |

### 6.3 Contract Visibility

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 6.3.1 | P1 | Check that the manager's own signature URL is visible in the contract response | Manager can see both `worker_sig_url` and `manager_sig_url` in the contract detail | | |
| 6.3.2 | P1 | Check that the worker does NOT see the manager's personal signature image URL directly in the API response | Worker-facing contract response omits `manager_sig_url` (see security fix SEC-P0-04) | | |

---

## 7. Attendance Management

### 7.1 Mark Attendance

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 7.1.1 | P0 | Navigate to "출석 관리" (Attendance) for a job on today's work date | List of hired workers shown; default status `PENDING` for all | | |
| 7.1.2 | P0 | Mark a worker as "출석" (ATTENDED) | Status changes to `ATTENDED`; timestamp recorded | | |
| 7.1.3 | P0 | Mark a worker as "결석" (ABSENT) | Status changes to `ABSENT` | | |
| 7.1.4 | P0 | Mark a worker as "반차" (HALF_DAY) | Status changes to `HALF_DAY` | | |
| 7.1.5 | P1 | Enter check-in time and check-out time for a worker | Times saved; hours worked auto-calculated | | |
| 7.1.6 | P1 | Add a note for an attendance record | Note saved and visible in detail view | | |

### 7.2 Edit Attendance

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 7.2.1 | P1 | Change a worker's attendance from ATTENDED to ABSENT | Status updated; audit log entry created | | |
| 7.2.2 | P1 | Edit check-in time after initially saving | Updated time saved; original value visible in audit history | | |
| 7.2.3 | P2 | Attempt to mark attendance for a job that is not today and not the work date | Warning: "해당 날짜의 출석만 기록할 수 있습니다" or appropriate restriction | | |

### 7.3 Attendance Summary

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 7.3.1 | P1 | View attendance summary for a job | Total attended, absent, half-day, pending counts shown | | |
| 7.3.2 | P2 | View multi-day job attendance history | Each work date listed with its attendance summary | | |

---

## 8. Notifications

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 8.1 | P1 | When a worker applies to your job, receive a notification | "새 지원자" notification appears in the notification center | | |
| 8.2 | P1 | **[MOBILE]** When a worker applies, receive a push notification | FCM push notification appears on the manager's device | | |
| 8.3 | P1 | Tap the notification | Navigates to the applicant list for the relevant job | | |
| 8.4 | P1 | Open the notification center; mark all as read | Unread badge count resets to 0 | | |
| 8.5 | P2 | Receive a notification when a worker signs their part of the contract | "계약서 서명 완료 (근로자)" notification appears | | |

---

## 9. Language and Display Settings

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 9.1 | P0 | View all manager pages in Korean (`/ko/manager/...`) | All labels, buttons, validation messages, and status labels are in Korean | | |
| 9.2 | P1 | Switch to Vietnamese (`/vi/manager/...`) | All labels in Vietnamese; layout not broken by longer text | | |
| 9.3 | P1 | Switch to English (`/en/manager/...`) | All labels in English | | |
| 9.4 | P1 | **[MOBILE]** Switch language from Korean to Vietnamese in mobile app settings | All screens update to Vietnamese; job titles and trade names in Vietnamese | | |
| 9.5 | P2 | Vietnamese or English locale: verify VND amounts formatted correctly | Wages displayed as Vietnamese Dong (e.g. "500,000 ₫"), not in Korean won format | | |

---

## 10. Mobile-Specific (Manager) **[MOBILE]**

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 10.1 | P0 | Log in on mobile with manager phone + OTP `123456` | Manager home screen shows; site list accessible | | |
| 10.2 | P1 | View applicant list on mobile | Applicant cards render correctly; no horizontal overflow | | |
| 10.3 | P1 | Accept/reject applicant on mobile | Actions work; status updates reflect immediately | | |
| 10.4 | P1 | Mark attendance on mobile | Attendance marking UI works; checkboxes/buttons tappable with finger | | |
| 10.5 | P1 | Sign a contract on mobile using touchscreen | Signature canvas captures touch input; signature submitted successfully | | |
| 10.6 | P2 | Use the app in offline mode (airplane mode) | Appropriate "오프라인 상태입니다" message; no crash; cached data visible if applicable | | |

---

## 11. Edge Cases and Failure Scenarios

| # | Priority | Scenario | Expected result | Result | Notes |
|---|----------|----------|-----------------|--------|-------|
| 11.1 | P0 | Attempt to access another manager's site via direct URL | 403 "접근 권한이 없습니다"; site data not returned | | |
| 11.2 | P0 | Attempt to access another manager's job applicant list via direct URL | 403; applicant data not returned | | |
| 11.3 | P0 | Try to accept an applicant for a job owned by a different manager | 403 error; acceptance blocked | | |
| 11.4 | P1 | Post a job with a work date far in the future (e.g. 2 years from now) | Job created; warning may appear about the date | | |
| 11.5 | P1 | Worker withdraws their application after being accepted | Slot count decrements; job re-opens slot; manager sees updated status | | |
| 11.6 | P1 | Manager signs the contract; worker then retracts their signature (if supported) | Clear error state; contract voided and re-generation required if applicable | | |
| 11.7 | P1 | Create a job, accept all applicants, then increase total slots | New slots available; additional workers can apply | | |
| 11.8 | P1 | Mark attendance for a job that has been CANCELLED | Warning shown; attendance marking blocked or requires override | | |
| 11.9 | P2 | Create two jobs on the same date at the same site | Both jobs created; workers can apply to both independently | | |
| 11.10 | P2 | Upload a signature image file that is exactly 2MB (the limit) | Accepted; no error | | |
| 11.11 | P2 | Upload a signature image file that is 2.1MB (over the limit) | Rejected with "서명 이미지 크기가 너무 큽니다" | | |
| 11.12 | P2 | Session expires while signing a contract mid-way | Redirected to login; incomplete signature not saved; contract state unchanged | | |

---

## Sign-Off

| Section | Pass | Fail count | Notes |
|---------|------|------------|-------|
| 1. Account Registration & Approval | | | |
| 2. Profile | | | |
| 3. Site Management | | | |
| 4. Job Posting | | | |
| 5. Application & Hiring | | | |
| 6. Contract Signing | | | |
| 7. Attendance Management | | | |
| 8. Notifications | | | |
| 9. Language Settings | | | |
| 10. Mobile | | | |
| 11. Edge Cases | | | |

**P0 items passing**: ___ / ___
**P1 items passing**: ___ / ___
**Total open bugs**: ___

**UAT result**: ⬜ PASS — all P0 items pass, known P1/P2 issues logged
**Signed off by**: _________________________
**Date**: _________________________
