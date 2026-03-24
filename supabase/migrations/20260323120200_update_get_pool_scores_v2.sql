-- Update get_pool_scores to return team_name, full_name, avatar_url
-- for the new display name format: "TeamName (AB)"
-- Must drop first because return type is changing.
DROP FUNCTION IF EXISTS get_pool_scores(int);

CREATE FUNCTION get_pool_scores(p_pool_id int)
RETURNS TABLE(user_id uuid, display_name text, team_name text, full_name text, avatar_url text, total_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    a.user_id,
    pr.display_name,
    pr.team_name,
    pr.full_name,
    pr.avatar_url,
    sum(a.points) AS total_points
  FROM allocations a
  JOIN eliminations e
    ON e.episode_id = a.episode_id
   AND e.contestant_id = a.contestant_id
  JOIN profiles pr ON pr.id = a.user_id
  WHERE a.pool_id = p_pool_id
  GROUP BY a.user_id, pr.display_name, pr.team_name, pr.full_name, pr.avatar_url
  ORDER BY total_points DESC;
$$;

-- Re-grant execute (recreating function drops old grant)
GRANT EXECUTE ON FUNCTION get_pool_scores(int) TO authenticated;
