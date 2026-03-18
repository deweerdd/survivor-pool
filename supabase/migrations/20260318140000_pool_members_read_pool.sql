-- Allow members to see all members of pools they belong to
drop policy "pool_members_read_own" on public.pool_members;

create policy "pool_members_read_pool"
  on public.pool_members for select
  to authenticated
  using (
    pool_id in (
      select pool_id from public.pool_members where user_id = auth.uid()
    )
  );
