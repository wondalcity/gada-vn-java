-- Audit log table (used by AuditLogObserver)
CREATE TABLE IF NOT EXISTS ops.audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,           -- created | updated | deleted
    entity_type TEXT NOT NULL,           -- model class basename
    entity_id   TEXT NOT NULL,           -- PK of the changed record
    old_values  JSONB,
    new_values  JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON ops.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON ops.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON ops.audit_logs(created_at DESC);

-- Attendance-specific audit detail for manager edits
CREATE TABLE IF NOT EXISTS app.attendance_audits (
    id              BIGSERIAL PRIMARY KEY,
    attendance_id   UUID NOT NULL REFERENCES app.attendance_records(id) ON DELETE CASCADE,
    changed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    old_status      TEXT,
    new_status      TEXT,
    old_check_in    TIME,
    new_check_in    TIME,
    old_check_out   TIME,
    new_check_out   TIME,
    old_hours       NUMERIC(4,2),
    new_hours       NUMERIC(4,2),
    old_notes       TEXT,
    new_notes       TEXT,
    reason          TEXT
);
CREATE INDEX IF NOT EXISTS idx_attendance_audits_record ON app.attendance_audits(attendance_id);
