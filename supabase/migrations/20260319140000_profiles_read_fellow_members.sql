-- Replace the broad "any authenticated user" profiles policy with a scoped one:
-- users can only read profiles of people who share a pool with them (plus their own).
--
-- Reuses the existing get_my_pool_ids() SECURITY DEFINER function to avoid
-- infinite recursion when looking up pool membership.

DROP POLICY IF EXISTS "profiles_read_by_authenticated" ON public.profiles;

CREATE POLICY "profiles_read_fellow_members"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM public.pool_members
      WHERE pool_id = ANY(ARRAY(SELECT public.get_my_pool_ids()))
    )
  );
