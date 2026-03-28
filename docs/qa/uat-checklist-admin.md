# UAT Checklist — Platform Admin

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Environment**: `https://admin-staging.gada.vn`
**Tester**: _________________________
**Test date**: _________________________

---

## Instructions

- Mark each item: `[x]` PASS · `[!]` FAIL · `[-]` SKIP (with reason)
- For every FAIL, note: what you expected, what actually happened, screenshot filename
- All P0 items must pass before UAT sign-off
- Estimated total time: ~3 hours

---

## 1. Admin Login and Session

### 1.1 Login

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 1.1.1 | P0 | Navigate to `https://admin-staging.gada.vn` | Admin login page appears with password field | | |
| 1.1.2 | P0 | Enter the correct admin panel password, click Login | Dashboard loads; no error shown | | |
| 1.1.3 | P0 | Enter an incorrect password, click Login | Error message "비밀번호가 올바르지 않습니다" or equivalent; login blocked | | |
| 1.1.4 | P1 | After successful login, close the browser tab and reopen the admin URL | Session is preserved; not redirected to login (within session timeout) | | |
| 1.1.5 | P1 | Log out via the logout button | Redirected to login page; session cookie cleared | | |

---

## 2. Dashboard Overview

### 2.1 Stats Cards

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 2.1.1 | P0 | View the dashboard after login | Stats cards visible: total active users, new users this week, active jobs, filled jobs, completed jobs, pending approvals | | |
| 2.1.2 | P0 | Verify "대기 중 승인" (Pending Approvals) count | Matches the number of manager accounts with status `PENDING` | | |
| 2.1.3 | P1 | View user growth chart (14-day trend) | Bar/line chart renders with data points for the last 14 days | | |
| 2.1.4 | P1 | View today's attendance summary | Attended / Absent / Half-day / Pending counts shown for today | | |
| 2.1.5 | P2 | Refresh the dashboard page | Stats update without page error; no duplicate requests visible in browser network tab | | |

### 2.2 Recent Lists

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 2.2.1 | P1 | View "최근 등록 현장" (Recent Sites) section | Up to 6 most recent construction sites listed with manager name | | |
| 2.2.2 | P1 | View "최근 등록 공고" (Recent Jobs) section | Up to 6 most recent jobs with site name and daily wage | | |
| 2.2.3 | P1 | Click on a site in the Recent Sites list | Navigates to the site detail page (or admin site management) | | |

---

## 3. Manager Approval Flow

### 3.1 View Pending Managers

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.1.1 | P0 | Navigate to the Manager Approvals section | List of pending managers shown; each row shows company name, representative name, contact phone, registration date | | |
| 3.1.2 | P0 | View detail for a pending manager | Full manager profile visible: company name, business type, representative name, phone, first site name/address | | |
| 3.1.3 | P1 | Filter manager list by "대기 중" (Pending) status | Only PENDING managers shown | | |
| 3.1.4 | P1 | Filter manager list by "승인됨" (Approved) status | Only APPROVED managers shown | | |
| 3.1.5 | P1 | Filter manager list by "거부됨" (Rejected) status | Only REJECTED managers shown | | |

### 3.2 Approve a Manager

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.2.1 | P0 | Select a PENDING manager and click "승인" (Approve) | Confirmation dialog appears | | |
| 3.2.2 | P0 | Confirm the approval | Manager status changes to `APPROVED`; removed from pending list; success message shown | | |
| 3.2.3 | P0 | Navigate to the manager's account on the user list | Status shows `APPROVED`; manager can now post jobs | | |
| 3.2.4 | P1 | Attempt to approve an already-approved manager | Button disabled or error message "이미 승인된 계정입니다" | | |

### 3.3 Reject a Manager

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.3.1 | P0 | Select a PENDING manager and click "거부" (Reject) | Rejection reason input or confirmation dialog appears | | |
| 3.3.2 | P0 | Confirm the rejection | Manager status changes to `REJECTED`; removed from pending list | | |
| 3.3.3 | P1 | Rejected manager tries to access the manager dashboard | Manager sees "승인 대기 중" or "신청이 거부되었습니다" message; cannot post jobs | | |

### 3.4 Bulk Approval

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 3.4.1 | P1 | Select 3 pending managers using checkboxes and click "일괄 승인" (Bulk Approve) | All 3 approved simultaneously; pending count decreases by 3 | | |
| 3.4.2 | P2 | Attempt to select more than 100 managers for bulk action | System limits selection to 100 or shows warning | | |

---

## 4. User Management

### 4.1 Search and Browse Users

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.1.1 | P0 | Navigate to User Management; search by phone number | Correct user appears in results | | |
| 4.1.2 | P0 | Search by full name | Matching users returned (partial name match supported) | | |
| 4.1.3 | P1 | Filter users by role: Worker | Only workers shown | | |
| 4.1.4 | P1 | Filter users by role: Manager | Only managers shown | | |
| 4.1.5 | P1 | Filter users by status: SUSPENDED | Only suspended users shown | | |
| 4.1.6 | P2 | Search with special characters (e.g. `'; DROP TABLE`) | No SQL error; empty results or sanitized query response | | |

### 4.2 View User Detail

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.2.1 | P0 | Click on a worker's name in the user list | Worker profile shown: name, phone, registration date, trade, ID verification status | | |
| 4.2.2 | P0 | Click on a manager's name in the user list | Manager profile shown: company name, approval status, sites owned, jobs posted | | |
| 4.2.3 | P1 | View a worker's identity document (ID card) | Document image loads via presigned URL; no 403 or broken image | | |
| 4.2.4 | P2 | View ID document as admin | Audit log entry created (when audit logging is implemented) | | |

### 4.3 Suspend and Delete Users

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.3.1 | P0 | Select an active worker and click "계정 정지" (Suspend) | Status changes to `SUSPENDED`; worker cannot log in or make API calls | | |
| 4.3.2 | P0 | Try logging in as the suspended worker (phone OTP) | Login blocked with "계정이 비활성화 상태입니다" (account not active) error | | |
| 4.3.3 | P0 | Select a suspended user and click "정지 해제" (Unsuspend) | Status returns to `ACTIVE`; user can log in again | | |
| 4.3.4 | P1 | Select an active user and click "계정 삭제" (Delete) | Confirmation dialog appears with warning | | |
| 4.3.5 | P1 | Confirm deletion | User status changes to `DELETED`; user cannot log in | | |
| 4.3.6 | P1 | Attempt to delete your own admin account | Error: "자신의 계정은 삭제할 수 없습니다"; deletion blocked | | |
| 4.3.7 | P0 | Attempt to log in as a DELETED user | Login blocked; "계정이 비활성화 상태입니다" error | | |

### 4.4 Bulk Status Change

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 4.4.1 | P1 | Select 5 workers and bulk-suspend them | All 5 suspended in one operation; all blocked from login | | |
| 4.4.2 | P2 | Attempt bulk action with 0 users selected | Button disabled or "선택된 항목이 없습니다" message | | |

---

## 5. Site and Job Oversight

### 5.1 Construction Site Overview

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.1.1 | P1 | Navigate to Sites management section | List of all construction sites across all managers | | |
| 5.1.2 | P1 | Filter sites by province | Only sites in that province shown | | |
| 5.1.3 | P1 | Click a site to view detail | Site name, address, province, manager name, status, list of posted jobs | | |
| 5.1.4 | P2 | View the site location on a map (if map is integrated) | Map renders with pin at correct coordinates | | |

### 5.2 Job Posting Oversight

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 5.2.1 | P1 | Navigate to Jobs management section | All jobs across all managers shown with status | | |
| 5.2.2 | P1 | Filter jobs by status: OPEN | Only OPEN jobs shown | | |
| 5.2.3 | P1 | Filter jobs by status: COMPLETED | Only COMPLETED jobs shown | | |
| 5.2.4 | P2 | Search jobs by trade (e.g. "콘크리트") | Matching jobs returned | | |

---

## 6. Contract Oversight

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 6.1 | P1 | Navigate to Contracts section | List of contracts with status (PENDING_WORKER_SIGN, PENDING_MANAGER_SIGN, FULLY_SIGNED, VOID) | | |
| 6.2 | P1 | Click a FULLY_SIGNED contract | Contract HTML renders; both signature blocks show signature images | | |
| 6.3 | P2 | Download a signed contract | Presigned download URL works; HTML file opens correctly | | |

---

## 7. Attendance Overview

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 7.1 | P1 | Navigate to Attendance overview for today | All attendance records for today: attended, absent, half-day, pending | | |
| 7.2 | P1 | Filter attendance by job | Only records for that job shown | | |
| 7.3 | P2 | Export attendance data | CSV or printable format available | | |

---

## 8. Notifications (Admin Perspective)

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 8.1 | P2 | After approving a manager, check that manager's notification inbox | Manager received "승인 완료" (approval confirmed) notification | | |
| 8.2 | P2 | After rejecting a manager, check that manager's notification inbox | Manager received "신청 거부" (application rejected) notification | | |

---

## 9. Language and Localisation

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 9.1 | P1 | View the admin panel in Korean (default) | All labels, buttons, and messages are in Korean; no missing translation keys visible | | |
| 9.2 | P2 | If admin panel supports language switching: switch to Vietnamese | All labels render in Vietnamese without layout breaking | | |
| 9.3 | P2 | If admin panel supports language switching: switch to English | All labels render in English | | |

---

## 10. Access Control and Security

| # | Priority | Step | Expected result | Result | Notes |
|---|----------|------|-----------------|--------|-------|
| 10.1 | P0 | Without logging in, navigate directly to `https://admin-staging.gada.vn/dashboard` | Redirected to login page; dashboard not accessible | | |
| 10.2 | P0 | Log in as a regular worker and attempt to access the admin URL | Blocked; worker account has no admin panel access | | |
| 10.3 | P1 | Log out and attempt to navigate back with browser back button | Redirected to login; session not resumed | | |
| 10.4 | P1 | Attempt to approve your own account (if logged in as manager-admin) | Blocked or not applicable | | |

---

## 11. Edge Cases and Failure Scenarios

| # | Priority | Scenario | Expected result | Result | Notes |
|---|----------|----------|-----------------|--------|-------|
| 11.1 | P0 | Approve a manager whose Firebase account was deleted externally | System handles gracefully; no 500 error; manager profile remains in DB | | |
| 11.2 | P1 | Search for a user who does not exist | Empty results with "검색 결과가 없습니다" message; no crash | | |
| 11.3 | P1 | View dashboard when zero jobs and zero users exist (fresh DB) | Dashboard renders with 0 values; no division-by-zero errors | | |
| 11.4 | P1 | Try to access a deleted user's detail page via direct URL | 404 page or "사용자를 찾을 수 없습니다" error; no 500 | | |
| 11.5 | P1 | Two admins approve the same manager simultaneously | Manager approved once; no duplicate approval notification; DB state consistent | | |
| 11.6 | P2 | Admin panel with very slow network (throttle in DevTools to "Slow 3G") | Loading spinners shown; no blank pages; actions remain responsive | | |
| 11.7 | P2 | Session expires while mid-action (approve manager) | Redirected to login after action fails; action not partially applied | | |
| 11.8 | P2 | Attempt to delete a manager who has active OPEN jobs and pending contracts | Warning shown listing dependent records; deletion prevented or user asked to confirm cascade | | |

---

## Sign-Off

| Section | Pass | Fail count | Notes |
|---------|------|------------|-------|
| 1. Login/Session | | | |
| 2. Dashboard | | | |
| 3. Manager Approval | | | |
| 4. User Management | | | |
| 5. Site/Job Oversight | | | |
| 6. Contract Oversight | | | |
| 7. Attendance Overview | | | |
| 8. Notifications | | | |
| 9. Language | | | |
| 10. Access Control | | | |
| 11. Edge Cases | | | |

**P0 items passing**: ___ / ___
**P1 items passing**: ___ / ___
**Total open bugs**: ___

**UAT result**: ⬜ PASS — all P0 items pass, known P1/P2 issues logged
**Signed off by**: _________________________
**Date**: _________________________
