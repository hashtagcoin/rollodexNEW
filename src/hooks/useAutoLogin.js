import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Default user credentials have been moved to config/defaultUser.js

export function useAutoLogin() {
  // Auto login is now disabled - explicit login is required
  useEffect(() => {
    // No auto-login functionality here anymore
    return () => {};
  }, []);
}
