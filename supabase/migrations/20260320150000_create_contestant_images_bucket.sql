-- Create a public storage bucket for contestant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('contestant-images', 'contestant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read images (public bucket)
CREATE POLICY "Public read contestant images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contestant-images');

-- Only service-role (admin) can upload — no RLS policy needed for insert
-- since the admin client bypasses RLS.
