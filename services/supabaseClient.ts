import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "https://eetnhlivihfshxtpaodd.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldG5obGl2aWhmc2h4dHBhb2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjkzODAsImV4cCI6MjA5MjYwNTM4MH0.QyCDGlz3ITIWp2o_jhL8UlD_Z5pYSmxn7m3so5GOeUk";

// Normalize URL - strip /rest/v1/ if the user accidentally included it
const supabaseUrl = rawUrl?.replace(/\/rest\/v1\/?$/, '');

// Only initialize if we have the required variables
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

if (!supabase) {
  console.warn('Supabase initialization failed. VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing', 'VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Found' : 'Missing');
}
