-- Revert: restore original read-own policy
drop policy if exists "pool_members_read_pool" on public.pool_members;

create policy "pool_members_read_own"
  on public.pool_members for select
  to authenticated
  using (user_id = auth.uid());
