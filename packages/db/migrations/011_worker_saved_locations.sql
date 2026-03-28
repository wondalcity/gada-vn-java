-- Migration 011: Worker saved locations for location-based job discovery

CREATE TABLE IF NOT EXISTS app.worker_saved_locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id   UUID NOT NULL REFERENCES app.worker_profiles(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,        -- e.g. '집', '자주 가는 현장'
    address     TEXT,                 -- reverse-geocoded or user-entered display address
    lat         NUMERIC(10, 7) NOT NULL,
    lng         NUMERIC(10, 7) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id, label)
);

CREATE INDEX IF NOT EXISTS idx_worker_saved_locations_worker ON app.worker_saved_locations(worker_id);

-- Ensure only one default per worker
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_saved_locations_default
  ON app.worker_saved_locations(worker_id)
  WHERE is_default = TRUE;
