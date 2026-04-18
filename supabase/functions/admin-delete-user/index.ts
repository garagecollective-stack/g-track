import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    const callerRole = callerProfile?.role
    if (callerRole !== 'super_admin' && callerRole !== 'director') {
      return json(req, { error: 'Access denied' }, 403)
    }

    const { userId } = await req.json()
    if (!userId) {
      return json(req, { error: 'userId is required' }, 400)
    }
    if (userId === caller.id) {
      return json(req, { error: 'You cannot delete your own account' }, 400)
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return json(req, { error: 'User not found' }, 404)
    }
    if (targetProfile.role === 'super_admin') {
      return json(req, { error: 'Super admin accounts cannot be deleted through this panel' }, 400)
    }
    if (callerRole === 'director' && targetProfile.role === 'director') {
      return json(req, { error: 'Directors cannot delete other director accounts' }, 403)
    }

    await Promise.allSettled([
      supabase.from('tasks').update({ assignee_id: null, assignee_name: null }).eq('assignee_id', userId),
      supabase.from('tasks').update({ created_by_id: null, created_by_name: null }).eq('created_by_id', userId),
      supabase.from('projects').update({ owner_id: null }).eq('owner_id', userId),
      supabase.from('project_members').delete().eq('user_id', userId),
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('todos').delete().eq('user_id', userId),
      supabase.from('overdue_alerts').delete().eq('alerted_to', userId),
      supabase.from('issues').delete().eq('raised_by', userId),
      supabase.from('issues').update({ resolved_by: null }).eq('resolved_by', userId),
      supabase.from('issue_replies').delete().eq('replied_by', userId),
      supabase.from('audit_logs').update({ performed_by: null }).eq('performed_by', userId),
      supabase.from('profile_managers').delete().eq('profile_id', userId),
      supabase.from('profile_managers').delete().eq('manager_id', userId),
    ])

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
    if (deleteErr) {
      throw deleteErr
    }

    return json(req, { success: true, deleted: userId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json(req, { error: message }, 400)
  }
})
