-- Migration 007: auth.user_roles table
-- Required by FirebaseAuthMiddleware, RoleMiddleware, and User::roles() relation.
-- Without this table every authenticated API request crashes.

-- Create the multi-role join table
CREATE TABLE IF NOT EXISTS auth.user_roles (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       VARCHAR(20)  NOT NULL CHECK (role IN ('worker', 'manager', 'admin')),
    status     VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    granted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    granted_by UUID         REFERENCES auth.users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID         REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON auth.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON auth.user_roles (role);

-- Backfill: copy the single `role` column from auth.users into auth.user_roles.
-- This makes existing users immediately visible via the new table.
-- Skip rows where role IS NULL or already seeded (ON CONFLICT DO NOTHING).
INSERT INTO auth.user_roles (user_id, role, granted_at)
SELECT id, LOWER(role), created_at
FROM   auth.users
WHERE  role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
