# Customer Support Flow — GADA VN

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Audience**: Support agents (Korean and Vietnamese-speaking)

---

## 1. Support Channels

| Channel | Contact | Hours | Primary language |
|---------|---------|-------|-----------------|
| KakaoTalk Channel | `@gadavn` | Mon–Sat 09:00–18:00 KST | Korean |
| Zalo OA | TBD | Mon–Sat 09:00–18:00 ICT | Vietnamese |
| Email | support@gada.vn | 24h receipt, reply within 1 BD | Korean / Vietnamese |
| Phone (Manager hotline) | TBD | Mon–Fri 09:00–17:00 KST | Korean |
| In-app (tap "문의하기") | Routes to KakaoTalk or Zalo | — | Locale-dependent |

> **MVP note**: Formal help desk software (e.g., Freshdesk, Zendesk) is not yet integrated. All tickets are managed manually via KakaoTalk and Zalo channels with a shared escalation log in Notion/Spreadsheet.

---

## 2. Issue Categories and Routing

### 2.1 Worker Issues

| Category | Example | First response | Escalation |
|----------|---------|---------------|-----------|
| **W-1** Login / OTP not received | "인증번호가 안 왔어요" | Check Firebase Auth for phone; resend OTP if <60s | Engineering if OTP delivery fails |
| **W-2** Account suspended | "로그인이 안 돼요" | Verify suspension reason in admin; if in error, restore | Admin decision |
| **W-3** Application not submitted | Worker says they applied but no record | Check `app.applications` by worker_id; verify job status | Engineering if DB shows no record |
| **W-4** Contract not received | Worker accepted, no contract | Check contract status (`PENDING_WORKER_SIGN`?); resend notification | Engineering if contract generation failed |
| **W-5** Cannot sign contract | Canvas not working, signature blocked | Check browser (desktop) / app version (mobile); check if already signed | Engineering if signature endpoint fails |
| **W-6** Attendance not showing | Worker says they attended but not recorded | Check `app.attendance` by job + date; verify manager marked attendance | Manager to correct if error |
| **W-7** Personal data deletion request | "제 정보를 삭제해주세요" | Verify identity via OTP, document request, follow section 6.3 of ops manual | Engineering for DB purge |
| **W-8** Wage not received | Payment dispute | GADA VN does not process payments (cash/transfer between parties); advise direct contact with manager | Legal escalation if fraud |
| **W-9** Profile / ID document | Can't upload ID, image rejected | Check file format (JPG/PNG) and size (<5MB); re-upload guide | Engineering if S3 upload fails |
| **W-10** Notification not received | Push notification missing | Check FCM token in `ops.fcm_tokens`; verify app permissions | Engineering if FCM error |

### 2.2 Manager Issues

| Category | Example | First response | Escalation |
|----------|---------|---------------|-----------|
| **M-1** Approval pending too long | "승인이 안 됩니다" | Check admin panel; process if legitimate | Admin decision |
| **M-2** Approval rejected — dispute | "왜 거부됐나요" | Share the rejection reason on record; request corrected info | Admin review |
| **M-3** Cannot post job | "공고 등록이 안 돼요" | Verify manager status is APPROVED; check site exists | Engineering if API error |
| **M-4** No applications received | "지원자가 없어요" | Check job is OPEN; check job visibility (province, trade); suggest improving job description | Product feedback |
| **M-5** Cannot generate contract | "계약서 생성이 안 됩니다" | Verify worker is in ACCEPTED status; check application ID | Engineering if contract generation error |
| **M-6** Cannot mark attendance | "출근 체크가 안 됩니다" | Check attendance date range (within job period); verify job status | Engineering if API error |
| **M-7** Wants to close/delete job | "공고를 삭제하고 싶어요" | Manager can close jobs from dashboard; deletion requires no active contracts | Guide to dashboard |
| **M-8** Duplicate account | Manager registered twice | Verify by phone; deactivate duplicate via admin panel | Admin action |
| **M-9** Invoice / tax receipt | "세금계산서 필요합니다" | GADA VN MVP does not issue tax receipts; advise to use bank transfer records | Legal/finance escalation |

---

## 3. Support Flow Diagram

```
User contacts support (KakaoTalk / Zalo / Email)
          |
          v
Support agent collects:
  - Phone number (registered)
  - Issue description
  - Screenshots if available
          |
          v
  +-----------------------+
  | Can resolve via       |
  | admin panel or guide? |----YES---> Resolve and close ticket
  +-----------------------+
          | NO
          v
  +-----------------------+
  | Requires DB lookup or |
  | engineering action?   |----YES---> Escalate to engineering
  +-----------------------+           (see section 4)
          | NO
          v
  +-----------------------+
  | Legal / fraud /       |
  | PDPA concern?         |----YES---> Escalate to legal/management
  +-----------------------+
          | NO
          v
  Log in escalation tracker → assign owner → follow up in 24h
```

---

## 4. Escalation Matrix

| Escalation level | When to use | Contact | SLA |
|-----------------|------------|---------|-----|
| **L1 Support** | Can resolve via admin panel | Support agent on duty | 2h |
| **L2 Ops** | Requires admin action (suspend, approve, restore) | Admin on duty | 4h |
| **L3 Engineering** | DB query, API error, S3 issue, Firebase failure | Engineering Slack channel: `#gada-eng-support` | 4h (business hours), 2h (P0) |
| **L4 Legal** | PII breach, fraud, payment dispute, PDPA | Legal contact | 24h |
| **L5 Management** | Escalation from L4, press inquiries, repeated critical failures | Management | 24h |

### L3 Engineering Escalation Template

When escalating to engineering, include:

```
[SUPPORT ESCALATION]
Ticket ID: SUP-YYYYMMDD-NNN
User type: Worker / Manager
Phone (masked): +849XXXX1234
Issue: <one-line summary>
Reproduction steps:
  1.
  2.
Admin panel observations: <what you see in admin>
Error message (if any): <exact text>
Relevant IDs: user_id=, job_id=, application_id=, contract_id=
Screenshots: [attached]
Priority: P0 / P1 / P2
```

---

## 5. Response Time SLAs

| Priority | Definition | First response | Resolution target |
|----------|-----------|----------------|-------------------|
| **P0** | Service down, mass login failure, data loss | 30 min | 4h |
| **P1** | Individual user blocked from core workflow (sign contract, apply for job) | 2h | 1 BD |
| **P2** | Non-blocking issue, workaround available | 4h | 3 BD |
| **P3** | Question, feedback, feature request | 1 BD | Log and review |

---

## 6. Template Responses

### 6.1 Korean Templates

**OTP 미수신 (W-1)**
```
안녕하세요, GADA VN 고객센터입니다.
인증번호를 받지 못하셨군요. 다음 사항을 확인해 주세요:
1. 등록된 전화번호가 +82 또는 +84로 시작하는지 확인해 주세요.
2. SMS 수신 차단 여부를 확인해 주세요.
3. 1분 후 다시 시도해 주세요.
문제가 지속되면 전화번호를 알려주시면 확인해 드리겠습니다.
감사합니다.
```

**계정 정지 안내 (W-2)**
```
안녕하세요, GADA VN 고객센터입니다.
고객님의 계정이 이용 정책 위반으로 인해 일시 정지되었습니다.
자세한 사유: [사유 입력]
이의가 있으시면 회신해 주시면 검토하겠습니다.
감사합니다.
```

**승인 대기 안내 (M-1)**
```
안녕하세요, GADA VN 고객센터입니다.
현재 회원님의 가입 신청을 검토 중입니다.
영업일 기준 24시간 이내에 결과를 알려드리겠습니다.
추가 서류가 필요한 경우 별도로 연락드리겠습니다.
감사합니다.
```

**승인 거부 안내 (M-2)**
```
안녕하세요, GADA VN 고객센터입니다.
아쉽게도 이번 가입 신청이 다음 사유로 거부되었습니다: [사유]
신청 내용을 수정하신 후 앱 내에서 재신청하시면 재검토해 드리겠습니다.
감사합니다.
```

**개인정보 삭제 요청 접수 (W-7)**
```
안녕하세요, GADA VN 고객센터입니다.
개인정보 삭제 요청을 접수하였습니다.
본인 확인을 위해 등록된 전화번호로 인증을 진행해 드리겠습니다.
처리 기간: 최대 30일 이내
감사합니다.
```

---

### 6.2 Vietnamese Templates

**Không nhận được OTP (W-1)**
```
Xin chào, đây là trung tâm hỗ trợ GADA VN.
Cảm ơn bạn đã liên hệ. Vui lòng kiểm tra những điều sau:
1. Số điện thoại đăng ký có đúng định dạng +84 không?
2. Hộp tin nhắn có bị đầy không?
3. Vui lòng thử lại sau 1 phút.
Nếu vẫn gặp sự cố, hãy cho chúng tôi biết số điện thoại của bạn.
Cảm ơn.
```

**Tài khoản bị tạm khóa (W-2)**
```
Xin chào, đây là trung tâm hỗ trợ GADA VN.
Tài khoản của bạn đã bị tạm khóa do vi phạm điều khoản sử dụng.
Lý do: [điền lý do]
Nếu bạn cho rằng đây là nhầm lẫn, vui lòng phản hồi để chúng tôi xem xét lại.
Cảm ơn.
```

**Đang xem xét hồ sơ (M-1)**
```
Xin chào, đây là trung tâm hỗ trợ GADA VN.
Hồ sơ đăng ký của bạn đang được xem xét.
Chúng tôi sẽ thông báo kết quả trong vòng 24 giờ làm việc.
Cảm ơn.
```

**Yêu cầu xóa dữ liệu cá nhân (W-7)**
```
Xin chào, đây là trung tâm hỗ trợ GADA VN.
Chúng tôi đã nhận được yêu cầu xóa dữ liệu cá nhân của bạn.
Để xác minh danh tính, chúng tôi sẽ gửi mã OTP đến số điện thoại đã đăng ký.
Thời gian xử lý: tối đa 30 ngày.
Cảm ơn.
```

---

## 7. Known Limitations (MVP)

Document these to set correct expectations with users:

| Limitation | Workaround to tell user |
|-----------|------------------------|
| GADA VN does not process payments — wage transfer is between worker and manager directly | Advise bank transfer; keep transfer receipts |
| No in-app messaging between worker and manager | Share manager's phone number from the job posting |
| Contract download is HTML format, not PDF | Open in Chrome → Print → Save as PDF |
| Push notifications may be delayed up to 5 minutes | Check notification inbox inside app |
| Facebook login does not support phone number change | Use phone OTP login as primary; Facebook login is additional |
| Attendance history is view-only for workers | If an error exists, worker must contact manager to correct |
| Manager cannot delete a signed contract | Contracts are legally binding; contact legal if dispute |

---

## 8. Ticket Logging

Until a formal help desk tool is in place, log all support cases in the shared escalation tracker (Notion / Google Sheet) with:

| Field | Notes |
|-------|-------|
| Ticket ID | Format: `SUP-YYYYMMDD-NNN` (e.g., `SUP-20260321-001`) |
| Date received | ISO date |
| Channel | KakaoTalk / Zalo / Email |
| User type | Worker / Manager |
| Phone (last 4 digits only) | For identity, not full number |
| Category | W-1 through W-10 or M-1 through M-9 |
| Priority | P0–P3 |
| Status | Open / In progress / Resolved / Escalated |
| Resolution notes | What was done |
| Escalated to | Name / team if escalated |

Review open tickets daily during morning check.
