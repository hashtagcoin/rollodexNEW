import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ModernImagePicker({ onPick, avatar, style }) {
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      onPick({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
    }
  };
  return (
    <TouchableOpacity style={[styles.avatarWrap, style]} onPress={pickImage}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatarImg} />
      ) : (
        <View style={styles.placeholder} />
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
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  placeholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ddd',
  },
});
