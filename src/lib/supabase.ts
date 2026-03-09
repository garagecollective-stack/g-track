import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate env vars so we get a clear error instead of a cryptic crash
if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_project_url') {
  console.error(
    '[G-Track] Supabase is not configured.\n' +
    'Create a .env.local file in the project root with:\n\n' +
    '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
    'Then restart the dev server.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
)

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseKey &&
  supabaseUrl !== 'your_project_url' &&
  supabaseUrl.startsWith('https://')
