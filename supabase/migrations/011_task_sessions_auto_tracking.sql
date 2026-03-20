-- Pause/resume auto-tracking with per-session segment timelines.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS sessions_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS total_focus_minutes INT NOT NULL DEFAULT 0;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS total_elapsed_minutes INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.task_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  session_number INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  focus_minutes INT,
  total_minutes INT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_sessions_user ON public.task_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_task ON public.task_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_active ON public.task_sessions(user_id, status) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_sessions_single_active_per_user
ON public.task_sessions(user_id)
WHERE status = 'active';

ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own task_sessions" ON public.task_sessions;
CREATE POLICY "Users own task_sessions" ON public.task_sessions FOR ALL USING (auth.uid() = user_id);

UPDATE public.tasks
SET
  sessions_count = CASE
    WHEN status = 'completed' THEN GREATEST(COALESCE(sessions_count, 0), 1)
    ELSE COALESCE(sessions_count, 0)
  END,
  total_focus_minutes = CASE
    WHEN status = 'completed' AND COALESCE(total_focus_minutes, 0) = 0 THEN COALESCE(time_spent_minutes, 0)
    ELSE COALESCE(total_focus_minutes, 0)
  END,
  total_elapsed_minutes = CASE
    WHEN status = 'completed' AND COALESCE(total_elapsed_minutes, 0) = 0
      THEN COALESCE(total_time_spent_minutes, time_spent_minutes, 0)
    ELSE COALESCE(total_elapsed_minutes, 0)
  END;
