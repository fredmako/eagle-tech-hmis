-- ====================================================
-- CREATE FACILITY MEDIA STORAGE BUCKET & POLICIES
-- ====================================================

-- 1. Insert the bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facility-media', 
  'facility-media', 
  true, 
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Allow public SELECT on facility-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated INSERT on facility-media by tenant" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated UPDATE on facility-media by tenant" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated DELETE on facility-media by tenant" ON storage.objects;

-- 3. Create public read policy
CREATE POLICY "Allow public SELECT on facility-media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'facility-media');

-- 4. Create authenticated insert policy restricted by facility_id folder path
CREATE POLICY "Allow authenticated INSERT on facility-media by tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'facility-media'
  AND (storage.foldername(name))[1] = (
    SELECT facility_id::text FROM public.profiles WHERE id = auth.uid()::text
  )
);

-- 5. Create authenticated update policy restricted by facility_id folder path
CREATE POLICY "Allow authenticated UPDATE on facility-media by tenant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'facility-media'
  AND (storage.foldername(name))[1] = (
    SELECT facility_id::text FROM public.profiles WHERE id = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'facility-media'
  AND (storage.foldername(name))[1] = (
    SELECT facility_id::text FROM public.profiles WHERE id = auth.uid()::text
  )
);

-- 6. Create authenticated delete policy restricted by facility_id folder path
CREATE POLICY "Allow authenticated DELETE on facility-media by tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'facility-media'
  AND (storage.foldername(name))[1] = (
    SELECT facility_id::text FROM public.profiles WHERE id = auth.uid()::text
  )
);
