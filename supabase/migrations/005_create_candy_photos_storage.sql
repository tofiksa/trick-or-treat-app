-- Storage bucket + policies for candy photo uploads
-- Run this in Supabase SQL Editor if photo upload fails with "Bucket not found"

-- 1. Create public bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candy-photos',
  'candy-photos',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage object policies
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Own" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Own" ON storage.objects;

-- Anyone can read photos (public URLs used by timeline)
CREATE POLICY "Public Read Access"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'candy-photos');

-- Logged-in users (including anonymous auth) can upload
CREATE POLICY "Authenticated Upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'candy-photos');

-- Allow upserts / retries for the same path if needed later
CREATE POLICY "Authenticated Update Own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candy-photos')
  WITH CHECK (bucket_id = 'candy-photos');

CREATE POLICY "Authenticated Delete Own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'candy-photos');
