-- Create trackingmaps bucket in Supabase Storage
-- This needs to be run in the Supabase Dashboard SQL Editor

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trackingmaps', 'trackingmaps', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the trackingmaps bucket
-- Allow authenticated users to upload their own tracking maps
CREATE POLICY "Allow authenticated users to upload tracking maps" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to view tracking maps (since they're public)
CREATE POLICY "Allow public to view tracking maps" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'trackingmaps');

-- Allow users to update their own tracking maps
CREATE POLICY "Allow users to update their own tracking maps" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own tracking maps
CREATE POLICY "Allow users to delete their own tracking maps" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'trackingmaps' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Add map_image_url column to tracking table
ALTER TABLE tracking 
ADD COLUMN IF NOT EXISTS map_image_url TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN tracking.map_image_url IS 'URL of the generated map image showing the tracked session path';

-- 4. Create an index on the new column for faster queries
CREATE INDEX IF NOT EXISTS idx_tracking_map_image_url ON tracking(map_image_url);