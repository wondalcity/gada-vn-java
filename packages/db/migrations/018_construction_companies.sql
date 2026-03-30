-- 018_construction_companies.sql
-- Adds construction company (건설사) entity and links sites to it

CREATE TABLE IF NOT EXISTS app.construction_companies (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT         NOT NULL,
  business_reg_no          TEXT,
  business_reg_cert_s3_key TEXT,
  contact_name             TEXT,
  contact_phone            TEXT,
  contact_email            TEXT,
  signature_s3_key         TEXT,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE app.construction_sites
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES app.construction_companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_construction_sites_company ON app.construction_sites(company_id);
