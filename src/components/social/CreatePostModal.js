import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { createPost } from '../../services/postService';
import { COLORS, FONTS } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';

const CreatePostModal = ({ visible, onClose, onPostCreated }) => {
  const [caption, setCaption] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user on component mount
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    if (visible) {
      getUser();
      // Reset state when modal opens
      setCaption('');
      setSelectedImages([]);
    }
  }, [visible]);

  // Request permissions for accessing media library
  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to select images.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  // Handle picking and cropping images using expo-image-picker
  const handlePickImages = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Limit number of images that can be selected
      if (selectedImages.length >= 5) {
        Alert.alert('Image Limit', 'You can select up to 5 images for a post.');
        return;
      }

      // Use expo-image-picker - note: can't use allowsEditing with multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing to avoid iOS issues
        quality: 0.8,
        allowsMultipleSelection: Platform.OS === 'ios' ? false : selectedImages.length < 4, // Disable multiple selection on iOS
        base64: Platform.OS === 'ios' ? false : true, // Disable base64 on iOS to avoid memory issues
      });

      if (!result.canceled && result.assets) {
        // Process the assets to ensure they have base64 if needed
        const processedAssets = await Promise.all(
          result.assets.map(async (asset) => {
            // If base64 is not included, fetch it (might be needed for some Expo versions)
            if (!asset.base64) {
              try {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                return { ...asset, base64 };
              } catch (e) {
                console.error('Error reading file as base64:', e);
                return asset;
              }
            }
            return asset;
          })
        );

        // Add new images to existing selection, up to limit of 5
        const newImages = [...selectedImages, ...processedAssets].slice(0, 5);
        setSelectedImages(newImages);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  // Remove an image from the selection
  const removeImage = (index) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  // Handle post creation
  const handleCreatePost = async () => {
    if (!caption.trim() && selectedImages.length === 0) {
      Alert.alert('Empty Post', 'Please add a caption or images to create a post.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    setLoading(true);

    try {
      await createPost(
        currentUser.id,
        caption.trim(),
        selectedImages
      );

      setLoading(false);
      Alert.alert('Success', 'Your post has been created successfully!');
      
      // Clear form and close modal
      setCaption('');
      setSelectedImages([]);
      
      // Call the callback to refresh posts in the parent component
      if (onPostCreated) {
        onPostCreated();
      }
      
      onClose();
    } catch (error) {
      setLoading(false);
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again later.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity 
            onPress={handleCreatePost} 
            style={[styles.postButton, (!caption.trim() && selectedImages.length === 0) && styles.disabledButton]}
            disabled={loading || (!caption.trim() && selectedImages.length === 0)}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Caption Input */}
          <TextInput
            style={styles.captionInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            multiline
            value={caption}
            onChangeText={setCaption}
            maxLength={2000}
            editable={!loading}
          />

          {/* Selected Images Preview */}
          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: image.path || image.uri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                      disabled={loading}
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Image Picker Button */}
          <TouchableOpacity 
            style={styles.imagePickerButton}
            onPress={handlePickImages}
            disabled={loading}
          >
            <Text style={styles.imagePickerButtonText}>
              {selectedImages.length > 0 ? 'Add More Images' : 'Add Images'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    ...FONTS.h3,
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  captionInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    marginVertical: 16,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imagePickerButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerButtonText: {
    color: '#333',
    fontWeight: '600',
  },
});

export default CreatePostModal;
