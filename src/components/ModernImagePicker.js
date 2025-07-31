import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Text, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';
import { Ionicons, Feather } from '@expo/vector-icons';

// REMOVED: Debug log
// console.log('[DEBUG] ModernImagePicker - React hooks imported');

export default function ModernImagePicker({ 
  onPick, 
  images, 
  setImages, 
  existingImages = [], 
  onRemoveExisting,
  onRemoveNew,
  maxImages = 10, 
  avatar, 
  style: customStyle, 
  loading, 
  containerStyle 
}) {
  // REMOVED: Debug log
  // console.log(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - Component function executing`); 

  // REMOVED: Debug logs related to useRef
  // try {
  //   console.log(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - Testing useRef`);
  //   const testRef = useRef({test: 'testing useRef'});
  //   console.log(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - useRef is available:`, testRef.current);
  // } catch (error) {
  //   console.error(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - useRef ERROR:`, error);
  // }
  const [pickingImage, setPickingImage] = useState(false);
  
  const pickImage = async () => {
    try {
      setPickingImage(true);
      
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        // console.error('Media library permission not granted'); // Keep internal logs if desired, but ensure they don't break rendering
        alert('Sorry, we need camera roll permissions to make this work!');
        setPickingImage(false);
        return;
      }
      
      // Launch image picker - adjust parameters based on whether it's an avatar or gallery
      let mediaTypesOption;
      try {
        // Try to use the new API
        mediaTypesOption = [ImagePicker.MediaType.Image];
      } catch (e) {
        // Fall back to old API
        mediaTypesOption = ImagePicker.MediaTypeOptions?.Images || 'Images';
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesOption,
        allowsEditing: avatar ? true : false, // Only enable editing for avatar
        aspect: avatar ? [1, 1] : undefined, // Square aspect ratio for avatar only
        quality: 0.8, 
        base64: true, // Get base64 data to ensure we can always create a valid blob
        exif: false, // Disable exif to reduce data size and potential issues
      });
      
      // console.log('Image picker result:', JSON.stringify(result)); // Keep internal logs if desired
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        // console.log('Selected asset:', JSON.stringify(selectedAsset)); // Keep internal logs if desired
        
        // Determine MIME type based on file extension if not provided
        let mimeType = selectedAsset.mimeType;
        if (!mimeType) {
          const uri = selectedAsset.uri;
          const extension = uri.split('.').pop().toLowerCase();
          if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
          else if (extension === 'png') mimeType = 'image/png';
          else if (extension === 'gif') mimeType = 'image/gif';
          else mimeType = 'image/jpeg'; // Default fallback
        }
        
        // Store base64 data if available for fallback upload method
        const processedImage = { 
          uri: selectedAsset.uri, 
          mimeType: mimeType,
          width: selectedAsset.width,
          height: selectedAsset.height,
          fileSize: selectedAsset.fileSize,
          base64: result.assets[0].base64, // Store base64 data from the image picker
          fileName: `Screenshot${new Date().toISOString().replace(/[:.]/g, '')}.${mimeType.split('/')[1]}` // Generate a unique filename
        };
        
        // Handle based on component mode
        if (setImages && images) {
          // Multiple image mode
          setImages(prev => [...prev, processedImage]);
        } else if (onPick) {
          // Single image mode (legacy)
          onPick(processedImage);
        }
      }
    } catch (error) {
      // console.error('Error picking image:', error); // Keep internal logs if desired
      alert('There was a problem selecting the image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };
  
  // For gallery view
  if (setImages && images !== undefined) {
    // Calculate total images (existing + new)
    const totalImages = (existingImages ? existingImages.length : 0) + images.length;
    
    // Helper function for rendering image item with delete button
    const renderImageItem = (uri, index, isExisting = false) => {
      const handleRemove = () => {
        if (isExisting && onRemoveExisting) {
          onRemoveExisting(index);
        } else if (!isExisting && onRemoveNew) {
          onRemoveNew(index);
        }
      };
      
      return (
        <View key={isExisting ? `existing-${index}-${uri.substring(0,20)}` : `new-${index}-${uri.substring(0,20)}`} style={styles.imageContainer}>
          <Image 
            source={{ uri }} 
            style={styles.imagePreview}
            onError={() => console.log(`[IMAGE_ERROR] Failed to load image: ${uri.substring(0,50)}...`)}
          />
          <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
            <Feather name="x-circle" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      );
    };
    
    return (
      <View style={[styles.container, containerStyle]}>
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.galleryContentContainer}
        >
          {/* Display existing images */}
          {existingImages && existingImages.map((uri, index) => (
            renderImageItem(uri, index, true)
          ))}
          
          {/* Display newly selected images */}
          {images.map((img, index) => (
            renderImageItem(img.uri, index, false)
          ))}
          
          {/* Add button */}
          {totalImages < maxImages && (
            <TouchableOpacity 
              style={[styles.addButton, customStyle]}
              onPress={pickImage}
              disabled={loading || pickingImage}
            >
              {loading || pickingImage ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                  <Text style={styles.addText}>Add Image</Text>
                  {maxImages && (
                    <Text style={styles.maxText}>{totalImages}/{maxImages}</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }
  
  // For avatar view (legacy mode)
  return (
    <TouchableOpacity 
      style={[styles.avatarWrap, customStyle]} 
      onPress={pickImage}
      disabled={loading || pickingImage}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatarImg} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Add Photo</Text>
        </View>
      )}
      
      {(loading || pickingImage) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  galleryContainer: {
    marginBottom: 10,
  },
  galleryContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 120,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    marginRight: 10,
  },
  addText: {
    color: COLORS.primary,
    fontSize: 14,
    marginTop: 4,
  },
  maxText: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: 120,
    height: 96,
    borderRadius: 8,
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
