ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS priority_tag TEXT NOT NULL DEFAULT 'normal'
  CHECK (priority_tag IN ('urgent', 'normal', 'someday'));

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS deadline_date DATE;

UPDATE public.projects
SET priority_tag = COALESCE(NULLIF(priority_tag, ''), 'normal')
WHERE priority_tag IS NULL OR priority_tag = '';

CREATE INDEX IF NOT EXISTS idx_projects_user_priority ON public.projects(user_id, priority_tag);
CREATE INDEX IF NOT EXISTS idx_projects_user_deadline ON public.projects(user_id, deadline_date);

CREATE TABLE IF NOT EXISTS public.streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  week_start_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_streak_freezes_user_date ON public.streak_freezes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user_week ON public.streak_freezes(user_id, week_start_date);

ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own streak_freezes" ON public.streak_freezes;
CREATE POLICY "Users own streak_freezes" ON public.streak_freezes FOR ALL USING (auth.uid() = user_id);
