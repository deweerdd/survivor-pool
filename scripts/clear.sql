-- ============================================================
-- SURVIVOR POOL: Reset all game data
-- Run in Supabase SQL Editor
-- Does NOT touch auth.users or profiles
-- ============================================================

TRUNCATE TABLE
  allocations,
  eliminations,
  pool_members,
  pools,
  episodes,
  contestants,
  seasons
RESTART IDENTITY CASCADE;

-- ============================================================
-- OPTIONAL: Also clear profiles (you'll need to re-authenticate
-- to recreate them, since handle_new_user only fires on new signups)
-- ============================================================
-- TRUNCATE TABLE profiles RESTART IDENTITY CASCADE;

-- ============================================================
-- VERIFICATION: Run after clearing to confirm all counts are 0
-- ============================================================
-- SELECT 'seasons'      AS tbl, COUNT(*) FROM seasons
-- UNION ALL SELECT 'contestants',  COUNT(*) FROM contestants
-- UNION ALL SELECT 'episodes',     COUNT(*) FROM episodes
-- UNION ALL SELECT 'eliminations', COUNT(*) FROM eliminations
-- UNION ALL SELECT 'pools',        COUNT(*) FROM pools
-- UNION ALL SELECT 'pool_members', COUNT(*) FROM pool_members
-- UNION ALL SELECT 'allocations',  COUNT(*) FROM allocations;
