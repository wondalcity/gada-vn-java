-- Add image support to construction sites
ALTER TABLE app.construction_sites
    ADD COLUMN IF NOT EXISTS image_s3_keys   TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS cover_image_idx INT    NOT NULL DEFAULT 0;

-- Daily shifts per job (one row per work date)
CREATE TABLE IF NOT EXISTS app.job_shifts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES app.jobs(id) ON DELETE CASCADE,
    work_date   DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN', 'CANCELLED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_job_shifts_job_id ON app.job_shifts(job_id);
CREATE INDEX IF NOT EXISTS idx_job_shifts_work_date ON app.job_shifts(work_date);
