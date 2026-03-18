-- Allow pool members to see all other members in pools they belong to.
--
-- A naive self-referencing policy (pool_id IN (SELECT pool_id FROM pool_members ...))
-- causes infinite recursion in PostgreSQL RLS. The fix is a SECURITY DEFINER helper
-- function that runs as the function owner, bypassing RLS for just that inner lookup.

CREATE OR REPLACE FUNCTION public.get_my_pool_ids()
  RETURNS SETOF int
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT pool_id FROM public.pool_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "pool_members_read_fellow_members"
  ON public.pool_members FOR SELECT
  TO authenticated
  USING (pool_id = ANY(ARRAY(SELECT public.get_my_pool_ids())));
