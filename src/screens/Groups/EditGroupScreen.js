import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import { decode } from 'base64-arraybuffer'; // For image upload
import ActionButton from '../../components/common/ActionButton'; // Or a regular button
import * as ImagePicker from 'expo-image-picker';

const EditGroupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, initialData } = route.params || {}; // initialData might contain name, desc, imageurl

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImageUri, setGroupImageUri] = useState(null); // For local image selection
  const [currentImageUrl, setCurrentImageUrl] = useState(null); // Existing image URL
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setGroupName(initialData.name || '');
      setGroupDescription(initialData.description || '');
      setCurrentImageUrl(initialData.imageurl || null);
    } else if (groupId) {
      // If initialData is not passed, fetch group details
      fetchGroupDetails();
    }
  }, [groupId, initialData]);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('name, description, imageurl')
        .eq('id', groupId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setGroupName(data.name || '');
        setGroupDescription(data.description || '');
        setCurrentImageUrl(data.imageurl || null);
      }
    } catch (e) {
      setError('Failed to fetch group details: ' + e.message);
      Alert.alert('Error', 'Could not load group details.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const handlePickImage = async () => {
    // Request permission to access the media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to make this work. Please enable it in your settings.'
      );
      return;
    }

    // Launch the image library
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3], // Common aspect ratio for group images
        quality: 0.8, // Compress image slightly for faster uploads
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupImageUri(result.assets[0].uri);
        // setCurrentImageUrl(null); // No, keep currentImageUrl if user clears new image later. Only set new URI.
      } else {
        // User cancelled or no assets found
        console.log('[EditGroupScreen] Image picking cancelled or no assets found.');
      }
    } catch (pickerError) {
      console.error('[EditGroupScreen] ImagePicker Error: ', pickerError);
      Alert.alert('Image Picker Error', 'Could not open image picker: ' + pickerError.message);
    }
  };

  const handleSaveChanges = async () => {
    if (!groupName.trim()) {
      Alert.alert('Validation Error', 'Group name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    let newImageUrl = currentImageUrl; // Start with the existing image URL

    try {
      // 1. Upload new image if one was selected
      if (groupImageUri) {
        console.log('[EditGroupScreen] New image selected. Uploading:', groupImageUri);
        const fileExt = groupImageUri.split('.').pop();
        const fileName = `${groupId}_${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        // Fetch the image data as a blob, then convert to ArrayBuffer
        const response = await fetch(groupImageUri);
        const blob = await response.blob();
        
        // Supabase expects ArrayBuffer, convert blob to ArrayBuffer
        // For React Native, we might need to read the file URI directly if fetch doesn't work well with local file URIs
        // For now, assuming fetch works or we'd use expo-file-system to read as base64 then decode
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('groupavatars') // Ensure this bucket exists and has correct policies
          .upload(filePath, arrayBuffer, {
            contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            upsert: true, // Overwrite if file with same name exists (e.g. re-editing)
          });

        if (uploadError) {
          console.error('[EditGroupScreen] Image Upload Error:', uploadError);
          throw new Error('Failed to upload new group image: ' + uploadError.message);
        }

        // Get public URL for the new image
        const { data: publicUrlData } = supabase.storage
          .from('groupavatars')
          .getPublicUrl(filePath);
        
        if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error('[EditGroupScreen] Error getting public URL for new image');
            throw new Error('Failed to get public URL for new image.');
        }
        newImageUrl = publicUrlData.publicUrl;
        console.log('[EditGroupScreen] New image uploaded. Public URL:', newImageUrl);
      }

      // 2. Update group details in Supabase 'groups' table
      const updates = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        imageurl: newImageUrl, // This will be the new URL or the existing one if no new image was picked
        updated_at: new Date(),
      };

      console.log('[EditGroupScreen] Updating group details with:', updates);
      const { error: updateError } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId);

      if (updateError) {
        console.error('[EditGroupScreen] Group Update Error:', updateError);
        throw new Error('Failed to update group details: ' + updateError.message);
      }

      Alert.alert('Success', 'Group details updated successfully!');
      // Navigate back, potentially with a param to trigger refresh in GroupDetailScreen
      navigation.navigate('GroupDetail', { groupId: groupId, updated: Date.now() });

    } catch (e) {
      console.error('[EditGroupScreen] Save Changes Error:', e);
      setError('Failed to save changes: ' + e.message);
      Alert.alert('Error', 'Failed to save changes: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !initialData) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text>Loading group details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Edit Group" navigation={navigation} canGoBack={true} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name"
        />

        <Text style={styles.label}>Group Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={groupDescription}
          onChangeText={setGroupDescription}
          placeholder="Enter group description"
          multiline
        />

        <Text style={styles.label}>Group Image</Text>
        <TouchableOpacity onPress={handlePickImage} style={styles.imagePickerButton}>
          {(groupImageUri || currentImageUrl) ? (
            <Image 
              source={{ uri: groupImageUri || currentImageUrl }} 
              style={styles.groupImagePreview} 
            />
          ) : (
            <Text style={styles.imagePickerText}>Select Image</Text>
          )}
        </TouchableOpacity>
        {groupImageUri && (
            <TouchableOpacity onPress={() => {setGroupImageUri(null); /* Keep currentImageUrl */}} style={styles.removeImageButton}>
                <Text style={styles.removeImageButtonText}>Clear New Image</Text>
            </TouchableOpacity>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveChanges} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_GREY_BG, // Example background
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10,
    borderRadius: 8,
    fontSize: 16,
    borderColor: COLORS.BORDER_LIGHT,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    marginBottom: 10,
  },
  imagePickerText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
  },
  groupImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  removeImageButton: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 10,
  },
  removeImageButtonText: {
    color: COLORS.RED,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.GREY,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.RED,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
});

export default EditGroupScreen;
