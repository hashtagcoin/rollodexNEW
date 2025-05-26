import { supabase } from '../lib/supabaseClient';

/**
 * Get the current authenticated user's profile
 * @returns {Promise<Object|null>} The user profile or null if not authenticated
 */
export const getUserProfile = async () => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Get the user's profile from the user_profiles table
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error.message);
      return null;
    }
    
    return { ...profile, id: user.id };
  } catch (error) {
    console.error('Error in getUserProfile:', error.message);
    return null;
  }
};

/**
 * Get a user profile by ID
 * @param {string} userId - The user ID to look up
 * @returns {Promise<Object|null>} The user profile or null if not found
 */
export const getUserProfileById = async (userId) => {
  try {
    if (!userId) return null;
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user profile by ID:', error.message);
      return null;
    }
    
    return { ...profile, id: userId };
  } catch (error) {
    console.error('Error in getUserProfileById:', error.message);
    return null;
  }
};
