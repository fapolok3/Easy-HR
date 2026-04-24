import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if we have the required variables
// This prevents "supabaseUrl is required" error during startup
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any; // Cast to any to avoid type errors in consuming code, though we should check for null

if (!supabase) {
  console.warn('Supabase URL or Anon Key is missing. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment settings.');
}
