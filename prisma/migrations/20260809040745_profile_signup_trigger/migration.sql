-- Creates a Profile row whenever a new Supabase auth user signs up.
-- Runs as a DB trigger (not application code) so it can't be skipped by any
-- signup path (password auth now, magic link / OAuth later).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public."Profile" (id, "updatedAt")
  VALUES (NEW.id, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
