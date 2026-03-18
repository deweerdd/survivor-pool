-- Returns member counts for all pools in a season, bypassing RLS.
-- SECURITY DEFINER runs as the function owner (postgres), so RLS is not applied.
create or replace function public.get_pool_member_counts(p_season_id int)
returns table(pool_id int, member_count bigint)
language sql
security definer
set search_path = public
as $$
  select pm.pool_id, count(*) as member_count
  from pool_members pm
  join pools p on p.id = pm.pool_id
  where p.season_id = p_season_id
  group by pm.pool_id;
$$;
