-- Migration 017: Allow free-text province/district, enable full profile updates
-- Drop the FK constraint on current_province so frontend can store full province names
ALTER TABLE app.worker_profiles
  DROP CONSTRAINT IF EXISTS worker_profiles_current_province_fkey;
