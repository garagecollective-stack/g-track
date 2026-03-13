import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

/**
 * AUTH client — always uses the anon key.
 * `signInWithPassword` must use the anon key; the service_role key is a
 * server-side secret and GoTrue will reject or misbehave if it is sent as the
 * api-key during a password sign-in flow.
 *
 * Session is stored under "gtrack-admin-auth" so it never collides with the
 * main app's session (which uses the default Supabase storage key).
 */
export const supabaseAdminAuth = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  anonKey     || 'placeholder-key',
  {
    auth: {
      storageKey:          'gtrack-admin-auth',
      autoRefreshToken:    true,
      persistSession:      true,
      detectSessionInUrl:  false,
    },
  }
)

/**
 * DATA client — uses the service_role key when available.
 * Bypasses RLS entirely; safe for admin CRUD and auth.admin.* API calls.
 * No session persistence — this client is stateless.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceKey  || anonKey || 'placeholder-key',
  {
    auth: {
      storageKey:         'gtrack-admin-data',
      autoRefreshToken:   false,
      persistSession:     false,
      detectSessionInUrl: false,
    },
  }
)

export const hasServiceRole = !!serviceKey
