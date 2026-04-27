-- Migration 027: Add provider column to auth.users for tracking signup method
-- Supported providers: phone, google, facebook, email

ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'phone'
    CHECK (provider IN ('phone', 'google', 'facebook', 'email'));

-- Backfill: users with email and no phone are likely email-registered
UPDATE auth.users
  SET provider = 'email'
  WHERE email IS NOT NULL AND phone IS NULL AND provider = 'phone';
