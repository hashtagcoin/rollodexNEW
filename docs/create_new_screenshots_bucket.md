# Create a New Screenshots Bucket

Since the `booking-screenshots` bucket has permission issues, here's how to create a fresh bucket:

## Steps in Supabase Dashboard:

1. **Delete the problematic bucket** (optional):
   - Go to Storage in Supabase
   - Click on `booking-screenshots`
   - Click Settings (gear icon)
   - Delete the bucket

2. **Create a new bucket**:
   - Click "New bucket"
   - Name: `booking-screenshots` (or use a new name like `video-screenshots`)
   - **IMPORTANT**: Check the "Public bucket" checkbox
   - Click "Create bucket"

3. **No additional RLS policies needed** - A public bucket allows:
   - Authenticated users to upload
   - Anyone to view (which is what we want for proof-of-service)

## Update the code (if using a new bucket name):

If you created a bucket with a different name (e.g., `video-screenshots`), update these lines in VideoScreen.js:

```javascript
// Line 192
.from('video-screenshots')  // Change to your new bucket name

// Line 213
.from('video-screenshots')  // Change to your new bucket name
```

## To revert back from avatars bucket:

In VideoScreen.js, change:

```javascript
// Line 192-193
.from('avatars')
.upload(`booking-screenshots/${filePath}`, {

// Back to:
.from('booking-screenshots')
.upload(filePath, {

// And line 213-214
.from('avatars')
.getPublicUrl(`booking-screenshots/${filePath}`);

// Back to:
.from('booking-screenshots')
.getPublicUrl(filePath);
```

That's it! The new bucket should work without any permission issues.