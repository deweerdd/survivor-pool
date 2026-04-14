-- Atomic replace of a user's allocations for a given (pool, episode).
-- Runs inside a single transaction, so a failed insert will not leave the
-- user with their previous allocations deleted. RLS policies on
-- public.allocations still apply (security invoker).

create or replace function public.replace_allocations(
  p_pool_id int,
  p_episode_id int,
  p_contestant_ids int[],
  p_points int[]
) returns void
language plpgsql
security invoker
as $$
declare
  v_user uuid := auth.uid();
  v_total int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(array_length(p_contestant_ids, 1), 0)
     <> coalesce(array_length(p_points, 1), 0) then
    raise exception 'contestant_ids and points must be the same length';
  end if;

  v_total := coalesce((select sum(x) from unnest(p_points) as x), 0);
  if v_total <> 20 then
    raise exception 'total points must equal 20';
  end if;

  delete from public.allocations
  where pool_id = p_pool_id
    and episode_id = p_episode_id
    and user_id = v_user;

  if array_length(p_contestant_ids, 1) is not null then
    insert into public.allocations (pool_id, episode_id, user_id, contestant_id, points)
    select p_pool_id, p_episode_id, v_user, c, p
    from unnest(p_contestant_ids, p_points) as t(c, p);
  end if;
end;
$$;

grant execute on function public.replace_allocations(int, int, int[], int[]) to authenticated;
