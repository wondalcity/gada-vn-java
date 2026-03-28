-- Add first site info to manager application
ALTER TABLE app.manager_profiles
    ADD COLUMN IF NOT EXISTS first_site_name    TEXT,
    ADD COLUMN IF NOT EXISTS first_site_address TEXT;
