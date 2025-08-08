-- Add background_url column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS background_url TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN public.user_profiles.background_url IS 'URL to the user''s custom background image';

-- Create a storage bucket for background images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the backgrounds bucket
-- Allow authenticated users to view all background images
CREATE POLICY "Allow public read access to backgrounds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'backgrounds');

-- Allow users to upload their own background images
CREATE POLICY "Allow users to upload their own backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backgrounds' AND
  (storage.foldername(name))[1] = 'user-backgrounds' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update/delete their own background images
CREATE POLICY "Allow users to manage their own backgrounds"
ON storage.objects FOR ALL
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
