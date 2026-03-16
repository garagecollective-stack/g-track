import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    if (callerProfile?.role !== 'super_admin' && callerProfile?.role !== 'director') {
      return json({ error: 'Access denied: director role required' }, 403)
    }

    // ── 3. Validate payload ─────────────────────────────────────────
    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId is required' }, 400)

    // Prevent super admin from deleting their own account
    if (userId === caller.id) {
      return json({ error: 'You cannot delete your own super admin account' }, 400)
    }

    // Prevent deleting other super_admin accounts
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', userId)
      .single()

    if (targetProfile?.role === 'super_admin') {
      return json({ error: 'Super admin accounts cannot be deleted through this panel' }, 400)
    }

    // ── 4. Delete auth user ─────────────────────────────────────────
    // The ON DELETE CASCADE FK constraint automatically removes the
    // corresponding public.profiles row when the auth.users row is deleted.
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
    if (deleteErr) throw deleteErr

    return json({ success: true, deleted: userId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 400)
  }
})
