-- Remove custom avatar upload storage — built-in SVG avatars remain, stored as
-- local paths in profiles.avatar_url (e.g. "/avatars/torch.svg").

-- Drop storage policies first
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

-- Delete all objects in the bucket, then the bucket itself
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';
