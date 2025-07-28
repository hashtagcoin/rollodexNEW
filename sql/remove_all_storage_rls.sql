-- Remove ALL RLS policies for the booking-screenshots bucket
-- This will ensure there are no conflicting policies

-- First, get all policies for the storage.objects table that relate to booking-screenshots
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%booking%' OR policyname LIKE '%screenshot%';

-- Drop all policies that might be affecting the booking-screenshots bucket
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (policyname LIKE '%booking%' OR policyname LIKE '%screenshot%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Ensure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'booking-screenshots';

-- Create a single, simple policy for authenticated users to insert
CREATE POLICY "Allow authenticated uploads to booking-screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-screenshots');

-- Allow public read access (since it's a public bucket)
CREATE POLICY "Allow public downloads from booking-screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-screenshots');