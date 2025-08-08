// This module previously provided auto-login functionality
// Now it's disabled to require explicit login
import { useEffect } from 'react';
import { supabase } from './supabaseClient';

// Default user credentials have been moved to config/defaultUser.js

export function useAutoSupabaseLogin() {
  // Auto login is now disabled - explicit login is required
  useEffect(() => {
    // No auto-login functionality here anymore
    return () => {};
  }, []);
}
