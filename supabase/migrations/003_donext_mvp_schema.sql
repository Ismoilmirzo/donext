-- DoNext MVP schema reset (destructive)
-- Run in Supabase SQL Editor for a clean MVP setup.

BEGIN;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_sleep ON public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.seed_default_pillars();
DROP FUNCTION IF EXISTS public.seed_default_sleep();

DROP TABLE IF EXISTS public.weekly_summaries CASCADE;
DROP TABLE IF EXISTS public.daily_reflections CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.weekly_goals CASCADE;
DROP TABLE IF EXISTS public.fixed_blocks CASCADE;
DROP TABLE IF EXISTS public.sleep_schedule CASCADE;
DROP TABLE IF EXISTS public.pillars CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'Asia/Tashkent',
  onboarding_step INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.sleep_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sleep_time TIME DEFAULT '23:00',
  wake_time TIME DEFAULT '07:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sleep_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sleep" ON public.sleep_schedule FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.fixed_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color TEXT DEFAULT '#475569',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fixed_blocks_user ON public.fixed_blocks(user_id);
ALTER TABLE public.fixed_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own blocks" ON public.fixed_blocks FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#6366F1',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pillars_user ON public.pillars(user_id);
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own pillars" ON public.pillars FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.seed_default_pillars()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pillars (user_id, name, icon, color, sort_order) VALUES
    (NEW.id, 'Mind',      '', '#6366F1', 1),
    (NEW.id, 'Career',    '', '#F59E0B', 2),
    (NEW.id, 'Execution', '⚡', '#10B981', 3),
    (NEW.id, 'Body',      '', '#EF4444', 4),
    (NEW.id, 'Heart',     '❤️', '#EC4899', 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_pillars();

CREATE OR REPLACE FUNCTION public.seed_default_sleep()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sleep_schedule (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_sleep
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_sleep();

CREATE TABLE public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pillar_id UUID REFERENCES public.pillars(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  goal_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pillar_id, week_start)
);

CREATE INDEX idx_goals_user_week ON public.weekly_goals(user_id, week_start);
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own goals" ON public.weekly_goals FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pillar_id UUID REFERENCES public.pillars(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  day DATE NOT NULL,
  scheduled_time TIME,
  title TEXT NOT NULL,
  completion_criteria TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  sort_order INT DEFAULT 0,
  energy_level TEXT DEFAULT 'medium' CHECK (energy_level IN ('high', 'medium', 'low')),
  source TEXT DEFAULT 'ai_generated' CHECK (source IN ('ai_generated', 'user_created', 'user_edited')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped_mood', 'skipped_emergency', 'partial')),
  actual_minutes INT,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_user_week ON public.tasks(user_id, week_start);
CREATE INDEX idx_tasks_user_day ON public.tasks(user_id, day);
CREATE INDEX idx_tasks_pillar ON public.tasks(pillar_id);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  mood INT CHECK (mood BETWEEN 1 AND 5),
  note TEXT,
  tasks_completed INT DEFAULT 0,
  tasks_total INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_reflections_user ON public.daily_reflections(user_id, date);
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own reflections" ON public.daily_reflections FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  pillar_scores JSONB DEFAULT '{}',
  total_score FLOAT DEFAULT 0,
  total_tasks INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_summaries_user ON public.weekly_summaries(user_id);
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own summaries" ON public.weekly_summaries FOR ALL USING (auth.uid() = user_id);

COMMIT;
