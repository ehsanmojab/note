import { createClient } from '@supabase/supabase-js'

export interface Note {
  id: string
  user_id: string
  title: string
  content: string // Stored as a serialized Tiptap document JSON string
  created_at: string
  updated_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase Configuration Missing] Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or GitHub repository variables.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
