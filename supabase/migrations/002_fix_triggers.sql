-- ============================================
-- FIX: Run this if signup gives "Database error saving new user"
-- Paste this in Supabase SQL Editor and click Run
-- ============================================

-- Fix the handle_new_user trigger with proper search_path and error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail signup
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix the seed_default_pillars trigger with error handling
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
  RAISE WARNING 'Failed to seed pillars for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION seed_default_pillars();

-- Clean up any orphaned auth users that don't have profiles
-- This creates profiles for users who signed up but trigger failed
INSERT INTO public.profiles (id, display_name)
SELECT au.id, COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'User')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Seed pillars for any profiles that don't have them
INSERT INTO public.pillars (user_id, name, icon, color, sort_order)
SELECT p.id, v.name, v.icon, v.color, v.sort_order
FROM public.profiles p
CROSS JOIN (VALUES
  ('Mind',      '🧠', '#6366F1', 1),
  ('Career',    '💼', '#F59E0B', 2),
  ('Execution', '⚡', '#10B981', 3),
  ('Body',      '💪', '#EF4444', 4),
  ('Heart',     '❤️', '#EC4899', 5)
) AS v(name, icon, color, sort_order)
LEFT JOIN public.pillars pl ON pl.user_id = p.id AND pl.name = v.name
WHERE pl.id IS NULL;
