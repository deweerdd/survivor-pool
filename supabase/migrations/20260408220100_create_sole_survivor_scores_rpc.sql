-- RPC to compute sole survivor bonus points for a pool.
-- Returns points only when the season's finale episode is locked (season over).
-- Points = 2 * (total_episodes - picked_at_episode + 1) for users who picked the winner.
-- The winner is the contestant who is still active (is_active = true) after the finale.
CREATE FUNCTION get_sole_survivor_scores(p_pool_id int)
RETURNS TABLE(user_id uuid, sole_survivor_points int)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH pool_season AS (
    SELECT season_id FROM pools WHERE id = p_pool_id
  ),
  finale AS (
    SELECT id, episode_number
    FROM episodes
    WHERE season_id = (SELECT season_id FROM pool_season)
      AND is_finale = true
      AND is_locked = true
    LIMIT 1
  ),
  total_eps AS (
    SELECT max(episode_number) AS total
    FROM episodes
    WHERE season_id = (SELECT season_id FROM pool_season)
  ),
  winner AS (
    SELECT id
    FROM contestants
    WHERE season_id = (SELECT season_id FROM pool_season)
      AND is_active = true
    LIMIT 1
  )
  SELECT
    sp.user_id,
    (2 * ((SELECT total FROM total_eps) - sp.picked_at_episode + 1))::int AS sole_survivor_points
  FROM sole_survivor_picks sp
  WHERE sp.pool_id = p_pool_id
    AND EXISTS (SELECT 1 FROM finale)
    AND sp.contestant_id = (SELECT id FROM winner);
$$;

GRANT EXECUTE ON FUNCTION get_sole_survivor_scores(int) TO authenticated;
