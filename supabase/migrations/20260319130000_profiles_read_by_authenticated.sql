-- Allow any authenticated user to read any profile.
-- Required so leaderboard joins (pool_members → profiles) return display names
-- for all pool members, not just the current user.

CREATE POLICY "profiles_read_by_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
