import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Fields from public.profiles that a super_admin is allowed to update
const ALLOWED_FIELDS = new Set(['name', 'role', 'department', 'manager_id', 'is_active'])

// Roles that may be assigned to regular users (super_admin is not assignable)
const ALLOWED_ROLES = new Set(['director', 'teamLead', 'member'])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    // ── 1. Authenticate caller ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: caller }, error: callerErr } =
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (callerErr || !caller) return json({ error: 'Invalid or expired token' }, 401)

    // ── 2. Verify super_admin role ──────────────────────────────────
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return json({ error: 'Access denied: super_admin role required' }, 403)
    }

    // ── 3. Parse and validate payload ───────────────────────────────
    const body = await req.json()
    const { userId, ...rawUpdates } = body

    if (!userId) return json({ error: 'userId is required' }, 400)

    // Whitelist fields to prevent privilege escalation
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_FIELDS.has(key)) updates[key] = value
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: 'No valid fields provided' }, 400)
    }

    // Validate role if being changed
    if ('role' in updates && !ALLOWED_ROLES.has(updates.role as string)) {
      return json({ error: `Invalid role: "${updates.role}". Must be director, teamLead, or member` }, 400)
    }

    // ── 4. Prevent modifying super_admin accounts ───────────────────
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetProfile?.role === 'super_admin') {
      return json({ error: 'Super admin accounts cannot be modified through this panel' }, 400)
    }

    // ── 5. Apply profile update ─────────────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (updateErr) throw updateErr
    if (!updated)  return json({ error: 'User not found' }, 404)

    return json({ user: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 400)
  }
})
