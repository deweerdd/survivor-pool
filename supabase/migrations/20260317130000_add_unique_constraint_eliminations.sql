-- Deduplicate any accidental existing duplicates (keep earliest row)
DELETE FROM public.eliminations
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.eliminations
  GROUP BY episode_id, contestant_id
);

-- Feature 3.11: unique constraint enables idempotent scraper upserts
ALTER TABLE public.eliminations
  ADD CONSTRAINT eliminations_episode_contestant_key
  UNIQUE (episode_id, contestant_id);
