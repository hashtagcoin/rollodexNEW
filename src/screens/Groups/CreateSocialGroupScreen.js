import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import { decode } from 'base64-arraybuffer'; // For image upload
import * as FileSystem from 'expo-file-system'; // For reading file as base64

const GROUP_TYPES = [
  'General', 'Social', 'Sport', 'Interest', 'Hobbies', 'NDIS', 'News', 'Politics', 'Music', 'Movies', 'Travel', 'Dating'
];

const TYPE_COLORS = {
  General: '#6C63FF',
  Social: '#FF6B6B',
  Sport: '#36CFC9',
  Interest: '#FFD166',
  Hobbies: '#43AA8B',
  NDIS: '#845EC2',
  News: '#2D4059',
  Politics: '#F76E11',
  Music: '#F9C80E',
  Movies: '#A28089',
  Travel: '#00B8A9',
  Dating: '#FF5E5B',
};

const CreateSocialGroupScreen = () => {
  const navigation = useNavigation();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImageUri, setGroupImageUri] = useState(null);

  // Handle image loading errors to prevent TurboModule crashes
  const handleImageError = (error, uri, imageType) => {
    if (__DEV__) {
      console.warn('CreateSocialGroupScreen: Image failed to load', {
        imageType,
        uri: uri?.substring(0, 50) + '...',
        error: error?.nativeEvent || error,
        platform: Platform.OS
      });
    }
  };
  const [groupImage, setGroupImage] = useState(null); // To store the selected image file info
  const [loading, setLoading] = useState(false);
  const [groupType, setGroupType] = useState(GROUP_TYPES[0]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setGroupImageUri(result.assets[0].uri);
      setGroupImage(result.assets[0]); // Store the asset object
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Validation Error', 'Group name is required.');
      return;
    }

    setLoading(true);
    let imageUrl = null;
    let imagePath = null;

    try {
      // 1. Upload image if selected
      if (groupImageUri && groupImage) {
        const fileExt = groupImage.uri.split('.').pop();
        const fileName = `public/${Date.now()}.${fileExt}`;
        const filePath = `group-avatars/${fileName}`;

        // Read the file as base64
        const base64 = await FileSystem.readAsStringAsync(groupImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const arrayBuffer = decode(base64);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('group-avatars') // Use the correct bucket name
          .upload(fileName, arrayBuffer, {
            contentType: groupImage.mimeType || `image/${fileExt}`,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('group-avatars')
          .getPublicUrl(fileName);
        imageUrl = publicUrlData?.publicUrl;
        imagePath = filePath; // Store the path for the database if needed
        console.log('Uploaded Image URL:', imageUrl);
      }

      // 2. Create group record in Supabase
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession?.user) {
        Alert.alert('Error', 'You must be logged in to create a group.');
        setLoading(false);
        return;
      }
      const userId = userSession.user.id;

      // Map UI groupType to allowed DB values
      let dbType = 'community';
      if (["Interest", "News", "Politics"].includes(groupType)) dbType = 'interest';
      else if (groupType === "NDIS") dbType = 'support';
      else dbType = 'community';

      const newGroup = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        // avatar_url: imagePath, // Store the path, not the full URL if preferred
        imageurl: imageUrl, // Or store the full public URL. Decide on one convention.
        category: 'social', // Default category
        is_public: true, // Default to public
        owner_id: userId,
        type: dbType, // Use mapped DB type
        // updated_at will be set by default by Supabase
      };

      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert(newGroup)
        .select()
        .single();

      if (groupError) {
        throw groupError;
      }

      // 3. Add the creator as an admin member to the group
      if (groupData) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupData.id,
            user_id: userId,
            role: 'admin',
          });
        if (memberError) {
          // Log error, but don't necessarily block success of group creation
          console.error('Error adding group creator as admin member:', memberError.message);
        }
      }

      Alert.alert('Success', 'Group created successfully!');
      // navigation.goBack(); // Or navigate to the new group's detail screen
      navigation.navigate('GroupDetail', { groupId: groupData.id, userRole: 'admin' }); // Navigate to new group, pass admin role

    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', `Failed to create group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={'height'}
      keyboardVerticalOffset={0}
    >
      <AppHeader title="Create Social Group" navigation={navigation} canGoBack={true} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" style={{flex: 1}}>
        <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
          {groupImageUri ? (
            <Image 
              source={{ uri: groupImageUri }} 
              style={styles.groupImagePreview}
              onError={(error) => handleImageError(error, groupImageUri, 'group_image_preview')}
              onLoadStart={() => {
                if (__DEV__) {
                  console.log('CreateSocialGroupScreen: Group image preview loading started');
                }
              }}
              onPartialLoad={() => {
                if (__DEV__) {
                  console.log('CreateSocialGroupScreen: Group image preview partial load');
                }
              }}
              defaultSource={require('../../../assets/placeholder-image.png')}
              loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
              fadeDuration={0}
              progressiveRenderingEnabled={true}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="camera" size={40} color={COLORS.mediumGray} />
              <Text style={styles.imagePlaceholderText}>Tap to select group image</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter group name (e.g., Book Club)"
          value={groupName}
          onChangeText={setGroupName}
          placeholderTextColor={COLORS.mediumGray}
        />

        <Text style={styles.label}>Group Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell us about your group..."
          value={groupDescription}
          onChangeText={setGroupDescription}
          multiline
          numberOfLines={4}
          placeholderTextColor={COLORS.mediumGray}
        />

        <Text style={styles.label}>Group Type</Text>
        <View style={styles.typeGroupWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollView} contentContainerStyle={styles.typeScrollContent}>
            {GROUP_TYPES.map((type, idx) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeToggle,
                  { backgroundColor: groupType === type ? TYPE_COLORS[type] || COLORS.blue : '#f2f4f8' },
                  idx === 0 && styles.typeToggleFirst,
                  idx === GROUP_TYPES.length - 1 && styles.typeToggleLast,
                ]}
                onPress={() => setGroupType(type)}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.typeToggleText,
                  { color: groupType === type ? '#fff' : COLORS.black }
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.blueButton, loading && styles.buttonDisabled]}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  typeGroupWrapper: {
    width: '100%',
    marginBottom: 16,
    marginTop: 0,
    backgroundColor: '#e9eaf3',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeScrollView: {
    width: '100%',
  },
  typeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  typeToggle: {
    borderRadius: 20,
    backgroundColor: '#f2f4f8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 8,
    marginLeft: 0,
    marginBottom: 0,
    marginTop: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  typeToggleFirst: {
    marginLeft: 4,
  },
  typeToggleLast: {
    marginRight: 4,
  },
  typeToggleText: {
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '500',
    fontFamily: 'System',
  },
  blueButton: {
    backgroundColor: COLORS.blue || '#007AFF',
  },
  screenContainer: {
    flex: 1,
    // backgroundColor: COLORS.lightGrayBackground || '#f4f4f8',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  imagePickerContainer: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden', // Ensures the image respects the border radius
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  groupImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 10,
    color: COLORS.darkGray,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray, // Softer border
    color: COLORS.black,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top', // For Android
    paddingTop: 15, // For iOS
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.PRIMARY, // Use a primary color from your theme
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: COLORS.mediumGray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateSocialGroupScreen;
