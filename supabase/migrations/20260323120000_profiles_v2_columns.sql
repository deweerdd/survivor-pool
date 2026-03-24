-- Profiles V2: add team_name, full_name, avatar_url, bio, favorite_season,
-- email_notifications, profile_complete columns + update trigger + backfill.

-- 1. Add new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS favorite_season text,
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_complete boolean NOT NULL DEFAULT false;

-- 2. Update handle_new_user() to capture full_name and set profile_complete = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name, profile_complete)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'full_name',
    false
  );
  RETURN new;
END;
$$;

-- 3. Backfill existing users: mark complete, copy display_name → full_name
UPDATE public.profiles
SET profile_complete = true,
    full_name = COALESCE(full_name, display_name)
WHERE profile_complete = false;
