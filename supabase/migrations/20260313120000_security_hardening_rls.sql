-- Security hardening: fix C1, H1, M2 from security review

-- C1: Prevent is_admin self-escalation via column-level privilege revoke
-- The authenticated role can no longer write to this column.
-- The service_role client (createAdminClient) is unaffected.
REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated;

-- H1: Require authentication to read pools (was using (true) = fully public)
-- Prevents unauthenticated enumeration of invite_code values on private pools.
DROP POLICY "pools_public_read" ON public.pools;

CREATE POLICY "pools_auth_read"
  ON public.pools FOR SELECT
  TO authenticated
  USING (true);

-- M2: Restrict user pool creation to private pools only
-- Any authenticated user may still create a pool, but is_public must be false.
-- Admins use pools_admin_insert (already in place) for public pool creation.
DROP POLICY "pools_owner_insert" ON public.pools;

CREATE POLICY "pools_owner_insert"
  ON public.pools FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_public = false
  );
