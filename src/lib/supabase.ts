import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Nur öffentliche Schlüssel! Der Service-Role-/Secret-Key gehört nie ins Frontend.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseKonfiguriert = Boolean(url && key)

export const supabase = createClient<Database>(url ?? 'http://127.0.0.1:54321', key ?? 'fehlt', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export const FOTO_BUCKET = 'report-photos'
