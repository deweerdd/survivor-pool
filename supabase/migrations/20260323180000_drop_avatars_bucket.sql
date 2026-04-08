-- Remove custom avatar upload storage — built-in SVG avatars remain, stored as
-- local paths in profiles.avatar_url (e.g. "/avatars/torch.svg").

-- Drop storage policies first
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

-- Bucket cleanup skipped — Supabase disallows direct deletes from storage
-- tables. Remove the bucket via the Supabase dashboard Storage UI if needed.
