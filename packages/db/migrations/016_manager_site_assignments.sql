-- Many-to-many: a manager can manage multiple sites,
-- and a site can have multiple managers assigned by admin.

CREATE TABLE IF NOT EXISTS app.manager_site_assignments (
  manager_id  UUID NOT NULL REFERENCES app.manager_profiles(id) ON DELETE CASCADE,
  site_id     UUID NOT NULL REFERENCES app.construction_sites(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT,                          -- admin user email
  PRIMARY KEY (manager_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_manager ON app.manager_site_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_msa_site    ON app.manager_site_assignments(site_id);
