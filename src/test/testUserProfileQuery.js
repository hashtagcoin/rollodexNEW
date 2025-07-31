import { supabase } from '../lib/supabaseClient';

// Test function to diagnose the user_profiles query issue
const testUserProfileQuery = async (userId) => {
  console.log('Testing user profile query for user:', userId);
  
  // Test 1: Simple query with just id
  try {
    console.log('\nTest 1: Simple query with just id');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error in simple query:', error);
    } else {
      console.log('Success! Data:', data);
    }
  } catch (e) {
    console.error('Exception in simple query:', e);
  }
  
  // Test 2: Query with basic fields
  try {
    console.log('\nTest 2: Query with basic fields');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error in basic fields query:', error);
    } else {
      console.log('Success! Data:', data);
    }
  } catch (e) {
    console.error('Exception in basic fields query:', e);
  }
  
  // Test 3: Query with all fields (one line)
  try {
    console.log('\nTest 3: Query with all fields in one line');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url, background_url, bio, email, role, ndis_number, primary_disability, support_level, age, sex, address, mobility_aids, dietary_requirements, accessibility_preferences, comfort_traits, preferred_categories, preferred_service_formats, points, is_active, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error in full query:', error);
    } else {
      console.log('Success! Data:', data);
    }
  } catch (e) {
    console.error('Exception in full query:', e);
  }
  
  // Test 4: Query fields one by one to find problematic field
  const fields = [
    'id', 'username', 'full_name', 'avatar_url', 'background_url', 
    'bio', 'email', 'role', 'ndis_number', 'primary_disability', 
    'support_level', 'age', 'sex', 'address', 'mobility_aids', 
    'dietary_requirements', 'accessibility_preferences', 'comfort_traits', 
    'preferred_categories', 'preferred_service_formats', 'points', 
    'is_active', 'created_at', 'updated_at'
  ];
  
  console.log('\nTest 4: Testing each field individually');
  for (const field of fields) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(field)
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error(`Field '${field}' - ERROR:`, error.message);
      } else {
        console.log(`Field '${field}' - OK`);
      }
    } catch (e) {
      console.error(`Field '${field}' - EXCEPTION:`, e.message);
    }
  }
};

export default testUserProfileQuery;