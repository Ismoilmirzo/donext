-- Track user-entered focus time separately from total elapsed time.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS total_time_spent_minutes INT;

ALTER TABLE public.focus_sessions
ADD COLUMN IF NOT EXISTS total_duration_minutes INT;

UPDATE public.tasks
SET total_time_spent_minutes = time_spent_minutes
WHERE total_time_spent_minutes IS NULL
  AND time_spent_minutes IS NOT NULL;

UPDATE public.focus_sessions
SET total_duration_minutes = duration_minutes
WHERE total_duration_minutes IS NULL
  AND duration_minutes IS NOT NULL;
