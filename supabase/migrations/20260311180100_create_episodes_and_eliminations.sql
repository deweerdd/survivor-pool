-- Feature 1.3: episodes and eliminations tables

CREATE TABLE public.episodes (
  id             serial PRIMARY KEY,
  season_id      int NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number int NOT NULL,
  title          text,
  air_date       date,
  is_locked      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read episodes"
  ON public.episodes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert episodes"
  ON public.episodes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update episodes"
  ON public.episodes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete episodes"
  ON public.episodes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- --------------------------------------------------------

CREATE TABLE public.eliminations (
  id             serial PRIMARY KEY,
  episode_id     int NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  contestant_id  int NOT NULL REFERENCES public.contestants(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eliminations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read eliminations"
  ON public.eliminations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert eliminations"
  ON public.eliminations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update eliminations"
  ON public.eliminations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete eliminations"
  ON public.eliminations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
