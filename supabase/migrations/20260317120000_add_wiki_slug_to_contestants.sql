-- Feature 3.7: add wiki_slug for idempotent scraper upserts
-- Nullable so existing manually-entered contestants are unaffected.
-- Unique per season so the same castaway can't be imported twice.

ALTER TABLE public.contestants
  ADD COLUMN wiki_slug text;

CREATE UNIQUE INDEX contestants_season_wiki_slug_key
  ON public.contestants (season_id, wiki_slug)
  WHERE wiki_slug IS NOT NULL;
