-- Single RPC for the dashboard's "My Pools" section. Replaces the previous
-- N+1 (two queries per membership) with one round trip per page load.
--
-- Returns, for each pool the user is a member of:
--   pool metadata, total member count, the user's total points, and the
--   user's rank within the pool (ties share a rank via RANK()).
--
-- Scoring mirrors get_pool_scores: regular episodes score points on the
-- eliminated contestant; finale episodes score points on contestants NOT
-- eliminated (the winner). Sole-survivor bonuses are intentionally excluded
-- to match the previous dashboard behavior (buildLeaderboard there passes
-- no soleSurvivorScores).
CREATE FUNCTION get_user_pool_summaries(p_user_id uuid)
RETURNS TABLE(
  pool_id int,
  pool_name text,
  is_public boolean,
  invite_code text,
  member_count bigint,
  user_points bigint,
  user_rank int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH user_pools AS (
    SELECT pm.pool_id, p.name, p.is_public, p.invite_code
    FROM pool_members pm
    JOIN pools p ON p.id = pm.pool_id
    WHERE pm.user_id = p_user_id
  ),
  counts AS (
    SELECT pool_id, count(*)::bigint AS member_count
    FROM pool_members
    WHERE pool_id IN (SELECT pool_id FROM user_pools)
    GROUP BY pool_id
  ),
  episode_points AS (
    SELECT a.pool_id, a.user_id, a.points
    FROM allocations a
    JOIN episodes ep ON ep.id = a.episode_id
    JOIN eliminations e
      ON e.episode_id = a.episode_id
     AND e.contestant_id = a.contestant_id
    WHERE a.pool_id IN (SELECT pool_id FROM user_pools)
      AND NOT ep.is_finale
    UNION ALL
    SELECT a.pool_id, a.user_id, a.points
    FROM allocations a
    JOIN episodes ep ON ep.id = a.episode_id
    WHERE a.pool_id IN (SELECT pool_id FROM user_pools)
      AND ep.is_finale
      AND NOT EXISTS (
        SELECT 1 FROM eliminations e
        WHERE e.episode_id = a.episode_id
          AND e.contestant_id = a.contestant_id
      )
  ),
  totals AS (
    SELECT
      pm.pool_id,
      pm.user_id,
      COALESCE(sum(ep.points), 0)::bigint AS total_points
    FROM pool_members pm
    LEFT JOIN episode_points ep
      ON ep.pool_id = pm.pool_id AND ep.user_id = pm.user_id
    WHERE pm.pool_id IN (SELECT pool_id FROM user_pools)
    GROUP BY pm.pool_id, pm.user_id
  ),
  ranked AS (
    SELECT
      pool_id,
      user_id,
      total_points,
      rank() OVER (PARTITION BY pool_id ORDER BY total_points DESC)::int AS user_rank
    FROM totals
  )
  SELECT
    up.pool_id,
    up.name AS pool_name,
    up.is_public,
    up.invite_code,
    c.member_count,
    r.total_points AS user_points,
    r.user_rank
  FROM user_pools up
  JOIN counts c ON c.pool_id = up.pool_id
  LEFT JOIN ranked r ON r.pool_id = up.pool_id AND r.user_id = p_user_id
  ORDER BY up.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_pool_summaries(uuid) TO authenticated;
