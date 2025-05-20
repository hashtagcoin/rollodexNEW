import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://smtckdlpdfvdycocwoip.supabase.co';
// WARNING: THIS IS AN ANONYMOUS KEY AND IS SAFE TO BE PUBLICLY VISIBLE.
// DO NOT PUT SERVICE ROLE OR OTHER SECRET KEYS HERE.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGNrZGxwZGZ2ZHljb2N3b2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTA3MDgsImV4cCI6MjA1OTQ4NjcwOH0.TrR8QpN7wJLOLXNjgcOvdpQBDAJG1qDCMrypTkGqqYA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
