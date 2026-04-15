-- 023_company_created_by.sql
-- Track which user (manager) created each construction company

ALTER TABLE app.construction_companies
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;

COMMENT ON COLUMN app.construction_companies.created_by_user_id
  IS 'Firebase UID of the manager who created this company via the manager API';
