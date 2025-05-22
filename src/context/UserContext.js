import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Function to fetch user profile
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      // Cache the profile data
      await AsyncStorage.setItem('user_profile', JSON.stringify(data));
      setProfile(data);
      return data;
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
  
  // Function to update user profile
  const updateProfile = async (profileData) => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to update your profile');
      return false;
    }
    
    try {
      const updates = {
        ...profileData,
        id: user.id,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert(updates, { onConflict: ['id'] });
        
      if (error) {
        throw error;
      }
      
      // Update local state and cache
      const updatedProfile = { ...profile, ...profileData };
      setProfile(updatedProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Profile Update Failed', error.message || 'Could not update profile');
      return false;
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
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      
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
      
      // Add cache busting parameter
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      
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
