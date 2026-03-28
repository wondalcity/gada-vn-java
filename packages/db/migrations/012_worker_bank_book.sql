-- Migration 012: Add bank book image and expand worker profile document storage
ALTER TABLE app.worker_profiles
  ADD COLUMN IF NOT EXISTS bank_book_s3_key TEXT;
