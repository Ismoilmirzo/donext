-- ============================================
-- DONEXT MVP - Full Database Schema
--
-- HOW TO RUN:
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this ENTIRE file
-- 5. Click "Run" (or Ctrl+Enter)
-- 6. You should see "Success. No rows returned"
--
-- IMPORTANT: Also disable email confirmation:
-- 1. Go to Authentication > Providers > Email
-- 2. Turn OFF "Confirm email"
-- 3. Click Save
-- ============================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists (safe re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. PILLARS
CREATE TABLE IF NOT EXISTS pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📌',
  color TEXT DEFAULT '#6366F1',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pillars_user ON pillars(user_id);
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users CRUD own pillars" ON pillars;
CREATE POLICY "Users CRUD own pillars" ON pillars FOR ALL USING (auth.uid() = user_id);

-- Seed 5 default pillars on profile creation
CREATE OR REPLACE FUNCTION seed_default_pillars()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pillars (user_id, name, icon, color, sort_order) VALUES
    (NEW.id, 'Mind',      '🧠', '#6366F1', 1),
    (NEW.id, 'Career',    '💼', '#F59E0B', 2),
    (NEW.id, 'Execution', '⚡', '#10B981', 3),
    (NEW.id, 'Body',      '💪', '#EF4444', 4),
    (NEW.id, 'Heart',     '❤️', '#EC4899', 5);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail signup if pillar seeding fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION seed_default_pillars();

-- 3. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pillar_id UUID REFERENCES pillars(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  week_start DATE NOT NULL,
  score_type TEXT DEFAULT 'rating' CHECK (score_type IN ('rating', 'boolean', 'numeric')),
  numeric_target FLOAT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_week ON tasks(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_tasks_pillar ON tasks(pillar_id);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users CRUD own tasks" ON tasks;
CREATE POLICY "Users CRUD own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

-- 4. DAILY SCORES
CREATE TABLE IF NOT EXISTS daily_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  value FLOAT NOT NULL CHECK (value >= 0 AND value <= 10),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, date)
);

CREATE INDEX IF NOT EXISTS idx_scores_user_date ON daily_scores(user_id, date);
CREATE INDEX IF NOT EXISTS idx_scores_task ON daily_scores(task_id);
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users CRUD own scores" ON daily_scores;
CREATE POLICY "Users CRUD own scores" ON daily_scores FOR ALL USING (auth.uid() = user_id);

-- 5. WEEKLY SUMMARIES (cached rollups)
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  pillar_scores JSONB DEFAULT '{}',
  total_score FLOAT DEFAULT 0,
  streak_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_summaries_user ON weekly_summaries(user_id);
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users CRUD own summaries" ON weekly_summaries;
CREATE POLICY "Users CRUD own summaries" ON weekly_summaries
  FOR ALL USING (auth.uid() = user_id);
