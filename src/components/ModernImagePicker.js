import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';

export default function ModernImagePicker({ onPick, avatar, style, loading }) {
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
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: true,
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
        
        onPick({ 
          uri: selectedAsset.uri, 
          mimeType: mimeType,
          width: selectedAsset.width,
          height: selectedAsset.height,
          fileSize: selectedAsset.fileSize
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('There was a problem selecting the image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.avatarWrap, style]} 
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
    borderRadius: 48,
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
