-- Enable unaccent extension for diacritics-insensitive name search
-- This allows searching "Nguyen Van An" to match "Nguyễn Văn An" in the DB
CREATE EXTENSION IF NOT EXISTS unaccent;
