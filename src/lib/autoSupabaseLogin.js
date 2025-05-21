// This module ensures the app is always authenticated as the default user (sarahconor@gmail.com)
import { useEffect } from 'react';
import { supabase } from './supabaseClient';

const DEFAULT_EMAIL = 'sarahconor@gmail.com';
const DEFAULT_PASSWORD = '123456';

export function useAutoSupabaseLogin() {
  useEffect(() => {
    let isMounted = true;
    async function ensureLoggedIn() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not logged in, sign in
        await supabase.auth.signInWithPassword({
          email: DEFAULT_EMAIL,
          password: DEFAULT_PASSWORD,
        });
      }
    }
    ensureLoggedIn();
    return () => { isMounted = false; };
  }, []);
}
