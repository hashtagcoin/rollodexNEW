import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_EMAIL = 'sarahconor@gmail.com';
const DEFAULT_PASSWORD = '123456';

export function useAutoLogin() {
  useEffect(() => {
    let isMounted = true;
    
    async function login() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isMounted) {
          await supabase.auth.signInWithPassword({
            email: DEFAULT_EMAIL,
            password: DEFAULT_PASSWORD,
          });
        }
      } catch (error) {
        console.error('Auto-login error:', error);
      }
    }

    login();
    return () => { isMounted = false; };
  }, []);
}
