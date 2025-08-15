import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform  } from 'react-native';
import { Alert } from '../../utils/alert';

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
import { LinearGradient } from 'expo-linear-gradient';

// Define colors for UI elements
const COLORS = {
  primary: '#007AFF',
  success: '#34C759',
  error: '#FF3B30',
  text: '#1C1C1E',
  lightText: '#8E8E93',
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  inactive: '#C7C7CC',
  inputBg: '#F9F9FB',
  sectionBg: 'rgba(255, 255, 255, 0.95)',
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
  
  // Check if current user is a provider
  const isProvider = userProfile?.role === 'provider';
  
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
    preferred_service_formats: [],
    // Provider-specific fields from onboarding
    business_name: '',
    contact_name: '',
    provider_type: '',
    service_types: [],
    service_areas: [],
    languages: [],
    ndis_registered: false,
    registration_number: '',
    availability: {
      weekdays: false,
      weekends: false,
      evenings: false,
      emergencies: false,
    },
    // Participant-specific fields from onboarding
    preferred_name: '',
    main_goals: [],
    support_needs: [],
    accessibility_needs: [],
    comfort_preferences: [],
    interests: []
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
  
  // Comfort traits options (for participants)
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
  
  // Service categories options (for participants)
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
  
  // Service format options (for participants)
  const SERVICE_FORMATS = [
    'In Person',
    'Online',
    'Home Visits',
    'Center Based',
    'Group Sessions'
  ];
  
  // Provider-specific options
  const PROVIDER_TYPES = [
    { id: 'individual', label: 'Individual Provider', description: 'Solo practitioner or therapist' },
    { id: 'business', label: 'Service Business', description: 'Company with multiple staff' },
    { id: 'housing', label: 'Housing Provider', description: 'SDA or rental properties' },
    { id: 'community', label: 'Community Organization', description: 'Groups, events, activities' },
  ];
  
  const SERVICE_TYPES = [
    'Occupational Therapy', 'Speech Therapy', 'Physiotherapy', 'Psychology',
    'Personal Care', 'Domestic Assistance', 'Meal Preparation', 'Shopping',
    'Community Access', 'Social Groups', 'Recreation', 'Mentoring',
    'Nursing Care', 'Medication Support', 'Health Monitoring', 'Wound Care',
    'SDA Housing', 'Supported Living', 'Respite Care', 'Short Term Accommodation',
    'Community Transport', 'Medical Appointments', 'Shopping Trips', 'Social Outings'
  ];
  
  const SERVICE_AREAS = [
    'Melbourne CBD', 'North Melbourne', 'South Melbourne', 'Eastern Suburbs',
    'Western Suburbs', 'Geelong', 'Ballarat', 'Bendigo', 'Online/Remote'
  ];
  
  const LANGUAGES = [
    'English', 'Mandarin', 'Arabic', 'Vietnamese', 'Greek', 'Italian',
    'Cantonese', 'Spanish', 'Hindi', 'Punjabi', 'Auslan', 'Other'
  ];

  // Participant-specific options from onboarding
  const MAIN_GOALS = [
    { id: 'independence', label: 'Live more independently' },
    { id: 'social', label: 'Make new friends' },
    { id: 'skills', label: 'Learn new skills' },
    { id: 'work', label: 'Find work opportunities' },
    { id: 'health', label: 'Improve my health' },
    { id: 'fun', label: 'Have more fun' }
  ];

  const SUPPORT_NEEDS = [
    { id: 'daily', label: 'Daily living support' },
    { id: 'therapy', label: 'Therapy services' },
    { id: 'social', label: 'Social activities' },
    { id: 'respite', label: 'Respite care' },
    { id: 'transport', label: 'Transport assistance' },
    { id: 'housing', label: 'Housing support' },
    { id: 'employment', label: 'Employment support' },
    { id: 'equipment', label: 'Equipment & technology' }
  ];

  const ACCESSIBILITY_NEEDS = [
    { id: 'wheelchair', label: 'Wheelchair accessible' },
    { id: 'parking', label: 'Accessible parking' },
    { id: 'quiet', label: 'Quiet spaces' },
    { id: 'visual', label: 'Visual aids' },
    { id: 'hearing', label: 'Hearing support' },
    { id: 'easy-read', label: 'Easy read materials' }
  ];

  const COMFORT_PREFERENCES = [
    { id: 'animals', label: 'Love animals' },
    { id: 'outdoors', label: 'Enjoy outdoors' },
    { id: 'small-groups', label: 'Prefer small groups' },
    { id: 'one-on-one', label: 'One-on-one support' },
    { id: 'routine', label: 'Like routine' },
    { id: 'flexible', label: 'Flexible timing' }
  ];

  const INTERESTS = [
    'Sports & Fitness', 'Arts & Crafts', 'Music', 'Cooking', 'Gaming', 
    'Reading', 'Nature', 'Technology', 'Volunteering', 'Travel', 
    'Movies & TV', 'Social Events'
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
        // Ensure ALL fields are properly initialized with null checks
        username: userProfile.username ?? '',
        full_name: userProfile.full_name ?? '',
        bio: userProfile.bio ?? '',
        avatar_url: userProfile.avatar_url ?? '',
        background: userProfile.background ?? '',
        age: userProfile.age ?? '',
        sex: userProfile.sex ?? '',
        address: userProfile.address ?? '',
        ndis_number: userProfile.ndis_number ?? '',
        primary_disability: userProfile.primary_disability ?? '',
        support_level: userProfile.support_level ?? '',
        mobility_aids: userProfile.mobility_aids ?? [],
        dietary_requirements: userProfile.dietary_requirements ?? [],
        accessibility_preferences: userProfile.accessibility_preferences ?? {},
        comfort_traits: userProfile.comfort_traits ?? [],
        preferred_categories: userProfile.preferred_categories ?? [],
        preferred_service_formats: userProfile.preferred_service_formats ?? [],
        // Provider-specific fields from onboarding
        business_name: userProfile.business_name ?? '',
        contact_name: userProfile.contact_name ?? '',
        provider_type: userProfile.provider_type ?? '',
        service_types: userProfile.service_types ?? [],
        service_areas: userProfile.service_areas ?? [],
        languages: userProfile.languages ?? [],
        ndis_registered: userProfile.ndis_registered ?? false,
        registration_number: userProfile.registration_number ?? '',
        availability: userProfile.availability ?? {
          weekdays: false,
          weekends: false,
          evenings: false,
          emergencies: false,
        },
        // Participant-specific fields from onboarding
        preferred_name: userProfile.preferred_name ?? '',
        main_goals: userProfile.main_goals ?? [],
        support_needs: userProfile.support_needs ?? [],
        accessibility_needs: userProfile.accessibility_needs ?? [],
        comfort_preferences: userProfile.comfort_preferences ?? [],
        interests: userProfile.interests ?? []
      });
      // Only update avatar if we're not currently uploading a new one
      if (!isUploadingAvatar) {
        setAvatar(userProfile.avatar_url ?? null);
      }
      setLoading(false);
      clearTimeout(timeoutId);
      // Store the original username to compare when checking availability
      setOriginalUsername(userProfile.username ?? '');
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
        preferred_service_formats: [],
        // Provider-specific fields from onboarding
        business_name: '',
        contact_name: '',
        provider_type: '',
        service_types: [],
        service_areas: [],
        languages: [],
        ndis_registered: false,
        registration_number: '',
        availability: {
          weekdays: false,
          weekends: false,
          evenings: false,
          emergencies: false,
        },
        // Participant-specific fields from onboarding
        preferred_name: '',
        main_goals: [],
        support_needs: [],
        accessibility_needs: [],
        comfort_preferences: [],
        interests: []
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
        base64: true, // Get base64 data for web compatibility
      });

      if (result.canceled) return;

      setUploadingBackground(true);
      
      // Get the image URI
      const imageUri = result.assets[0].uri;
      
      // Use the same iOS-compatible method as posts and profile avatars
      let base64Data;
      
      // Generate a unique filename
      let fileExt = 'jpg';
      if (Platform.OS === 'web' && imageUri.startsWith('data:image/')) {
        // Extract file extension from data URI mime type
        const mimeMatch = imageUri.match(/^data:image\/([^;]+);/);
        if (mimeMatch) {
          fileExt = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1];
        }
      } else {
        // Extract from file URI
        fileExt = imageUri.split('.').pop() || 'jpg';
      }
      const fileName = `background_${Date.now()}.${fileExt}`;
      const filePath = `user-backgrounds/${profile.id}/${fileName}`;
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      
      console.log('Background upload - preparing file:', fileName);
      
      try {
        if (Platform.OS === 'web') {
          // On web, check if we have base64 data from the picker result or extract from data URI
          if (result.assets[0].base64) {
            base64Data = result.assets[0].base64;
            console.log('Web - using base64 from picker result, length:', base64Data.length);
          } else if (imageUri.startsWith('data:image/')) {
            // Extract base64 data from data URI (remove "data:image/jpeg;base64," prefix)
            const base64Match = imageUri.match(/^data:image\/[^;]+;base64,(.+)$/);
            if (base64Match) {
              base64Data = base64Match[1];
              console.log('Web - extracted base64 from data URI, length:', base64Data.length);
            } else {
              throw new Error('Invalid data URI format');
            }
          } else {
            throw new Error('Web platform requires base64 data or data URI format');
          }
        } else {
          // Use expo-file-system to read the file (mobile platforms)
          base64Data = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          console.log('Mobile - read as base64, length:', base64Data.length);
        }
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
        
        // Provider-specific fields from onboarding
        business_name: profile.business_name || '',
        contact_name: profile.contact_name || '',
        provider_type: profile.provider_type || '',
        service_types: Array.isArray(profile.service_types) ? profile.service_types : [],
        service_areas: Array.isArray(profile.service_areas) ? profile.service_areas : [],
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        ndis_registered: profile.ndis_registered || false,
        registration_number: profile.registration_number || '',
        availability: typeof profile.availability === 'object' ? profile.availability : {
          weekdays: false,
          weekends: false,
          evenings: false,
          emergencies: false,
        },
        
        // Participant-specific fields from onboarding
        preferred_name: profile.preferred_name || '',
        main_goals: Array.isArray(profile.main_goals) ? profile.main_goals : [],
        support_needs: Array.isArray(profile.support_needs) ? profile.support_needs : [],
        accessibility_needs: Array.isArray(profile.accessibility_needs) ? profile.accessibility_needs : [],
        comfort_preferences: Array.isArray(profile.comfort_preferences) ? profile.comfort_preferences : [],
        interests: Array.isArray(profile.interests) ? profile.interests : [],
          
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
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.backgroundButtonText}>Change Background</Text>
                  </>
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
                  placeholderTextColor={COLORS.lightText}
                  value={profile.username ?? ''}
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
                placeholderTextColor={COLORS.lightText}
                value={profile.full_name ?? ''}
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
                placeholderTextColor={COLORS.lightText}
                value={profile.age != null ? String(profile.age) : ''}
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
                placeholderTextColor={COLORS.lightText}
                value={profile.address ?? ''}
                onChangeText={text => setProfile(p => ({ ...p, address: text }))}
                accessibilityLabel="Address input field"
              />
            </View>
            
            {/* Preferred Name field for participants */}
            {!isProvider && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Preferred Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="How would you like to be addressed?"
                  placeholderTextColor={COLORS.lightText}
                  value={profile.preferred_name ?? ''}
                  onChangeText={text => setProfile(p => ({ ...p, preferred_name: text }))}
                  accessibilityLabel="Preferred name input field"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell us about yourself"
                placeholderTextColor={COLORS.lightText}
                value={profile.bio ?? ''}
                onChangeText={text => setProfile(p => ({ ...p, bio: text }))}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Bio input field"
              />
            </View>
          </View>
          
          {/* Conditional sections based on user role */}
          {isProvider ? (
            /* Provider-specific sections */
            <>
              {/* Business Information */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Business/Service Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your business or service name"
                    placeholderTextColor={COLORS.lightText}
                    value={profile.business_name ?? ''}
                    onChangeText={text => setProfile(p => ({ ...p, business_name: text }))}
                    accessibilityLabel="Business name input field"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Primary contact person"
                    placeholderTextColor={COLORS.lightText}
                    value={profile.contact_name ?? ''}
                    onChangeText={text => setProfile(p => ({ ...p, contact_name: text }))}
                    accessibilityLabel="Contact name input field"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Provider Type</Text>
                  <View style={styles.optionsContainer}>
                    {PROVIDER_TYPES.map(option => (
                      <TouchableOpacity 
                        key={option.id}
                        style={[styles.optionButton, profile.provider_type === option.id && styles.optionButtonSelected]}
                        onPress={() => setProfile(p => ({ ...p, provider_type: option.id }))}
                        accessibilityLabel={`${option.label} provider type option`}
                      >
                        <Text 
                          style={[styles.optionText, profile.provider_type === option.id && styles.optionTextSelected]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Services & Qualifications */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Services & Qualifications</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Types</Text>
                  <Text style={styles.optionDescription}>Select all services you provide</Text>
                  <View style={styles.checkboxContainer}>
                    {SERVICE_TYPES.map(serviceType => {
                      const isSelected = profile.service_types?.includes(serviceType);
                      return (
                        <TouchableOpacity
                          key={serviceType}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(serviceType, 'service_types')}
                          accessibilityLabel={`${serviceType} service type option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{serviceType}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NDIS Registration</Text>
                  <TouchableOpacity
                    style={styles.switchRow}
                    onPress={() => setProfile(p => ({ ...p, ndis_registered: !p.ndis_registered }))}
                    accessibilityLabel="NDIS registration toggle"
                  >
                    <Text style={styles.switchLabel}>NDIS Registered Provider</Text>
                    <View style={[styles.switchTrack, profile.ndis_registered && styles.switchTrackActive]}>
                      <View style={[styles.switchThumb, profile.ndis_registered && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  
                  {profile.ndis_registered && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Registration Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your NDIS registration number"
                        placeholderTextColor={COLORS.lightText}
                        value={profile.registration_number ?? ''}
                        onChangeText={text => setProfile(p => ({ ...p, registration_number: text }))}
                        accessibilityLabel="NDIS registration number input field"
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Service Areas & Languages */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Service Areas & Languages</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Areas</Text>
                  <Text style={styles.optionDescription}>Select all areas you service</Text>
                  <View style={styles.checkboxContainer}>
                    {SERVICE_AREAS.map(area => {
                      const isSelected = profile.service_areas?.includes(area);
                      return (
                        <TouchableOpacity
                          key={area}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(area, 'service_areas')}
                          accessibilityLabel={`${area} service area option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{area}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Languages</Text>
                  <Text style={styles.optionDescription}>Select all languages you speak</Text>
                  <View style={styles.checkboxContainer}>
                    {LANGUAGES.map(language => {
                      const isSelected = profile.languages?.includes(language);
                      return (
                        <TouchableOpacity
                          key={language}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(language, 'languages')}
                          accessibilityLabel={`${language} language option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{language}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
              
              {/* Availability */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Availability</Text>
                <View style={styles.availabilityGrid}>
                  {[
                    { key: 'weekdays', label: 'Weekdays' },
                    { key: 'weekends', label: 'Weekends' },
                    { key: 'evenings', label: 'Evenings' },
                    { key: 'emergencies', label: 'Emergency' }
                  ].map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.availabilityCard,
                        profile.availability?.[item.key] && styles.selectedAvailability,
                      ]}
                      onPress={() => setProfile(p => ({
                        ...p,
                        availability: {
                          ...p.availability,
                          [item.key]: !p.availability?.[item.key]
                        }
                      }))}
                      accessibilityLabel={`${item.label} availability option`}
                    >
                      <Text style={[
                        styles.availabilityText,
                        profile.availability?.[item.key] && styles.selectedAvailabilityText,
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            /* Participant-specific sections */
            <>
              {/* NDIS Information */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>NDIS Information</Text>
                
                {/* NDIS Number field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NDIS Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your NDIS number"
                    placeholderTextColor={COLORS.lightText}
                    value={profile.ndis_number ?? ''}
                    onChangeText={text => setProfile(p => ({ ...p, ndis_number: text }))}
                    accessibilityLabel="NDIS number input field"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Primary Disability</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your primary disability"
                    placeholderTextColor={COLORS.lightText}
                    value={profile.primary_disability ?? ''}
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

              {/* Goals & Motivations */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Goals & Motivations</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Main Goals</Text>
                  <Text style={styles.optionDescription}>What brings you to our platform?</Text>
                  <View style={styles.checkboxContainer}>
                    {MAIN_GOALS.map(goal => {
                      const isSelected = profile.main_goals?.includes(goal.id);
                      return (
                        <TouchableOpacity
                          key={goal.id}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(goal.id, 'main_goals')}
                          accessibilityLabel={`${goal.label} main goal option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{goal.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Support Needs */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Support Needs</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Types of Support</Text>
                  <Text style={styles.optionDescription}>What kind of support are you looking for?</Text>
                  <View style={styles.checkboxContainer}>
                    {SUPPORT_NEEDS.map(need => {
                      const isSelected = profile.support_needs?.includes(need.id);
                      return (
                        <TouchableOpacity
                          key={need.id}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(need.id, 'support_needs')}
                          accessibilityLabel={`${need.label} support need option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{need.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Accessibility Needs (from onboarding) */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Accessibility Needs</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Specific Accessibility Requirements</Text>
                  <Text style={styles.optionDescription}>Select your specific accessibility needs</Text>
                  <View style={styles.checkboxContainer}>
                    {ACCESSIBILITY_NEEDS.map(need => {
                      const isSelected = profile.accessibility_needs?.includes(need.id);
                      return (
                        <TouchableOpacity
                          key={need.id}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(need.id, 'accessibility_needs')}
                          accessibilityLabel={`${need.label} accessibility need option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{need.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Comfort Preferences (from onboarding) */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Comfort Preferences</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Personal Preferences</Text>
                  <Text style={styles.optionDescription}>What makes you feel comfortable?</Text>
                  <View style={styles.checkboxContainer}>
                    {COMFORT_PREFERENCES.map(preference => {
                      const isSelected = profile.comfort_preferences?.includes(preference.id);
                      return (
                        <TouchableOpacity
                          key={preference.id}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(preference.id, 'comfort_preferences')}
                          accessibilityLabel={`${preference.label} comfort preference option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{preference.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Interests */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Interests & Hobbies</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Personal Interests</Text>
                  <Text style={styles.optionDescription}>What do you enjoy doing?</Text>
                  <View style={styles.checkboxContainer}>
                    {INTERESTS.map(interest => {
                      const isSelected = profile.interests?.includes(interest);
                      return (
                        <TouchableOpacity
                          key={interest}
                          style={styles.checkboxRow}
                          onPress={() => toggleMultiSelect(interest, 'interests')}
                          accessibilityLabel={`${interest} interest option`}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{interest}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}
          
          {/* Show accessibility sections for participants only */}
          {!isProvider && (
            <>
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
            </>
          )}
          
          <TouchableOpacity 
            style={[(saving || uploading) && styles.disabledButton]} 
            onPress={saveProfile} 
            disabled={saving || uploading}
            accessibilityLabel="Save profile button"
          >
            <LinearGradient
              colors={saving || uploading ? ['#8E8E93', '#8E8E93'] : [COLORS.primary, '#0051D5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 32,
    alignItems: 'center',
    paddingVertical: 20,
  },
  modernPicker: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  changePhotoText: {
    marginTop: 12,
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  backgroundUploadContainer: {
    marginTop: 16,
  },
  backgroundButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 20,
    backgroundColor: COLORS.sectionBg,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: COLORS.lightText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredField: {
    color: COLORS.error,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontWeight: '500',
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  checkboxLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
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
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  availabilityCard: {
    width: '48%',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 18,
    margin: '1%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedAvailability: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  availabilityText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  selectedAvailabilityText: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 30,
    marginBottom: 40,
    marginHorizontal: 20,
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  saveIcon: {
    marginRight: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
