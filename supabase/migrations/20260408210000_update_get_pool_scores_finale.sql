-- Update get_pool_scores to handle finale episodes.
-- Normal episodes: points earned on eliminated contestants (existing logic).
-- Finale episodes: points earned on contestants who were NOT eliminated (the winner).
DROP FUNCTION IF EXISTS get_pool_scores(int);

CREATE FUNCTION get_pool_scores(p_pool_id int)
RETURNS TABLE(user_id uuid, display_name text, team_name text, full_name text, avatar_url text, total_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sub.user_id,
    pr.display_name,
    pr.team_name,
    pr.full_name,
    pr.avatar_url,
    sum(sub.points) AS total_points
  FROM (
    -- Normal episodes: earn points on eliminated contestants
    SELECT a.user_id, a.points
    FROM allocations a
    JOIN episodes ep ON ep.id = a.episode_id
    JOIN eliminations e
      ON e.episode_id = a.episode_id
     AND e.contestant_id = a.contestant_id
    WHERE a.pool_id = p_pool_id
      AND NOT ep.is_finale

    UNION ALL

    -- Finale episodes: earn points on contestants NOT eliminated (the winner)
    SELECT a.user_id, a.points
    FROM allocations a
    JOIN episodes ep ON ep.id = a.episode_id
    WHERE a.pool_id = p_pool_id
      AND ep.is_finale
      AND NOT EXISTS (
        SELECT 1 FROM eliminations e
        WHERE e.episode_id = a.episode_id
          AND e.contestant_id = a.contestant_id
      )
  ) sub
  JOIN profiles pr ON pr.id = sub.user_id
  GROUP BY sub.user_id, pr.display_name, pr.team_name, pr.full_name, pr.avatar_url
  ORDER BY total_points DESC;
$$;

GRANT EXECUTE ON FUNCTION get_pool_scores(int) TO authenticated;
