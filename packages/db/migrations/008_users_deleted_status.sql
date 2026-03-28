-- Migration 008: add 'DELETED' to auth.users.status CHECK constraint
-- AdminUserController::destroy() sets status='DELETED'.
-- The current constraint only allows ACTIVE | SUSPENDED | PENDING — this
-- causes a runtime constraint violation on every admin user-delete action.

-- PostgreSQL does not support ALTER CONSTRAINT in-place for CHECK constraints.
-- We must drop the old constraint and add a new one.

ALTER TABLE auth.users
    DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE auth.users
    ADD CONSTRAINT users_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'));
