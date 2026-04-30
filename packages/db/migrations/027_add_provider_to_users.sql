-- Migration 027: Add provider column to app.users for tracking signup method
-- Supported providers: phone, google, facebook, email

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'phone'
    CHECK (provider IN ('phone', 'google', 'facebook', 'email'));

-- Backfill: users with email and no phone are likely email-registered
UPDATE app.users
  SET provider = 'email'
  WHERE email IS NOT NULL AND phone IS NULL AND provider = 'phone';
