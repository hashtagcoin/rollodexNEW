-- Create the backgrounds bucket for user profile backgrounds
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'backgrounds',
  'backgrounds',
  true,  -- Make it public so background images can be viewed
  false,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
);

-- Create RLS policies for the backgrounds bucket
-- Allow authenticated users to upload their own backgrounds
CREATE POLICY "Users can upload own backgrounds"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backgrounds' AND
  (storage.foldername(name))[1] = 'user-backgrounds' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to update their own backgrounds
CREATE POLICY "Users can update own backgrounds"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'backgrounds' AND
  (storage.foldername(name))[1] = 'user-backgrounds' AND
  (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'backgrounds' AND
  (storage.foldername(name))[1] = 'user-backgrounds' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to delete their own backgrounds
CREATE POLICY "Users can delete own backgrounds"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'backgrounds' AND
  (storage.foldername(name))[1] = 'user-backgrounds' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public read access to all backgrounds
CREATE POLICY "Public can view backgrounds"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'backgrounds');