import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Debug log moved here from imports section
console.log('[DEBUG] ModernImagePicker - React hooks imported');

export default function ModernImagePicker({ onPick, images, setImages, maxImages = 10, avatar, style: customStyle, loading, containerStyle }) {
  console.log(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - Component function executing`); 

  // Test useRef availability immediately
  try {
    console.log(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - Testing useRef`);
    const testRef = useRef({test: 'testing useRef'});
    console.log(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - useRef is available:`, testRef.current);
  } catch (error) {
    console.error(`[DEBUG][${new Date().toISOString()}] ModernImagePicker - useRef ERROR:`, error);
  }
  const [pickingImage, setPickingImage] = useState(false);
  
  const pickImage = async () => {
    try {
      setPickingImage(true);
      
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('Media library permission not granted');
        alert('Sorry, we need camera roll permissions to make this work!');
        setPickingImage(false);
        return;
      }
      
      // Launch image picker - adjust parameters based on whether it's an avatar or gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Keep this for now until we update expo-image-picker
        allowsEditing: avatar ? true : false, // Only enable editing for avatar
        aspect: avatar ? [1, 1] : undefined, // Square aspect ratio for avatar only
        quality: 0.8, 
        base64: true, // Get base64 data to ensure we can always create a valid blob
        exif: false, // Disable exif to reduce data size and potential issues
      });
      
      console.log('Image picker result:', JSON.stringify(result));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        console.log('Selected asset:', JSON.stringify(selectedAsset));
        
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
      console.error('Error picking image:', error);
      alert('There was a problem selecting the image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };
  
  // For gallery view
  if (setImages && images !== undefined) {
    return (
      <View style={[styles.galleryContainer, containerStyle]}>
        <TouchableOpacity 
          style={[styles.addButton, customStyle]}
          onPress={pickImage}
          disabled={loading || pickingImage || (maxImages && images.length >= maxImages)}
        >
          {loading || pickingImage ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.addText}>Add Image</Text>
              {maxImages && (
                <Text style={styles.maxText}>{images.length}/{maxImages}</Text>
              )}
            </>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 48,
  },
});
