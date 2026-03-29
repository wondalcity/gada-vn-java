-- Migration 014: Add REVOKED status to manager_profiles approval_status
-- Allows admin to revoke manager privileges without full rejection

ALTER TABLE app.manager_profiles
  DROP CONSTRAINT IF EXISTS manager_profiles_approval_status_check;

ALTER TABLE app.manager_profiles
  ADD CONSTRAINT manager_profiles_approval_status_check
  CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED'));
