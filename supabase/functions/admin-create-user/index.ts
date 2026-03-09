import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // ── 3. Validate payload ─────────────────────────────────────────
    const { name, email, password, role, department, manager_id } = await req.json()

    if (!name?.trim())     return json({ error: 'name is required' }, 400)
    if (!email?.trim())    return json({ error: 'email is required' }, 400)
    if (!password?.trim()) return json({ error: 'password is required' }, 400)

    const allowedRoles = ['director', 'teamLead', 'member']
    const targetRole   = allowedRoles.includes(role) ? role : 'member'

    // ── 4. Create Supabase auth user ────────────────────────────────
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), department: department || null },
    })

    if (createErr) throw createErr

    // ── 5. Insert profile row ───────────────────────────────────────
    // ON DELETE CASCADE means deleting the auth user will auto-delete this row.
    const { error: profileErr } = await supabase.from('profiles').insert({
      id:         authData.user.id,
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      role:       targetRole,
      department: department?.trim() || null,
      manager_id: manager_id || null,
      is_active:  true,
    })

    if (profileErr) {
      // Rollback: remove the auth user so we don't leave orphaned auth records
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileErr
    }

    return json(
      { user: { id: authData.user.id, email: authData.user.email, name, role: targetRole, department } },
      201,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 400)
  }
})
