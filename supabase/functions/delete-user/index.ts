import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify token
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', detail: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check caller is director
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'director') {
      return new Response(
        JSON.stringify({ error: 'Only directors can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up all FK references before deleting the auth user.
    // Run in parallel — errors are ignored (means no rows matched).
    await Promise.allSettled([
      // Nullify task assignments
      supabaseAdmin.from('tasks')
        .update({ assignee_id: null, assignee_name: null })
        .eq('assignee_id', userId),
      // Nullify task creator
      supabaseAdmin.from('tasks')
        .update({ created_by_id: null, created_by_name: null })
        .eq('created_by_id', userId),
      // Nullify project ownership
      supabaseAdmin.from('projects')
        .update({ owner_id: null })
        .eq('owner_id', userId),
      // Remove from project members
      supabaseAdmin.from('project_members')
        .delete()
        .eq('user_id', userId),
      // Delete notifications
      supabaseAdmin.from('notifications')
        .delete()
        .eq('user_id', userId),
      // Delete todos
      supabaseAdmin.from('todos')
        .delete()
        .eq('user_id', userId),
      // Delete overdue alerts
      supabaseAdmin.from('overdue_alerts')
        .delete()
        .eq('alerted_to', userId),
      // Delete issues raised by this user (raised_by is NOT NULL, can't nullify)
      supabaseAdmin.from('issues')
        .delete()
        .eq('raised_by', userId),
      // Nullify issue resolver
      supabaseAdmin.from('issues')
        .update({ resolved_by: null })
        .eq('resolved_by', userId),
      // Delete issue replies
      supabaseAdmin.from('issue_replies')
        .delete()
        .eq('replied_by', userId),
      // Nullify audit log actor
      supabaseAdmin.from('audit_logs')
        .update({ performed_by: null })
        .eq('performed_by', userId),
    ])

    // Now delete the auth user — cascades to profiles
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
