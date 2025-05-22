import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import ModernImagePicker from '../../components/ModernImagePicker';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useUser } from '../../context/UserContext';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Use the global user context
  const { profile: userProfile, updateProfile, updateAvatar, uploadAvatarDirectly } = useUser();
  
  // Local state for form inputs
  const [profile, setProfile] = useState({ 
    username: '', 
    full_name: '', 
    bio: '', 
    avatar_url: '',
    primary_disability: '',
    support_level: '',
    mobility_aids: [],
    dietary_requirements: [],
    accessibility_preferences: {}
  });
  
  // Local state for avatar preview
  const [avatar, setAvatar] = useState(null);
  
  // Support level options
  const supportLevelOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'High', value: 'high' },
    { label: 'Flexible', value: 'flexible' }
  ];
  
  // Common mobility aids
  const mobilityAidOptions = [
    { label: 'Wheelchair', value: 'wheelchair' },
    { label: 'Walker', value: 'walker' },
    { label: 'Cane', value: 'cane' },
    { label: 'Crutches', value: 'crutches' },
    { label: 'Hearing Aid', value: 'hearing_aid' },
    { label: 'Visual Aid', value: 'visual_aid' },
    { label: 'Service Animal', value: 'service_animal' },
    { label: 'None', value: 'none' }
  ];
  
  // Common dietary requirements
  const dietaryRequirementOptions = [
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'Gluten-Free', value: 'gluten_free' },
    { label: 'Dairy-Free', value: 'dairy_free' },
    { label: 'Nut-Free', value: 'nut_free' },
    { label: 'None', value: 'none' }
  ];
  
  // Accessibility preference options
  const accessibilityOptions = [
    { label: 'High Contrast Mode', value: 'high_contrast' },
    { label: 'Simplified Text', value: 'simplified_text' },
    { label: 'Voice Navigation', value: 'voice_navigation' },
    { label: 'Screen Reader Compatible', value: 'screen_reader' }
  ];

  // Initialize form with user profile data from context
  useEffect(() => {
    if (userProfile) {
      setProfile({
        ...userProfile,
        // Ensure NDIS fields are properly initialized
        mobility_aids: userProfile.mobility_aids || [],
        dietary_requirements: userProfile.dietary_requirements || [],
        accessibility_preferences: userProfile.accessibility_preferences || {}
      });
      setAvatar(userProfile.avatar_url);
      setLoading(false);
    }
  }, [userProfile]);

  // Handle avatar selection and upload using the direct upload method
  const handleImagePick = async (imageData) => {
    if (!imageData || !imageData.uri) {
      console.error('Invalid image data received:', imageData);
      return;
    }
    
    try {
      // Show local preview immediately for better UX
      setAvatar(imageData.uri);
      setUploading(true);
      
      console.log('Selected image details:', {
        uri: imageData.uri,
        mimeType: imageData.mimeType,
        size: imageData.fileSize,
        dimensions: imageData.width && imageData.height ? `${imageData.width}x${imageData.height}` : 'unknown'
      });
      
      // Try the more reliable direct upload method first
      console.log('Attempting direct avatar upload...');
      const newAvatarUrl = await uploadAvatarDirectly(imageData.uri);
      
      if (newAvatarUrl) {
        console.log('Avatar updated successfully with URL:', newAvatarUrl);
        // Update local form state with the new URL
        setProfile(p => ({ ...p, avatar_url: newAvatarUrl }));
        // Show success message
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error('Failed to upload avatar - no URL returned');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Upload Failed', 
        'There was a problem uploading your profile picture. Please try again.'
      );
      // Revert the avatar preview on error
      setAvatar(profile.avatar_url);
    } finally {
      setUploading(false);
    }
  };

  // Save profile using the global context
  const saveProfile = async () => {
    setSaving(true);
    try {
      // Ensure the arrays and objects are properly formatted
      const formattedProfile = {
        ...profile,
        // Make sure these are arrays even if empty
        mobility_aids: Array.isArray(profile.mobility_aids) ? profile.mobility_aids : [],
        dietary_requirements: Array.isArray(profile.dietary_requirements) ? profile.dietary_requirements : [],
        // Make sure this is an object even if empty
        accessibility_preferences: typeof profile.accessibility_preferences === 'object' ? 
          profile.accessibility_preferences : {}
      };
      
      // Use the global updateProfile function from context
      const success = await updateProfile(formattedProfile);
      
      if (success) {
        Alert.alert('Success', 'Profile updated!');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Save Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  // Function to handle checkboxes or toggles
  const toggleOption = (option, field) => {
    setProfile(prev => {
      // For arrays like mobility_aids or dietary_requirements
      if (Array.isArray(prev[field])) {
        if (prev[field].includes(option)) {
          return { 
            ...prev, 
            [field]: prev[field].filter(item => item !== option)
          };
        } else {
          // If selecting 'none', clear other options
          if (option === 'none') {
            return { ...prev, [field]: ['none'] };
          } else {
            // If selecting any other option and 'none' is selected, remove 'none'
            const newOptions = prev[field].filter(item => item !== 'none');
            return { ...prev, [field]: [...newOptions, option] };
          }
        }
      } 
      // For accessibility_preferences object
      else if (field === 'accessibility_preferences') {
        const newPreferences = { ...prev.accessibility_preferences };
        newPreferences[option] = !newPreferences[option];
        return { ...prev, accessibility_preferences: newPreferences };
      }
      return prev;
    });
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Edit Profile" canGoBack navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <ModernImagePicker 
              onPick={handleImagePick} 
              avatar={avatar || profile.avatar_url} 
              style={styles.modernPicker}
              loading={uploading}
            />
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </View>
          
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                value={profile.username}
                onChangeText={text => setProfile(p => ({ ...p, username: text }))}
                autoCapitalize="none"
                accessibilityLabel="Username input field"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={profile.full_name}
                onChangeText={text => setProfile(p => ({ ...p, full_name: text }))}
                accessibilityLabel="Full name input field"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell us about yourself"
                value={profile.bio}
                onChangeText={text => setProfile(p => ({ ...p, bio: text }))}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Bio input field"
              />
            </View>
          </View>
          
          {/* NDIS Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>NDIS Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Primary Disability</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your primary disability"
                value={profile.primary_disability}
                onChangeText={text => setProfile(p => ({ ...p, primary_disability: text }))}
                accessibilityLabel="Primary disability input field"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Support Level</Text>
              <View style={styles.optionsContainer}>
                {supportLevelOptions.map(option => (
                  <TouchableOpacity 
                    key={option.value}
                    style={[styles.optionButton, profile.support_level === option.value && styles.optionButtonSelected]}
                    onPress={() => setProfile(p => ({ ...p, support_level: option.value }))}
                    accessibilityLabel={`${option.label} support level option`}
                  >
                    <Text 
                      style={[styles.optionText, profile.support_level === option.value && styles.optionTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          
          {/* Mobility Aids */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Mobility Aids</Text>
            <Text style={styles.optionDescription}>Select all that apply to you</Text>
            <View style={styles.checkboxContainer}>
              {mobilityAidOptions.map(option => (
                <TouchableOpacity 
                  key={option.value}
                  style={styles.checkboxRow}
                  onPress={() => toggleOption(option.value, 'mobility_aids')}
                  accessibilityLabel={`${option.label} checkbox`}
                >
                  <View style={[styles.checkbox, profile.mobility_aids.includes(option.value) && styles.checkboxSelected]}>
                    {profile.mobility_aids.includes(option.value) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Dietary Requirements */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Dietary Requirements</Text>
            <Text style={styles.optionDescription}>Select all that apply to you</Text>
            <View style={styles.checkboxContainer}>
              {dietaryRequirementOptions.map(option => (
                <TouchableOpacity 
                  key={option.value}
                  style={styles.checkboxRow}
                  onPress={() => toggleOption(option.value, 'dietary_requirements')}
                  accessibilityLabel={`${option.label} checkbox`}
                >
                  <View style={[styles.checkbox, profile.dietary_requirements.includes(option.value) && styles.checkboxSelected]}>
                    {profile.dietary_requirements.includes(option.value) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Accessibility Preferences */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Accessibility Preferences</Text>
            <Text style={styles.optionDescription}>Select your preferences for using the app</Text>
            <View style={styles.checkboxContainer}>
              {accessibilityOptions.map(option => (
                <TouchableOpacity 
                  key={option.value}
                  style={styles.switchRow}
                  onPress={() => toggleOption(option.value, 'accessibility_preferences')}
                  accessibilityLabel={`${option.label} toggle switch`}
                >
                  <Text style={styles.switchLabel}>{option.label}</Text>
                  <View style={[styles.switchTrack, profile.accessibility_preferences && profile.accessibility_preferences[option.value] && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, profile.accessibility_preferences && profile.accessibility_preferences[option.value] && styles.switchThumbActive]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, (saving || uploading) && styles.disabledButton]} 
            onPress={saveProfile} 
            disabled={saving || uploading}
            accessibilityLabel="Save profile button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" style={styles.saveIcon} />
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  modernPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  changePhotoText: {
    marginTop: 10,
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#555',
  },
  formSection: {
    width: '100%',
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
    paddingLeft: 4,
  },
  input: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: '#555',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  checkboxContainer: {
    width: '100%',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: `${COLORS.primary}40`,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  switchThumbActive: {
    backgroundColor: COLORS.primary,
    transform: [{ translateX: 22 }],
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 20,
    marginBottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});
