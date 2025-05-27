import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Function to fetch user profile from Supabase
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, username, full_name, avatar_url, bio, email, role, 
          ndis_number, primary_disability, support_level, 
          age, sex, address,
          mobility_aids, dietary_requirements, accessibility_preferences,
          comfort_traits, preferred_categories, preferred_service_formats,
          points, is_active, created_at, updated_at
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        console.log('User profile fetched successfully');
        // Cache the profile data
        await AsyncStorage.setItem('user_profile', JSON.stringify(data));
        setProfile(data);
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };
  
  // Initialize user data from Supabase and AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      
      try {
        // Try to get cached profile first for immediate UI display
        const cachedProfile = await AsyncStorage.getItem('user_profile');
        if (cachedProfile) {
          setProfile(JSON.parse(cachedProfile));
        }
        
        // Get current authenticated user
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting auth user:', error);
          setLoading(false);
          return;
        }
        
        if (authUser) {
          setUser(authUser);
          // Fetch fresh profile data (even if we have cached data)
          await fetchUserProfile(authUser.id);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        await AsyncStorage.removeItem('user_profile');
      }
    });
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);
  
  // Function to update avatar
  const updateAvatar = async (imageUri, mimeType) => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to update your avatar');
      return null;
    }
    
    try {
      console.log('Starting avatar upload for URI:', imageUri);
      
      // Create a unique filename
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      
      // Determine content type
      let contentType = mimeType || 'image/jpeg';
      if (fileExt === 'png') contentType = 'image/png';
      if (fileExt === 'gif') contentType = 'image/gif';
      
      console.log('Preparing to upload file:', fileName, 'Content type:', contentType);
      
      // Fetch the image data
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob created, size:', blob.size);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: contentType
        });
      
      console.log('Upload attempt completed');
        
      if (error) {
        console.error('Supabase storage upload error:', error);
        throw error;
      }
      
      console.log('Upload successful, getting public URL');
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('Public URL data:', publicUrlData);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Could not get public URL for avatar');
      }
      
      // Add cache busting parameter to prevent caching issues
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      console.log('Final avatar URL with cache busting:', avatarUrl);
      
      // Update user_profiles table
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
      
      console.log('Database updated successfully');
      
      // Update local state and cache
      const updatedProfile = { ...profile, avatar_url: avatarUrl };
      setProfile(updatedProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      
      console.log('Local state and cache updated');
      return avatarUrl;
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Avatar Update Failed', error.message || 'Could not update avatar');
      return null;
    }
  };
  
  // Function to check if a username is already taken
  const checkUsernameAvailability = async (username) => {
    try {
      // Skip check if username is unchanged
      if (profile && profile.username === username) {
        return { available: true };
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no data is returned, the username is available
      return { available: !data };
    } catch (error) {
      console.error('Error checking username availability:', error);
      return { available: false, error };
    }
  };
  
  // Function to update user profile with username validation
  const updateProfile = async (profileData) => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to update your profile');
      return { success: false, message: 'Not logged in' };
    }
    
    try {
      // Check if username is being changed
      if (profileData.username && (!profile.username || profile.username !== profileData.username)) {
        console.log('Username change detected, checking availability...');
        const { available, error } = await checkUsernameAvailability(profileData.username);
        
        if (error) {
          throw new Error('Could not verify username availability');
        }
        
        if (!available) {
          return { 
            success: false, 
            message: 'Username already taken. Please choose another one.',
            field: 'username'
          };
        }
        
        console.log('Username is available, proceeding with update');
      }
      
      // Prepare updates for user_profiles table
      const updates = {
        ...profileData,
        id: user.id,
        updated_at: new Date().toISOString(),
        // Ensure all the new fields are properly formatted
        age: profileData.age || null,
        sex: profileData.sex || null,
        address: profileData.address || '',
        ndis_number: profileData.ndis_number || '',
        primary_disability: profileData.primary_disability || '',
        support_level: profileData.support_level || '',
        mobility_aids: Array.isArray(profileData.mobility_aids) ? profileData.mobility_aids : [],
        dietary_requirements: Array.isArray(profileData.dietary_requirements) ? profileData.dietary_requirements : [],
        accessibility_preferences: typeof profileData.accessibility_preferences === 'object' ? profileData.accessibility_preferences : {},
        comfort_traits: Array.isArray(profileData.comfort_traits) ? profileData.comfort_traits : [],
        preferred_categories: Array.isArray(profileData.preferred_categories) ? profileData.preferred_categories : [],
        preferred_service_formats: Array.isArray(profileData.preferred_service_formats) ? profileData.preferred_service_formats : []
      };
      
      // Log the complete profile data being saved to verify all fields
      console.log('Saving complete profile data to Supabase:', {
        username: updates.username,
        full_name: updates.full_name,
        bio: updates.bio,
        age: updates.age,
        sex: updates.sex,
        address: updates.address,
        ndis_number: updates.ndis_number,
        primary_disability: updates.primary_disability,
        support_level: updates.support_level,
        mobility_aids: Array.isArray(updates.mobility_aids) ? updates.mobility_aids.length : 0,
        dietary_requirements: Array.isArray(updates.dietary_requirements) ? updates.dietary_requirements.length : 0,
        accessibility_preferences: updates.accessibility_preferences ? 'Set' : 'Not set',
        comfort_traits: Array.isArray(updates.comfort_traits) ? updates.comfort_traits.length : 0,
        preferred_categories: Array.isArray(updates.preferred_categories) ? updates.preferred_categories.length : 0,
        preferred_service_formats: Array.isArray(updates.preferred_service_formats) ? updates.preferred_service_formats.length : 0
      });
      
      // Update user_profiles table
      const { data: savedData, error: profileError } = await supabase
        .from('user_profiles')
        .upsert(updates, { onConflict: ['id'] })
        .select();
      
      if (profileError) throw profileError;
      
      // Verify the saved data
      console.log('Profile saved successfully. Received data:', savedData ? 'Data returned' : 'No data returned');
      
      // If username or full_name is changed, also update auth.users metadata
      if (profileData.username !== profile.username || profileData.full_name !== profile.full_name) {
        console.log('Updating auth user metadata...');
        const { error: authError } = await supabase.auth.updateUser({
          data: { 
            username: profileData.username,
            full_name: profileData.full_name
          }
        });
        
        if (authError) {
          console.error('Error updating auth metadata:', authError);
          // Continue anyway as profile was updated successfully
        }
      }
      
      // Update local state and cache with the actual saved data from Supabase
      // This ensures we're using exactly what was saved in the database
      const updatedProfile = savedData && savedData.length > 0 
        ? savedData[0] 
        : { ...profile, ...profileData };
        
      setProfile(updatedProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      
      return { 
        success: true, 
        data: updatedProfile  // Return the saved data for verification
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { 
        success: false, 
        message: error.message || 'Could not update profile', 
        error 
      };
    }
  };
  
  // New direct upload function for avatars that doesn't require fetching the image first
  const uploadAvatarDirectly = async (uri) => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to update your avatar');
      return null;
    }
    
    try {
      console.log('Starting direct avatar upload for URI:', uri);
      
      // Create a unique filename
      const fileExt = uri.split('.').pop() || 'jpg';
      // Use a standardized path format to prevent double slashes
      const fileName = `avatar/${user.id}_${Date.now()}.${fileExt}`;
      
      // Determine content type based on extension
      let contentType = 'image/jpeg';
      if (fileExt === 'png') contentType = 'image/png';
      if (fileExt === 'gif') contentType = 'image/gif';
      
      console.log('Direct upload - preparing file:', fileName);
      
      // Upload directly to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, {
          uri: uri
        }, {
          upsert: true,
          contentType: contentType
        });
      
      if (error) {
        console.error('Direct upload error:', error);
        throw error;
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('Direct upload - got public URL:', publicUrlData);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Could not get public URL for avatar');
      }
      
      // Clean the URL to ensure no double slashes and add cache busting
      let publicUrl = publicUrlData.publicUrl;
      // Replace any double slashes after the protocol
      publicUrl = publicUrl.replace(/(https?:\/\/)([^\/]*)\/\/+/g, '$1$2/');
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      console.log('Final avatar URL:', avatarUrl);
      
      // Update user_profiles table
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
      
      // Update local state and cache
      const updatedProfile = { ...profile, avatar_url: avatarUrl };
      setProfile(updatedProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      
      return avatarUrl;
    } catch (error) {
      console.error('Error in direct avatar upload:', error);
      Alert.alert('Avatar Update Failed', error.message || 'Could not update avatar');
      return null;
    }
  };
  
  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        loading,
        updateAvatar,
        updateProfile,
        uploadAvatarDirectly,
        refreshProfile: () => user && fetchUserProfile(user.id)
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
