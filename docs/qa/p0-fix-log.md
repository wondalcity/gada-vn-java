# GADA VN — P0 Fix Log
**Date**: 2026-03-21
**Engineer**: Implementation Lead
**Source**: `docs/qa/fix-priority-list.md` (P0 items only)

---

## P0-01 — `auth.user_roles` table missing

**Severity**: Critical — every authenticated API request crashes
**Root Cause**: `FirebaseAuthMiddleware` (line ~41) calls `DB::table('auth.user_roles')->insertOrIgnore(...)`. The table was never created in migrations 001–006.

**Fix**:
- **Created**: `packages/db/migrations/007_user_roles_table.sql`
  - Creates `auth.user_roles (id, user_id, role, status, granted_at, granted_by, revoked_at, revoked_by)` with unique constraint `(user_id, role)` and indexes.
  - Backfills all existing `auth.users` rows via `INSERT … SELECT … ON CONFLICT DO NOTHING`.

**Verification**: Run `pnpm db:migrate` and confirm `auth.user_roles` is created and populated.

---

## P0-02 — `auth.users` CHECK constraint rejects `'DELETED'` status

**Severity**: Critical — admin user-delete endpoint crashes with constraint violation
**Root Cause**: `auth.users.status` CHECK constraint only allows `ACTIVE | SUSPENDED | PENDING`. `AdminUserController::destroy()` sets `status = 'DELETED'`.

**Fix**:
- **Created**: `packages/db/migrations/008_users_deleted_status.sql`
  - Drops `users_status_check` and recreates it with `'DELETED'` added:
    `CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'))`.
- No application code change required — `AdminUserController::destroy()` already sets `'DELETED'` correctly once the constraint allows it.

**Verification**: Run migration, then test `DELETE /admin/users/{id}` — should return 200 and set `status = 'DELETED'`.

---

## P0-03 — `gada_session` cookie expires after 1 hour, logging users out

**Severity**: High — authenticated web users are redirected to login every hour
**Root Cause**: `setSessionCookie()` used `max-age=3600`. Firebase refreshes its ID token every ~55 minutes and `useAuth.subscribeToTokenRefresh` does re-set the cookie, but a browser tab left open across the refresh cycle had a race window where the cookie expired before the new token arrived.

**Fix**:
- **Edited**: `apps/web-next/src/lib/auth/session.ts`
  - Changed `max-age=3600` → `max-age=604800` (7 days).
  - Updated the comment to explain that the cookie lifetime intentionally exceeds the 1h Firebase token TTL; `useAuth` keeps the cookie value fresh on every token refresh.

**Verification**: Log in, wait >1h without refreshing the tab. The session cookie should still be present and contain the refreshed token.

---

## P0-04 — Mobile contract signing always fails (wrong field name + SVG format)

**Severity**: Critical — mobile workers cannot sign contracts
**Root Cause**: Two bugs in `apps/mobile/app/(worker)/contracts/[id].tsx`:
1. API call used field `signatureData` but backend validates `signature_data_url`.
2. `handleConfirm()` sent a raw SVG string (`<svg>…</svg>`); backend regex only accepts a base64 data URL (`data:image/...;base64,...`).

**Fixes**:

### Mobile (`apps/mobile/app/(worker)/contracts/[id].tsx`):
- Renamed `handleSign` parameter `signatureData` → `signatureDataUrl` for clarity.
- Changed API call: `{ signatureData }` → `{ signature_data_url: signatureDataUrl }`.
- `handleConfirm()` now base64-encodes the SVG string and sends a proper data URL:
  ```typescript
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgData)}`;
  onConfirm(svgDataUrl);
  ```
  (SVG path data is pure ASCII so `btoa` is safe in Hermes/React Native.)

### Backend (`apps/admin-laravel/app/Services/Contract/ContractService.php`):
- `uploadSignatureFromDataUrl()`: regex updated from `image\/(\w+)` to `image\/[\w+]+` to match `image/svg+xml` in addition to `image/png`. ContentType is now dynamically derived from the detected MIME type instead of hardcoded `image/png`.
- Added `mimeTypeFromDataUrl(string): string` helper — extracts MIME type without decoding the payload.
- Added `signatureExtension(string): string` helper — maps MIME type to file extension (`svg`, `jpg`, `png`).
- `workerSign()` and `managerSign()`: S3 key extension is now computed via `mimeTypeFromDataUrl` + `signatureExtension` before the upload, so the stored key always has the correct extension.

**Verification**: Sign a contract from the mobile app. Confirm the API returns 200 and `status` advances to `PENDING_MANAGER_SIGN`. Confirm signature file is stored in S3 at `contract-signatures/{id}/worker.svg`.

---

## P0-05 — `GenerateContractJob.php` is dead code with broken table references

**Severity**: Medium (dead code, not runtime crash — but confusing and risky)
**Root Cause**: `app/Jobs/GenerateContractJob.php` references `app.hires` (table does not exist) and `app.employment_contracts` (renamed to `app.contracts`). The class is never dispatched — contract creation is synchronous in `ContractService::generate()`.

**Fix**:
- **Deleted**: `apps/admin-laravel/app/Jobs/GenerateContractJob.php`

**Verification**: Confirm no remaining references to `GenerateContractJob` in the codebase:
```bash
grep -r "GenerateContractJob" apps/admin-laravel/
# Expected: no output
```

---

## Summary

| ID    | File(s) Changed                                                                        | Type       | Status  |
|-------|----------------------------------------------------------------------------------------|------------|---------|
| P0-01 | `packages/db/migrations/007_user_roles_table.sql` (new)                               | DB schema  | ✅ Done |
| P0-02 | `packages/db/migrations/008_users_deleted_status.sql` (new)                           | DB schema  | ✅ Done |
| P0-03 | `apps/web-next/src/lib/auth/session.ts`                                               | Frontend   | ✅ Done |
| P0-04 | `apps/mobile/app/(worker)/contracts/[id].tsx`<br>`apps/admin-laravel/app/Services/Contract/ContractService.php` | Mobile + Backend | ✅ Done |
| P0-05 | `apps/admin-laravel/app/Jobs/GenerateContractJob.php` (deleted)                       | Backend    | ✅ Done |

All 5 P0 issues resolved. No unrelated code was modified.
