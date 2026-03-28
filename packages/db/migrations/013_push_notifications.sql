-- Migration 013: Push notifications - WEB platform support + scheduled pushes

-- Add WEB platform support to fcm_tokens
ALTER TABLE ops.fcm_tokens
  DROP CONSTRAINT IF EXISTS fcm_tokens_platform_check;

ALTER TABLE ops.fcm_tokens
  ADD CONSTRAINT fcm_tokens_platform_check
  CHECK (platform IN ('IOS', 'ANDROID', 'WEB'));

-- Scheduled/manual push notifications by admin
CREATE TABLE ops.push_schedules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  body          TEXT        NOT NULL,
  data          JSONB       NOT NULL DEFAULT '{}',
  -- NULL = broadcast; otherwise specific user IDs
  target_user_ids UUID[]    NOT NULL DEFAULT '{}',
  -- NULL = all roles; 'WORKER' or 'MANAGER' to filter by role
  target_role   TEXT        CHECK (target_role IN ('WORKER', 'MANAGER')),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  sent_at       TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  created_by    TEXT        NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_schedules_status_scheduled ON ops.push_schedules (status, scheduled_at);
