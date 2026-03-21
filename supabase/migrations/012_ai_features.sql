-- Add AI rate limiting columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_calls_today INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_calls_month INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_last_reset DATE;
