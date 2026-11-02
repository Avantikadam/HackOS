import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://hpzvxuyjkgisdrbhcrus.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwenZ4dXlqa2dpc2RyYmhjcnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzgyNTksImV4cCI6MjEwOTAxNDI1OX0.GY6LA9k90ZPktkq8QdGrl5kNdCM-hI7eWkZzMMb4MFc'

// Vite statically replaces import.meta.env.<KEY> at build time
const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
