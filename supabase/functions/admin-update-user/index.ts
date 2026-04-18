import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_FIELDS = new Set(['name', 'role', 'department', 'manager_id', 'is_active'])
const ROLE_POLICY = {
  super_admin: new Set(['director', 'teamLead', 'member']),
  director: new Set(['teamLead', 'member']),
} as const

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json(req, { error: 'Missing Authorization header' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (callerErr || !caller) {
      return json(req, { error: 'Invalid or expired token' }, 401)
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    const callerRole = callerProfile?.role as 'super_admin' | 'director' | undefined
    if (!callerRole || !(callerRole in ROLE_POLICY)) {
      return json(req, { error: 'Access denied' }, 403)
    }

    const body = await req.json()
    const { userId, ...rawUpdates } = body
    if (!userId) {
      return json(req, { error: 'userId is required' }, 400)
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const targetRole = targetProfile?.role
    if (!targetRole) {
      return json(req, { error: 'User not found' }, 404)
    }
    if (targetRole === 'super_admin') {
      return json(req, { error: 'Super admin accounts cannot be modified through this panel' }, 400)
    }
    if (callerRole === 'director' && targetRole === 'director') {
      return json(req, { error: 'Directors cannot modify other director accounts' }, 403)
    }

    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return json(req, { error: 'No valid fields provided' }, 400)
    }

    if ('role' in updates) {
      const requestedRole = String(updates.role)
      if (!ROLE_POLICY[callerRole].has(requestedRole)) {
        return json(req, { error: `Cannot assign role "${requestedRole}"` }, 403)
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (updateErr) {
      throw updateErr
    }

    return json(req, { user: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json(req, { error: message }, 400)
  }
})
