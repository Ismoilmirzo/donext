-- DoNext MVP non-destructive upgrade
-- Safe to run on top of older schema versions.

BEGIN;

-- ------------------------------
-- profiles upgrades
-- ------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Tashkent';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_done'
  ) THEN
    UPDATE public.profiles
    SET onboarding_step = 4
    WHERE onboarding_done = true AND COALESCE(onboarding_step, 0) = 0;
  END IF;
END $$;

-- ------------------------------
-- sleep schedule
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.sleep_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sleep_time TIME DEFAULT '23:00',
  wake_time TIME DEFAULT '07:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sleep_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own sleep" ON public.sleep_schedule;
CREATE POLICY "Users own sleep" ON public.sleep_schedule FOR ALL USING (auth.uid() = user_id);

INSERT INTO public.sleep_schedule (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.sleep_schedule s ON s.user_id = p.id
WHERE s.user_id IS NULL;

-- ------------------------------
-- fixed blocks
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_blocks (
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

CREATE INDEX IF NOT EXISTS idx_fixed_blocks_user ON public.fixed_blocks(user_id);
ALTER TABLE public.fixed_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own blocks" ON public.fixed_blocks;
CREATE POLICY "Users own blocks" ON public.fixed_blocks FOR ALL USING (auth.uid() = user_id);

-- ------------------------------
-- weekly goals
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pillar_id UUID REFERENCES public.pillars(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  goal_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pillar_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_goals_user_week ON public.weekly_goals(user_id, week_start);
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own goals" ON public.weekly_goals;
CREATE POLICY "Users own goals" ON public.weekly_goals FOR ALL USING (auth.uid() = user_id);

-- ------------------------------
-- tasks upgrades
-- ------------------------------
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS day DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_criteria TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS energy_level TEXT DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai_generated';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_minutes INT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS skip_reason TEXT;

UPDATE public.tasks
SET day = week_start
WHERE day IS NULL;

ALTER TABLE public.tasks ALTER COLUMN day SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_energy_level_check') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_energy_level_check
      CHECK (energy_level IN ('high', 'medium', 'low'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_source_check') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_source_check
      CHECK (source IN ('ai_generated', 'user_created', 'user_edited'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped_mood', 'skipped_emergency', 'partial'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user_day ON public.tasks(user_id, day);

-- ------------------------------
-- daily reflections
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.daily_reflections (
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

CREATE INDEX IF NOT EXISTS idx_reflections_user ON public.daily_reflections(user_id, date);
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own reflections" ON public.daily_reflections;
CREATE POLICY "Users own reflections" ON public.daily_reflections FOR ALL USING (auth.uid() = user_id);

-- ------------------------------
-- weekly summaries upgrades
-- ------------------------------
ALTER TABLE public.weekly_summaries ADD COLUMN IF NOT EXISTS total_tasks INT DEFAULT 0;
ALTER TABLE public.weekly_summaries ADD COLUMN IF NOT EXISTS completed_tasks INT DEFAULT 0;

COMMIT;

-- Refresh PostgREST schema cache immediately.
NOTIFY pgrst, 'reload schema';
