-- Fix booking-screenshots bucket permissions

-- First, drop any existing policies for the booking-screenshots bucket
DROP POLICY IF EXISTS "Users can upload booking screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view booking screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update booking screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete booking screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete screenshots" ON storage.objects;

-- Create simple policies that allow authenticated users to do everything
-- Policy 1: Allow authenticated users to upload
CREATE POLICY "Anyone can upload booking screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-screenshots');

-- Policy 2: Allow anyone to view (public access for viewing)
CREATE POLICY "Anyone can view booking screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-screenshots');

-- Policy 3: Allow authenticated users to update their files
CREATE POLICY "Auth users can update booking screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'booking-screenshots');

-- Policy 4: Allow authenticated users to delete
CREATE POLICY "Auth users can delete booking screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'booking-screenshots');

-- Make sure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-screenshots', 'booking-screenshots', true, null, null)
ON CONFLICT (id) DO UPDATE
SET public = true;