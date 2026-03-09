/**
 * Deletes all Supabase auth users except super_admin.
 * Reads credentials from .env.local — no copy-pasting needed.
 *
 * Run from the project root:
 *   node scripts/delete-users.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Read .env.local ──────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL      = env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// ── Admin client ─────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Find super_admin IDs to keep ────────────────────────────────────────────
const { data: admins } = await supabase
  .from('profiles')
  .select('id')
  .eq('role', 'super_admin')

const adminIds = new Set((admins ?? []).map(a => a.id))

// ── List all auth users ──────────────────────────────────────────────────────
const { data: { users: allUsers }, error: fetchError } = await supabase.auth.admin.listUsers({
  perPage: 1000,
})

if (fetchError) {
  console.error('Failed to fetch users:', fetchError.message)
  process.exit(1)
}

const toDelete = allUsers.filter(u => !adminIds.has(u.id))

if (!toDelete.length) {
  console.log('No users to delete.')
  process.exit(0)
}

console.log(`\nFound ${toDelete.length} user(s) to delete:\n`)
toDelete.forEach(u => console.log(`  • ${u.email}`))
console.log()

// ── Delete each user ─────────────────────────────────────────────────────────
let deleted = 0
let failed  = 0

for (const user of toDelete) {
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    console.error(`  ❌  ${user.email} — ${error.message}`)
    failed++
  } else {
    console.log(`  ✓   ${user.email}`)
    deleted++
  }
}

console.log(`\nDone. ${deleted} deleted, ${failed} failed.\n`)
