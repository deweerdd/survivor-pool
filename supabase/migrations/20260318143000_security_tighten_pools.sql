-- 1. Restrict private pools to members only (was authenticated + using(true))
drop policy "pools_auth_read" on public.pools;

create policy "pools_read"
  on public.pools for select
  to authenticated
  using (
    is_public = true
    or exists (
      select 1 from public.pool_members
      where pool_members.pool_id = pools.id
        and pool_members.user_id = auth.uid()
    )
  );

-- 2. Revoke unauthenticated access to the member-count function
revoke execute on function public.get_pool_member_counts(int) from anon;
