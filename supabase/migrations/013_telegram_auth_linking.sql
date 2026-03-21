-- Telegram auth/linking support.

CREATE TABLE IF NOT EXISTS public.telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  language_code TEXT,
  linked_via TEXT NOT NULL DEFAULT 'miniapp' CHECK (linked_via IN ('miniapp', 'login_widget')),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_accounts_auth_user_id ON public.telegram_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_accounts_telegram_user_id ON public.telegram_accounts(telegram_user_id);

ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own telegram account" ON public.telegram_accounts;
CREATE POLICY "Users read own telegram account"
ON public.telegram_accounts
FOR SELECT
USING (auth.uid() = auth_user_id);
