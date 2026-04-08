-- Migration 021: Allow saved locations without coordinates (text-only addresses)

ALTER TABLE app.worker_saved_locations
    ALTER COLUMN lat DROP NOT NULL,
    ALTER COLUMN lng DROP NOT NULL;
