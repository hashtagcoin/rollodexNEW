# Image Picker Implementation: Step-by-Step Guide

This document details the complete implementation for reliable image picking and uploading in React Native with Expo and Supabase storage, based on fixes applied to `EditHousingListingScreen.js` and `EditServiceListingScreen.js`.

## The Problems

### Issue 1: Zero-Byte Image Uploads
The original implementation was resulting in zero-byte image uploads due to several issues:
- Improper handling of image data from the image picker
- Incorrect blob creation from image URIs
- Multiple fallback methods causing confusion and reliability issues

### Issue 2: Storage Bucket Permissions (RLS)
After fixing the zero-byte uploads, we encountered Supabase Row Level Security (RLS) policy errors:
- "Bucket not found" errors when using incorrect bucket names
- "Unauthorized: new row violates row-level security policy" errors when uploading to buckets without proper RLS policies

## Step 1: Required Dependencies

Ensure these packages are installed in your project:

```bash
npx expo install expo-image-picker expo-file-system base64-arraybuffer
```

## Step 2: Import Required Libraries

Add the necessary imports at the top of your file:

```javascript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
```

## Step 3: Implement Image Picker Function

Configure the image picker to request base64 data which is critical for reliable uploads:

```javascript
const pickImage = async () => {
  // No permissions request is necessary for launching the image library
  // The picker will handle permission requests internally
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,           // Slightly reduced quality for better performance
    base64: true,           // Request base64 data for reliable upload
    exif: false             // Skip exif data to reduce payload size
  });

  console.log('Image picker result:', result);
  
  if (!result.canceled && result.assets && result.assets.length > 0) {
    const selectedAsset = result.assets[0];
    console.log('Selected image:', selectedAsset.uri);
    
    // Store both URI and base64 data for reliable upload
    setImages(prevImages => [...prevImages, { 
      uri: selectedAsset.uri,
      base64: selectedAsset.base64,
      width: selectedAsset.width,
      height: selectedAsset.height,
      type: selectedAsset.type || 'image/jpeg'
    }]);
  }
};
```

## Step 4: Create the Upload Function

This is the core function that properly handles conversion and upload of images:

```javascript
const uploadImages = async () => {
  try {
    const uploadedUrls = [];
    // Ensure profile.id is available in this scope
    const profileId = profile?.id; 

    if (!profileId) {
      console.error('User profile ID not found for image upload path.');
      Alert.alert('Error', 'Could not upload images: User session error.');
      return []; 
    }

    for (const imageAsset of images) { 
      console.log('Processing image for upload:', imageAsset.uri);
      
      // Generate a unique filename using user ID for organization
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const extension = imageAsset.uri.split('.').pop().toLowerCase() || 'jpg';
      const fileName = `housing-images/${profileId}/${timestamp}_${randomStr}.${extension}`;
      let base64Data;
      const contentType = 
        extension === 'png' ? 'image/png' : 
        extension === 'gif' ? 'image/gif' : 'image/jpeg';
      
      // Handle image data extraction
      if (imageAsset.base64) {
        // Use the base64 data directly if available
        base64Data = imageAsset.base64;
      } else if (imageAsset.uri) {
        try {
          // Use expo-file-system to read the file as base64
          base64Data = await FileSystem.readAsStringAsync(imageAsset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          console.log('Successfully read file as base64, length:', base64Data.length);
        } catch (error) {
          console.error('Error reading file:', error);
          Alert.alert('Upload Issue', 'Could not read image file. Please try a different image.');
          continue;
        }
      } else {
        console.error('No valid image data found');
        continue;
      }
      
      // Convert base64 to array buffer for upload
      try {
        const arrayBuffer = decode(base64Data);
        console.log('Successfully converted base64 to array buffer');
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('housing')
          .upload(fileName, arrayBuffer, {
            contentType,
            cacheControl: '3600',
            upsert: true
          });
  
        if (error) {
          console.error('Supabase storage upload error:', error);
          throw error;
        }
        
        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from('housing')
          .getPublicUrl(fileName);
          
        if (urlData && urlData.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
          console.log('Successfully uploaded image:', urlData.publicUrl);
        } else {
          throw new Error('Failed to get public URL for uploaded image');
        }
      } catch (error) {
        console.error('Error in upload process:', error);
        Alert.alert(
          'Upload Issue',
          'There was a problem uploading one of your images. Please try a different image.',
          [{ text: 'OK' }]
        );
      }
    }
    return uploadedUrls;
  } catch (error) {
    console.error('Image upload function error:', error);
    Alert.alert('Error', 'There was a problem with the upload process.');
    return [];
  }
};
```

## Step 5: Troubleshooting Supabase Storage Permissions

If you encounter RLS (Row Level Security) policy errors with Supabase storage, follow these steps:

### 5.1: Check the correct bucket name

Verify that you're using the correct bucket name in your Supabase project:

```javascript
// Error example
ERROR Supabase storage upload error: {"error": "Bucket not found", "message": "Bucket not found", "statusCode": "404"}
```

Fix by using the correct bucket name:

```javascript
// Instead of
.from('incorrect-bucket')

// Use the correct bucket name
.from('postsimages') // or your actual bucket name
```

### 5.2: Check RLS policies for the bucket

If you get unauthorized errors even with the correct bucket name:

```javascript
// Error example
ERROR Error in upload process: {"error": "Unauthorized", "message": "new row violates row-level security policy", "statusCode": "403"}
```

You need to:

1. Identify a bucket with proper INSERT permissions for authenticated users
2. Check your Supabase SQL Editor or Dashboard for bucket policies
3. Use a bucket that has RLS policies allowing authenticated users to upload

Example fix:

```javascript
// Change from a bucket without proper permissions
.from('providerimages') // No INSERT permissions

// To a bucket with authenticated upload permissions
.from('postsimages') // Has INSERT permissions for authenticated users
```

### 5.3: Use the correct file path structure

Some buckets have RLS policies that enforce specific path structures:

```javascript
// Bad path structure (if policies require user ID folders)
const fileName = `image_${timestamp}.jpg`;

// Good path structure (for buckets with user-specific RLS)
const fileName = `service-images/${profileId}/${timestamp}_${randomString}.${fileExt}`;
```

### 5.4: Add detailed error logging

Add better logging to help diagnose issues:

```javascript
console.log('Attempting to upload to path:', fileName);

const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(fileName, arrayBuffer, {
    contentType,
    cacheControl: '3600',
    upsert: true // Use true to allow overwriting
  });

if (error) {
  console.error('Supabase storage upload error:', error);
  throw error;
}

console.log('Upload successful, getting public URL');
```

## Step 6: Instagram-Style Image Preview UI

Implement a horizontal scrolling image list with thumbnails and badges:

```javascript
<View style={styles.labelRow}>
  <Text style={styles.label}>Service Images</Text>
  <Text style={styles.imageCount}>{existingImageUrls.length + images.length}/10 images</Text>
</View>

<ScrollView 
  horizontal
  showsHorizontalScrollIndicator={false} 
  style={styles.imagesScrollView}
  contentContainerStyle={styles.imagesScrollContent}
>
  {/* Existing Images */}
  {existingImageUrls.map((url, index) => (
    <View key={`existing-${index}`} style={styles.imageCard}>
      <Image source={{ uri: url }} style={styles.imagePreview} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeExistingImage(index)}
      >
        <Feather name="x-circle" size={22} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  ))}
  
  {/* New Images */}
  {images.map((image, index) => (
    <View key={`new-${index}`} style={styles.imageCard}>
      <Image source={{ uri: image.uri }} style={styles.imagePreview} />
      <View style={styles.newImageBadge}>
        <Text style={styles.newImageText}>New</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(index)}
      >
        <Feather name="x-circle" size={22} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  ))}
  
  {/* Add Image Button */}
  {(existingImageUrls.length + images.length) < 10 && (
    <TouchableOpacity 
      style={styles.addImageCard} 
      onPress={pickImage}
      disabled={uploadingImages}
    >
      {uploadingImages ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <>
          <Feather name="plus" size={32} color={COLORS.primary} />
          <Text style={styles.addImageText}>Add Image</Text>
        </>
      )}
    </TouchableOpacity>
  )}
</ScrollView>
```

And add these styles:

```javascript
labelRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
imageCount: {
  fontSize: 14,
  color: COLORS.gray,
  fontFamily: FONTS.regular,
},
imagesScrollView: {
  marginVertical: 10,
},
imagesScrollContent: {
  paddingRight: 16,
},
imageCard: {
  width: 120,
  height: 120,
  borderRadius: 12,
  marginRight: 12,
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: '#f0f0f0',
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
imagePreview: {
  width: '100%',
  height: '100%',
},
removeButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: 'rgba(255,255,255,0.9)',
  borderRadius: 12,
  width: 24,
  height: 24,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 1,
  elevation: 2,
},
addImageCard: {
  width: 120,
  height: 120,
  borderRadius: 12,
  marginRight: 12,
  borderWidth: 2,
  borderColor: COLORS.primary,
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.03)',
},
newImageBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: COLORS.primary,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 10,
},
newImageText: {
  color: 'white',
  fontSize: 10,
  fontFamily: FONTS.bold,
}
```

## Step 7: Using the Upload Function in Your Form Submit

Integrate the upload function in your form submission logic:

```javascript
const updateHousingListing = async () => {
  try {
    // Form validation
    if (!formData.title) { 
      Alert.alert('Error', 'Please enter a title'); 
      return; 
    }
    // Other validation as needed...
    
    setSaving(true);
    
    // Upload images
    let uploadedUrls = [];
    if (images.length > 0) {
      uploadedUrls = await uploadImages();
    }
    
    // Combine existing and new image URLs
    const remainingImageUrls = existingImageUrls.filter(url => !imagesToDelete.includes(url));
    const finalImageUrls = [...remainingImageUrls, ...uploadedUrls];
    
    // Update the database with image URLs and other data
    const { error } = await supabase
      .from('housing_listings')
      .update({
        // Other form fields...
        media_urls: finalImageUrls,
      })
      .eq('id', housingId);
      
    if (error) { 
      console.error('Database error:', error); 
      throw error; 
    }
    
    Alert.alert('Success', 'Housing listing updated successfully!');
    navigation.goBack();
  } catch (error) {
    console.error('Error updating housing listing:', error);
    Alert.alert('Error', 'Failed to update housing listing.');
  } finally {
    setSaving(false);
  }
};
```

## Step 6: Image Preview UI Component

Implement an image preview component for selected images:

```jsx
{/* Image Thumbnails - Display existing and new images */}
<View style={styles.imagePreviewContainer}>
  {existingImageUrls.map((imageUrl, index) => (
    !imagesToDelete.includes(imageUrl) && (
      <View key={`existing-${index}`} style={styles.imageThumbnailContainer}>
        <Image source={{ uri: imageUrl }} style={styles.imageThumbnail} />
        <TouchableOpacity
          style={styles.deleteImageButton}
          onPress={() => {
            setImagesToDelete(prev => [...prev, imageUrl]);
          }}
        >
          <FontAwesome5 name="times-circle" size={20} color="#E53935" />
        </TouchableOpacity>
      </View>
    )
  ))}
  
  {images.map((image, index) => (
    <View key={`new-${index}`} style={styles.imageThumbnailContainer}>
      <Image source={{ uri: image.uri }} style={styles.imageThumbnail} />
      <TouchableOpacity
        style={styles.deleteImageButton}
        onPress={() => {
          setImages(images.filter((_, i) => i !== index));
        }}
      >
        <FontAwesome5 name="times-circle" size={20} color="#E53935" />
      </TouchableOpacity>
    </View>
  ))}
</View>
```

## Key Improvements Over Previous Implementation

1. **Reliable Image Data Handling**:
   - Always ensuring we have base64 data either directly from the picker or via FileSystem
   - Properly handling content types based on file extension

2. **Simplified Flow**:
   - Single, consistent approach for all image uploads
   - No multiple fallback methods that could create confusion

3. **Proper ArrayBuffer Conversion**:
   - Using the dedicated `decode()` function from `base64-arraybuffer` 
   - This is critical for preventing zero-byte uploads

4. **Better Error Handling**:
   - Detailed error logging
   - User-friendly error messages
   - Per-image error handling to allow other images to upload

5. **Storage Organization**:
   - Structured storage paths using user ID and timestamps
   - Random string to prevent filename collisions
   - Preserved file extensions for proper content type inference

6. **UI Improvements**:
   - Image count display on picker button
   - Preview thumbnails with delete functionality
   - Loading indicators during upload

## Common Issues and Solutions

1. **Zero-byte files**:
   - Ensure base64 data is correctly read and decoded
   - Check for proper ArrayBuffer conversion before upload

2. **Permissions issues**:
   - Let Expo Image Picker handle permissions internally
   - Gracefully handle permission denials with user feedback

3. **Upload failures**:
   - Verify Supabase storage bucket exists and is properly configured
   - Ensure user is authenticated before attempting upload
   - Check network connection status before upload

4. **Memory issues**:
   - Adjust image quality settings (0.8 is a good balance)
   - Disable exif data collection
   - Consider limiting the number of concurrent uploads

## Best Practices

1. **Always request base64 data** from the image picker when possible
2. **Use unique filenames** with timestamps and random strings
3. **Include detailed logging** to diagnose upload issues
4. **Provide clear user feedback** during the upload process
5. **Limit the number of images** users can upload (e.g., maximum 10)
6. **Properly handle content types** based on file extension
7. **Store image metadata** for future reference (width, height, type)

By following these steps, you'll have a reliable image picker and upload implementation for React Native with Expo and Supabase storage.
