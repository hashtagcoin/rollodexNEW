import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import ModernImagePicker from '../../components/ModernImagePicker';
import { useUser } from '../../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Define colors for UI elements
const COLORS = {
  primary: '#007AFF',
  success: '#34C759',
  error: '#FF3B30',
  text: '#333333',
  lightText: '#666666',
  background: '#F8F7F3',
  card: '#FFFFFF',
  border: '#E0E0E0',
  inactive: '#CCCCCC',
};

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  
  // Username validation states
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null = not checked, true = available, false = taken
  const usernameTimeoutRef = useRef(null);
  
  // Use the global user context
  const { user, profile: userProfile, updateProfile, updateAvatar, uploadAvatarDirectly } = useUser();
  
  // Local state for form inputs
  const [profile, setProfile] = useState({ 
    username: '', 
    full_name: '', 
    bio: '', 
    avatar_url: '',
    background: '',
    age: '',
    sex: '',
    address: '',
    ndis_number: '',
    primary_disability: '',
    support_level: '',
    mobility_aids: [],
    dietary_requirements: [],
    accessibility_preferences: {},
    comfort_traits: [],
    preferred_categories: [],
    preferred_service_formats: []
  });
  
  // Local state for avatar preview
  const [avatar, setAvatar] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
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
  
  // Comfort traits options
  const COMFORT_TRAITS = [
    'Quiet Environment',
    'Female Support Worker',
    'Male Support Worker',
    'Experience with Autism',
    'Experience with Physical Disabilities',
    'Pet Friendly',
    'Transport Provided',
    'Flexible Schedule'
  ];
  
  // Service categories options
  const SERVICE_CATEGORIES = [
    'Therapy',
    'Personal Care',
    'Transport',
    'Social Activities',
    'Home Maintenance',
    'Daily Tasks',
    'Exercise Physiology',
    'Skills Development'
  ];
  
  // Service format options
  const SERVICE_FORMATS = [
    'In Person',
    'Online',
    'Home Visits',
    'Center Based',
    'Group Sessions'
  ];
  
  // Sex options
  const sexOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non-binary' },
    { label: 'Prefer not to say', value: 'not_specified' }
  ];

  // Initialize form with user profile data from context
  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 second timeout

    if (userProfile) {
      setProfile({
        ...userProfile,
        // Ensure ALL fields are properly initialized
        background: userProfile.background || '',
        mobility_aids: userProfile.mobility_aids || [],
        dietary_requirements: userProfile.dietary_requirements || [],
        accessibility_preferences: userProfile.accessibility_preferences || {},
        comfort_traits: userProfile.comfort_traits || [],
        preferred_categories: userProfile.preferred_categories || [],
        preferred_service_formats: userProfile.preferred_service_formats || [],
        ndis_number: userProfile.ndis_number || '',
        primary_disability: userProfile.primary_disability || '',
        support_level: userProfile.support_level || ''
      });
      // Only update avatar if we're not currently uploading a new one
      if (!isUploadingAvatar) {
        setAvatar(userProfile.avatar_url);
      }
      setLoading(false);
      clearTimeout(timeoutId);
      // Store the original username to compare when checking availability
      setOriginalUsername(userProfile.username || '');
    } else if (user) {
      // If no profile but user exists, create a basic profile with ALL fields
      setProfile({
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0] || '',
        full_name: '',
        bio: '',
        avatar_url: '',
        background: '',
        age: '',
        sex: '',
        address: '',
        ndis_number: '',
        primary_disability: '',
        support_level: '',
        mobility_aids: [],
        dietary_requirements: [],
        accessibility_preferences: {},
        comfort_traits: [],
        preferred_categories: [],
        preferred_service_formats: []
      });
      setLoading(false);
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [userProfile, user, isUploadingAvatar]);
  
  // State to store the original username for comparison
  const [originalUsername, setOriginalUsername] = useState('');
  
  // Function to check username availability with debouncing
  const checkUsernameAvailability = async (username) => {
    // Skip check if username is empty or unchanged from original
    if (!username || username === originalUsername) {
      setCheckingUsername(false);
      setUsernameAvailable(null);
      return;
    }
    
    try {
      setCheckingUsername(true);
      setUsernameAvailable(null);
      
      // Clear any existing timeout to prevent multiple checks
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
      
      // Delay the check by 500ms to avoid too many requests as user types
      usernameTimeoutRef.current = setTimeout(async () => {
        console.log('Checking availability for username:', username);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();
        
        if (error) throw error;
        
        // If no data is returned, the username is available
        setUsernameAvailable(!data);
        setCheckingUsername(false);
      }, 500);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
      setCheckingUsername(false);
    }
  };
  
  // Handle username input changes
  const handleUsernameChange = (text) => {
    setProfile(prev => ({ ...prev, username: text }));
    checkUsernameAvailability(text);
  };

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
      setIsUploadingAvatar(true);
      
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
      setIsUploadingAvatar(false);
    }
  };

  // Handle background image upload
  const handleBackgroundUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need access to your photos to set a background image.');
        return;
      }
      
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
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploadingBackground(true);
      
      // Get the image URI
      const imageUri = result.assets[0].uri;
      
      // Use the same iOS-compatible method as posts and profile avatars
      let base64Data;
      let contentType = 'image/jpeg';
      
      // Generate a unique filename
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `background_${Date.now()}.${fileExt}`;
      const filePath = `user-backgrounds/${profile.id}/${fileName}`;
      
      console.log('Background upload - preparing file:', fileName);
      
      try {
        // Use expo-file-system to read the file (same as posts and avatars)
        base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        console.log('Background upload - read as base64, length:', base64Data.length);
      } catch (error) {
        console.error('Error reading background image file:', error);
        throw new Error('Failed to read background image data');
      }
      
      // Convert base64 to array buffer for upload (same as posts and avatars)
      const arrayBuffer = decode(base64Data);
      console.log('Background upload - converted to arrayBuffer, byteLength:', arrayBuffer.byteLength);
      
      // Upload to Supabase Storage (iOS compatible - same as posts and avatars)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, arrayBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

      // Update the user's profile with the new background URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ background: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      // Update the local profile state with the new background
      setProfile(prev => ({ ...prev, background: publicUrl }));
      
      // Update the global context using the current userProfile from context
      // This ensures we have the latest profile data and the dashboard will refresh
      const updatedProfileData = { ...userProfile, background: publicUrl };
      const updateResult = await updateProfile(updatedProfileData);
      
      if (!updateResult.success) {
        throw new Error(updateResult.message || 'Failed to update profile context');
      }
      
      console.log('Background updated successfully in context:', updateResult.data?.background);
      
      Alert.alert('Success', 'Background image updated successfully');
    } catch (error) {
      console.error('Error uploading background image:', error);
      Alert.alert('Error', 'Failed to update background image. Please try again.');
    } finally {
      setUploadingBackground(false);
    }
  };

  // Function to validate required fields before saving
  const validateProfile = () => {
    if (!profile.username || profile.username.trim() === '') {
      Alert.alert('Error', 'Username is required');
      return false;
    }
    
    if (!profile.full_name || profile.full_name.trim() === '') {
      Alert.alert('Error', 'Full name is required');
      return false;
    }
    
    return true;
  };
  
  // Save profile using the enhanced global context
  const saveProfile = async () => {
    if (!validateProfile()) return;
    
    setSaving(true);
    try {
      // Ensure the arrays and objects are properly formatted
      const formattedProfile = {
        ...profile,
        // Ensure numeric fields are properly formatted
        age: profile.age ? parseInt(profile.age) : null,
        
        // Make sure these are arrays even if empty
        mobility_aids: Array.isArray(profile.mobility_aids) ? profile.mobility_aids : [],
        dietary_requirements: Array.isArray(profile.dietary_requirements) ? profile.dietary_requirements : [],
        comfort_traits: Array.isArray(profile.comfort_traits) ? profile.comfort_traits : [],
        preferred_categories: Array.isArray(profile.preferred_categories) ? profile.preferred_categories : [],
        preferred_service_formats: Array.isArray(profile.preferred_service_formats) ? profile.preferred_service_formats : [],
        
        // Make sure this is an object even if empty
        accessibility_preferences: typeof profile.accessibility_preferences === 'object' ? 
          profile.accessibility_preferences : {},
          
        // Ensure text fields are defined
        bio: profile.bio || '',
        address: profile.address || '',
        // Set ndis_number to null if empty to avoid unique constraint violations
        ndis_number: profile.ndis_number && profile.ndis_number.trim() ? profile.ndis_number.trim() : null,
        sex: profile.sex || ''
      };
      
      // Create a detailed log of all profile fields to ensure everything is being sent
      console.log('Saving complete profile with all fields:', {
        // Basic Information
        username: formattedProfile.username,
        full_name: formattedProfile.full_name,
        bio: formattedProfile.bio,
        avatar_url: formattedProfile.avatar_url,
        age: formattedProfile.age,
        sex: formattedProfile.sex,
        address: formattedProfile.address,
        
        // NDIS Information
        ndis_number: formattedProfile.ndis_number,
        primary_disability: formattedProfile.primary_disability,
        support_level: formattedProfile.support_level,
        
        // Arrays & Objects
        mobility_aids: JSON.stringify(formattedProfile.mobility_aids),
        dietary_requirements: JSON.stringify(formattedProfile.dietary_requirements),
        accessibility_preferences: JSON.stringify(formattedProfile.accessibility_preferences),
        comfort_traits: JSON.stringify(formattedProfile.comfort_traits),
        preferred_categories: JSON.stringify(formattedProfile.preferred_categories),
        preferred_service_formats: JSON.stringify(formattedProfile.preferred_service_formats)
      });
      
      // Use the enhanced global updateProfile function from context
      const result = await updateProfile(formattedProfile);
      
      if (result.success) {
        // Verify the saved data by checking if the returned data contains all fields
        if (result.data) {
          console.log('Verification of saved data:', {
            saved_username: result.data.username,
            saved_full_name: result.data.full_name,
            saved_bio: result.data.bio ? 'Set' : 'Not set',
            saved_age: result.data.age,
            saved_sex: result.data.sex,
            saved_address: result.data.address ? 'Set' : 'Not set',
            saved_ndis_number: result.data.ndis_number ? 'Set' : 'Not set',
            saved_comfort_traits: Array.isArray(result.data.comfort_traits) ? result.data.comfort_traits.length : 0,
            saved_preferred_categories: Array.isArray(result.data.preferred_categories) ? result.data.preferred_categories.length : 0,
            saved_preferred_service_formats: Array.isArray(result.data.preferred_service_formats) ? result.data.preferred_service_formats.length : 0
          });
        }
        
        Alert.alert('Success', 'Profile updated successfully!');
        navigation.goBack();
      } else {
        // Handle specific errors
        if (result.field === 'username') {
          Alert.alert('Username Error', result.message);
        } else {
          Alert.alert('Save Error', result.message || 'Failed to update profile');
        }
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

  // Function to handle checkboxes or toggles for mobility aids and dietary requirements
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
  
  // Function to handle multi-select options (comfort_traits, preferred_categories, preferred_service_formats)
  const toggleMultiSelect = (option, field) => {
    setProfile(prev => {
      // Ensure the field is an array
      const currentValues = Array.isArray(prev[field]) ? [...prev[field]] : [];
      
      if (currentValues.includes(option)) {
        // Remove if already selected
        return { 
          ...prev, 
          [field]: currentValues.filter(item => item !== option)
        };
      } else {
        // Add if not selected
        return { 
          ...prev, 
          [field]: [...currentValues, option]
        };
      }
    });
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Edit Profile" canGoBack navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <ModernImagePicker 
              onPick={handleImagePick} 
              avatar={avatar || profile.avatar_url} 
              style={styles.modernPicker}
              loading={uploading}
            />
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            
            {/* Background Image Upload */}
            <View style={styles.backgroundUploadContainer}>
              <TouchableOpacity 
                style={styles.backgroundButton}
                onPress={handleBackgroundUpload}
                disabled={uploadingBackground}
              >
                {uploadingBackground ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.backgroundButtonText}>Change Background</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {/* Username with availability check */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username <Text style={styles.requiredField}>*</Text></Text>
              <View style={styles.usernameContainer}>
                <TextInput
                  style={[styles.input, styles.usernameInput]}
                  placeholder="Enter your username"
                  value={profile.username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  accessibilityLabel="Username input field"
                />
                
                {/* Username availability indicator */}
                <View style={styles.usernameStatusContainer}>
                  {checkingUsername && (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  )}
                  
                  {!checkingUsername && usernameAvailable === true && profile.username && profile.username !== originalUsername && (
                    <View style={[styles.statusIconCircle, styles.availableCircle]}>
                      <MaterialIcons name="check" size={16} color="white" />
                    </View>
                  )}
                  
                  {!checkingUsername && usernameAvailable === false && (
                    <View style={[styles.statusIconCircle, styles.unavailableCircle]}>
                      <MaterialIcons name="close" size={16} color="white" />
                    </View>
                  )}
                </View>
              </View>
              
              {/* Username availability message */}
              {!checkingUsername && usernameAvailable === true && profile.username && profile.username !== originalUsername && (
                <Text style={styles.availableText}>Username available</Text>
              )}
              
              {!checkingUsername && usernameAvailable === false && (
                <Text style={styles.unavailableText}>Username already taken</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name <Text style={styles.requiredField}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={profile.full_name}
                onChangeText={text => setProfile(p => ({ ...p, full_name: text }))}
                accessibilityLabel="Full name input field"
              />
            </View>
            
            {/* Age field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                value={profile.age ? String(profile.age) : ''}
                onChangeText={text => {
                  // Only allow numeric input
                  const numericText = text.replace(/[^0-9]/g, '');
                  setProfile(p => ({ ...p, age: numericText ? parseInt(numericText) : null }));
                }}
                keyboardType="numeric"
                accessibilityLabel="Age input field"
              />
            </View>
            
            {/* Sex selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sex</Text>
              <View style={styles.optionsContainer}>
                {sexOptions.map(option => (
                  <TouchableOpacity 
                    key={option.value}
                    style={[styles.optionButton, profile.sex === option.value && styles.optionButtonSelected]}
                    onPress={() => setProfile(p => ({ ...p, sex: option.value }))}
                    accessibilityLabel={`${option.label} sex option`}
                  >
                    <Text 
                      style={[styles.optionText, profile.sex === option.value && styles.optionTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Address field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your address"
                value={profile.address}
                onChangeText={text => setProfile(p => ({ ...p, address: text }))}
                accessibilityLabel="Address input field"
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
            
            {/* NDIS Number field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NDIS Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your NDIS number"
                value={profile.ndis_number}
                onChangeText={text => setProfile(p => ({ ...p, ndis_number: text }))}
                accessibilityLabel="NDIS number input field"
              />
            </View>
            
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
            
            {/* Comfort Traits section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Comfort Traits</Text>
              <Text style={styles.optionDescription}>Select all that apply to you</Text>
              <View style={styles.checkboxContainer}>
                {COMFORT_TRAITS.map(trait => {
                  const isSelected = profile.comfort_traits?.includes(trait);
                  return (
                    <TouchableOpacity
                      key={trait}
                      style={styles.checkboxRow}
                      onPress={() => toggleMultiSelect(trait, 'comfort_traits')}
                      accessibilityLabel={`${trait} comfort trait option`}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <Text style={styles.checkboxLabel}>{trait}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Preferred Service Categories section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Service Categories</Text>
              <Text style={styles.optionDescription}>Select all that apply to you</Text>
              <View style={styles.checkboxContainer}>
                {SERVICE_CATEGORIES.map(category => {
                  const isSelected = profile.preferred_categories?.includes(category);
                  return (
                    <TouchableOpacity
                      key={category}
                      style={styles.checkboxRow}
                      onPress={() => toggleMultiSelect(category, 'preferred_categories')}
                      accessibilityLabel={`${category} service category option`}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <Text style={styles.checkboxLabel}>{category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Preferred Service Formats section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Service Formats</Text>
              <Text style={styles.optionDescription}>Select all that apply to you</Text>
              <View style={styles.checkboxContainer}>
                {SERVICE_FORMATS.map(format => {
                  const isSelected = profile.preferred_service_formats?.includes(format);
                  return (
                    <TouchableOpacity
                      key={format}
                      style={styles.checkboxRow}
                      onPress={() => toggleMultiSelect(format, 'preferred_service_formats')}
                      accessibilityLabel={`${format} service format option`}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <Text style={styles.checkboxLabel}>{format}</Text>
                    </TouchableOpacity>
                  );
                })}
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
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  requiredField: {
    color: '#FF3B30',
    fontWeight: 'bold',
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
    minHeight: 100,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
  },
  usernameStatusContainer: {
    marginLeft: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableCircle: {
    backgroundColor: '#34C759', // iOS green color
  },
  unavailableCircle: {
    backgroundColor: '#FF3B30', // iOS red color
  },
  availableText: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
  },
  unavailableText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
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
