-- 020_test_accounts.sql
-- Adds is_test_account flag to app.users for test accounts that bypass Firebase OTP

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_auth_users_test ON app.users(is_test_account) WHERE is_test_account = TRUE;
