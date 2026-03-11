-- Feature 1.2: seasons and contestants tables

CREATE TABLE public.seasons (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  wiki_url   text,
  is_active  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read seasons"
  ON public.seasons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert seasons"
  ON public.seasons FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update seasons"
  ON public.seasons FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete seasons"
  ON public.seasons FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- --------------------------------------------------------

CREATE TABLE public.contestants (
  id         serial PRIMARY KEY,
  season_id  int NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name       text NOT NULL,
  tribe      text,
  img_url    text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contestants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contestants"
  ON public.contestants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert contestants"
  ON public.contestants FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update contestants"
  ON public.contestants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete contestants"
  ON public.contestants FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
