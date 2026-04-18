import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
const EMAIL_REDIRECT_TO = Deno.env.get('APP_AUTH_CALLBACK_URL') ?? `${SITE_URL}/auth/callback`

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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(token)
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

    const { name, email, role, department, manager_id } = await req.json()

    if (!name?.trim()) return json(req, { error: 'name is required' }, 400)
    if (!email?.trim()) return json(req, { error: 'email is required' }, 400)

    const normalizedEmail = email.trim().toLowerCase()
    const targetRole = String(role ?? 'member')
    if (!ROLE_POLICY[callerRole].has(targetRole)) {
      return json(req, { error: `Cannot assign role "${targetRole}"` }, 403)
    }

    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: EMAIL_REDIRECT_TO,
        data: {
          name: name.trim(),
          department: department?.trim() || null,
          role: targetRole,
        },
      },
    )

    if (inviteErr || !inviteData.user) {
      throw inviteErr ?? new Error('Failed to create invited user')
    }

    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: inviteData.user.id,
      name: name.trim(),
      email: normalizedEmail,
      role: targetRole,
      department: department?.trim() || null,
      manager_id: manager_id || null,
      is_active: true,
      invited_by: caller.id,
    })

    if (profileErr) {
      await supabase.auth.admin.deleteUser(inviteData.user.id)
      throw profileErr
    }

    return json(req, {
      user: {
        id: inviteData.user.id,
        email: inviteData.user.email,
        name: name.trim(),
        role: targetRole,
        department: department?.trim() || null,
      },
    }, 201)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json(req, { error: message }, 400)
  }
})
