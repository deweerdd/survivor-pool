-- Scoring RPC: returns leaderboard rows for a given pool
create or replace function get_pool_scores(p_pool_id int)
returns table(user_id uuid, display_name text, total_points bigint)
language sql stable as $$
  select
    a.user_id,
    pr.display_name,
    sum(a.points) as total_points
  from allocations a
  join eliminations e
    on e.episode_id = a.episode_id
   and e.contestant_id = a.contestant_id
  join profiles pr on pr.id = a.user_id
  where a.pool_id = p_pool_id
  group by a.user_id, pr.display_name
  order by total_points desc;
$$;

-- Grant execute to authenticated users
grant execute on function get_pool_scores(int) to authenticated;
