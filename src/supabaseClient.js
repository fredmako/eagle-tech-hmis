import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rzavtfppueiskmqkouti.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXZ0ZnBwdWVpc2ttcWtvdXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjQ0MzQsImV4cCI6MjA5NzAwMDQzNH0.X-DgLLTfUmqNiO1vdim4oJhhL18vWA3RnqZ4uIHb_ps';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enable Sandbox Mode if Supabase environment variables are not supplied
const isRealSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
supabase.isSandbox = !isRealSupabase;

export default supabase;
