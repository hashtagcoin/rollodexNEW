To reliably upload documents (such as PDFs and images) to a React Native app built with Expo SDK 53, React 19, and Supabase, you need to address compatibility issues, handle file selection, and convert files to a format suitable for Supabase Storage. Below is a step-by-step guide based on current best practices and the provided context.
Prerequisites
Expo SDK 53: Includes React Native 0.79 and experimental React 19 support. Ensure your project is set up with npx expo install expo@53.0.1.

Supabase Project: Create a Supabase project and note your SUPABASE_URL and SUPABASE_ANON_KEY from the Supabase Dashboard.

Supabase Storage: Configure a storage bucket (e.g., documents) with appropriate policies (e.g., public or user-restricted access).

Dependencies:
Install required packages:
bash

npx expo install @supabase/supabase-js@2.49.5-next.5 expo-file-system expo-image-picker expo-document-picker @react-native-async-storage/async-storage react-native-url-polyfill

Note: Use @supabase/supabase-js@2.49.5-next.5 to address compatibility issues with Expo SDK 53.

Ensure react-native-url-polyfill is imported in your entry file (e.g., App.js):
javascript

import 'react-native-url-polyfill/auto';

Step-by-Step Implementation
1. Set Up Supabase Client
Create a supabaseClient.js file to initialize the Supabase client with secure storage for authentication:
javascript

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

Store SUPABASE_URL and SUPABASE_ANON_KEY in a .env file:

EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

Ensure the .env file is loaded (e.g., using babel-plugin-inline-dotenv for development). Clear the Expo cache after updating .env:
bash

npx expo start -c

2. Configure Supabase Storage Policies
In the Supabase Dashboard, create a bucket (e.g., documents) and set policies to allow uploads. For example, to allow authenticated users to upload:
sql

CREATE POLICY "Authenticated users can upload to documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

For public access (if needed):
sql

CREATE POLICY "Anyone can upload to documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents');

Adjust policies based on your app’s security requirements.

3. Implement File Picker
Use expo-image-picker for images and expo-document-picker for PDFs or other documents.
Install Dependencies:
bash

npx expo install expo-image-picker expo-document-picker

File Picker Function:
Create a reusable function to handle both image and document selection:

javascript

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const pickFile = async (type = 'image') => {
  try {
    let result;
    if (type === 'image') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert("Permission to access photos is required!");
        return null;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
    } else {
      result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Allow PDFs and images
        copyToCacheDirectory: true,
      });
    }

    if (result.canceled) return null;
    return type === 'image' ? result.assets[0] : result;
  } catch (error) {
    console.error('Error picking file:', error);
    return null;
  }
};

4. Upload Files to Supabase Storage
Supabase Storage does not accept Blob or File objects directly in React Native. Instead, convert the file to an ArrayBuffer using expo-file-system and the base64-arraybuffer library.

Install Additional Dependency:
bash

npm install base64-arraybuffer

Upload Function:
Create a function to upload the selected file to Supabase Storage:

javascript

import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabaseClient';

const uploadFile = async (file, bucketName = 'documents', userId) => {
  try {
    const uri = file.uri;
    const fileExt = uri.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const contentType = fileExt === 'pdf' ? 'application/pdf' : 'image/*';

    // Read file as Base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert Base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL (if bucket is public)
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return { path: fileName, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

Notes:
The userId in the file path ensures user-specific storage (e.g., user123/1729641234567.jpg).

Set contentType based on file type (application/pdf for PDFs, image/* for images).

Use getPublicUrl for public buckets or createSignedUrl for private buckets with temporary access.

5. Integrate into Your Component
Combine the file picker and upload logic in a React component:
javascript

import React, { useState } from 'react';
import { View, Button, Alert, Image } from 'react-native';
import { supabase } from './supabaseClient';

const FileUploadScreen = () => {
  const [fileUri, setFileUri] = useState(null);
  const userId = 'user123'; // Replace with actual user ID from auth

  const handlePickAndUpload = async (type) => {
    const file = await pickFile(type);
    if (!file) return;

    setFileUri(file.uri);
    try {
      const { publicUrl } = await uploadFile(file, 'documents', userId);
      Alert.alert('Success', `File uploaded: ${publicUrl}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {fileUri && <Image source={{ uri: fileUri }} style={{ width: 100, height: 100 }} />}
      <Button title="Upload Image" onPress={() => handlePickAndUpload('image')} />
      <Button title="Upload PDF" onPress={() => handlePickAndUpload('document')} />
    </View>
  );
};

export default FileUploadScreen;

6. Handle Compatibility with Expo SDK 53 and React 19
Supabase Compatibility: The @supabase/supabase-js library may encounter issues with Expo SDK 53 due to Metro’s ES module resolution and Node standard library dependencies (e.g., stream). Using @supabase/supabase-js@2.49.5-next.5 resolves these issues.

React 19: Ensure all dependencies are compatible with React 19. If you encounter multiple React version errors, add overrides to package.json:
json

"overrides": {
  "react": "19.0.0-rc-69d4b800-20241021",
  "react-dom": "19.0.0-rc-69d4b800-20241021"
}

New Architecture: Expo SDK 53 enables the New Architecture by default. If you face issues, opt out temporarily by following the Expo documentation.

7. Display Uploaded Files
To display uploaded files (e.g., images), fetch the public URL or signed URL and render them:
javascript

const fetchImageUrl = async (filePath, bucketName = 'documents') => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
};

For private buckets, use createSignedUrl with an appropriate expiry time.
8. Testing and Debugging
Test on both iOS and Android using npx expo start --dev-client.

Check Supabase Storage in the Dashboard to confirm uploads.

Log errors and verify bucket policies if uploads fail.

If you encounter issues, refer to the Supabase GitHub or community for React Native-specific solutions.

Additional Notes
File Size Limits: Supabase has a default file size limit (e.g., 50MB for free tiers). For larger files, consider chunking or upgrading your plan.

Security: Use Row Level Security (RLS) and bucket policies to restrict access. Avoid public buckets unless necessary.

Error Handling: Implement robust error handling for network issues, permission denials, or invalid file types.

Performance: For large files, monitor upload performance and consider displaying progress indicators using xhr.upload.onprogress (though accuracy may vary).

Example Full Source
For a complete example, refer to the Supabase documentation or GitHub repositories like the Supabase React Native Instagram clone.

This approach ensures reliable file uploads compatible with Expo SDK 53, React 19, and Supabase, addressing known issues and leveraging community-recommended solutions. If you need further clarification or run into specific errors, let me know!

4 posts

15 web pages

learn about Supabase security

explore Expo file handling

