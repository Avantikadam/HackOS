import { createClient } from '@supabase/supabase-js'

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {}

const supabaseUrl = (env.VITE_SUPABASE_URL || 'https://mock.supabase.co') as string
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || 'mock-key') as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

