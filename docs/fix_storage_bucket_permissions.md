# Fix Storage Bucket Permissions for Booking Screenshots

The error "new row violates row-level security policy" indicates that the storage bucket has RLS policies that need to be configured. Here's how to fix it:

## Option 1: Make the Bucket Public (Simplest)

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Click on the `booking-screenshots` bucket
4. Click on "Policies" tab
5. Toggle "Public bucket" to ON

This will allow anyone to read the images (which is usually fine for screenshots), but only authenticated users can upload.

## Option 2: Configure RLS Policies (More Secure)

If you want to keep the bucket private and control access, run these SQL commands:

```sql
-- First, make sure RLS is enabled for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload to their own folders
CREATE POLICY "Users can upload booking screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'booking-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy to allow authenticated users to view booking screenshots
CREATE POLICY "Users can view booking screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'booking-screenshots');

-- Policy to allow authenticated users to update their own screenshots
CREATE POLICY "Users can update booking screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'booking-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy to allow authenticated users to delete their own screenshots
CREATE POLICY "Users can delete booking screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'booking-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[2]
);
```

## Option 3: Simplified RLS for All Authenticated Users

If you want to allow all authenticated users to upload/view screenshots:

```sql
-- Allow all authenticated users to upload
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-screenshots');

-- Allow all authenticated users to view
CREATE POLICY "Authenticated users can view screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'booking-screenshots');

-- Allow all authenticated users to update
CREATE POLICY "Authenticated users can update screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'booking-screenshots');

-- Allow all authenticated users to delete
CREATE POLICY "Authenticated users can delete screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'booking-screenshots');
```

## Recommended Approach

For this use case, I recommend **Option 1** (making the bucket public) because:
- Screenshots are meant to be proof of service and should be viewable
- It's the simplest solution
- It matches how profile avatars are handled in the app

After making the bucket public, authenticated users will be able to upload, and anyone can view the images (which is typically desired for proof-of-service screenshots).