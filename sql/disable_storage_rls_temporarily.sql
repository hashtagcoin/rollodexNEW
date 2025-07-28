-- TEMPORARY: Disable RLS on storage.objects to test
-- WARNING: This will disable RLS for ALL storage buckets temporarily
-- Only use this for testing, then re-enable RLS

-- Check current RLS status
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- Disable RLS temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- After testing, you should re-enable it with:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;