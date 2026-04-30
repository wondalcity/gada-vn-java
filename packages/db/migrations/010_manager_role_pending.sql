-- Migration 010: Manager role approval workflow
-- Adds 'pending' status to user_roles so manager requests require admin approval
-- Makes manager_profiles fields nullable for minimal initial record creation

-- 1. Add 'pending' status to user_roles
ALTER TABLE app.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_status_check;
ALTER TABLE app.user_roles
  ADD CONSTRAINT user_roles_status_check
  CHECK (status IN ('active', 'pending', 'suspended'));

-- 2. Allow minimal manager_profiles creation without required business fields
ALTER TABLE app.manager_profiles
  ALTER COLUMN business_type SET DEFAULT 'INDIVIDUAL';
ALTER TABLE app.manager_profiles
  ALTER COLUMN representative_name DROP NOT NULL;
