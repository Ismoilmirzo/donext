ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS preferred_time TEXT NOT NULL DEFAULT 'any'
  CHECK (preferred_time IN ('any', 'morning', 'afternoon', 'evening'));

UPDATE public.projects
SET preferred_time = COALESCE(NULLIF(preferred_time, ''), 'any')
WHERE preferred_time IS NULL OR preferred_time = '';

CREATE INDEX IF NOT EXISTS idx_projects_user_preferred_time
ON public.projects(user_id, preferred_time);
