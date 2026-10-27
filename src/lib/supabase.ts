import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Note {
  id: string
  user_id: string
  title: string
  content: string // Stored as a serialized Tiptap document JSON string
  is_deleted?: boolean
  created_at: string
  updated_at: string
}

// 1. Read build-time environment variables
let envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
let envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// 2. Fallback to localStorage if build-time variables were not yet configured
if (!envUrl && typeof localStorage !== 'undefined') {
  envUrl = (localStorage.getItem('custom_supabase_url') || '').trim()
}
if (!envKey && typeof localStorage !== 'undefined') {
  envKey = (localStorage.getItem('custom_supabase_anon_key') || '').trim()
}

export const isSupabaseConfigured = Boolean(envUrl && envKey)

// Fallback URL and Key to prevent createClient from throwing an uncaught exception on startup
const safeUrl = isSupabaseConfigured ? envUrl : 'https://placeholder.supabase.co'
const safeKey = isSupabaseConfigured ? envKey : 'placeholder-anon-key'

export let supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function updateSupabaseConfig(url: string, key: string) {
  const cleanUrl = url.trim()
  const cleanKey = key.trim()
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('custom_supabase_url', cleanUrl)
    localStorage.setItem('custom_supabase_anon_key', cleanKey)
  }
  supabase = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
