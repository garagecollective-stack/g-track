import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, Role } from '../types'
import { useApp } from '../context/AppContext'

export function useTeam() {
  const { currentUser } = useApp()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('name')
      if (err) throw err

      // Fetch manager relationships — silently ignored if table doesn't exist yet
      const { data: managersData } = await supabase
        .from('profile_managers')
        .select('profile_id, manager_id')

      const managersMap = new Map<string, string[]>()
      if (managersData) {
        for (const row of managersData as any[]) {
          const existing = managersMap.get(row.profile_id) || []
          managersMap.set(row.profile_id, [...existing, row.manager_id])
        }
      }

      const profiles = (data || []).map((u: any) => ({
        ...u,
        manager_ids: managersMap.get(u.id) || [],
      }))
      setMembers(profiles)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const updateUserRole = async (userId: string, role: Role, targetName?: string) => {
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (err) throw err
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Role Updated',
      message: `Your role has been changed to ${role}`,
      type: 'general',
    })
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Role changed',
      target_type: 'user',
      target_id: userId,
      target_name: targetName,
      details: { new_role: role },
    })
    await fetchMembers()
  }

  const updateUserDept = async (userId: string, department: string, targetName?: string) => {
    const { error: err } = await supabase.from('profiles').update({ department }).eq('id', userId)
    if (err) throw err
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Department Updated',
      message: `Your department has been changed to ${department}`,
      type: 'general',
    })
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Department changed',
      target_type: 'user',
      target_id: userId,
      target_name: targetName,
      details: { new_department: department },
    })
    await fetchMembers()
  }

  const updateUserManagers = async (userId: string, managerIds: string[], targetName?: string) => {
    // Replace all manager assignments atomically
    const { error: delErr } = await supabase
      .from('profile_managers')
      .delete()
      .eq('profile_id', userId)
    if (delErr) throw delErr

    if (managerIds.length > 0) {
      const { error: insErr } = await supabase
        .from('profile_managers')
        .insert(managerIds.map(mid => ({ profile_id: userId, manager_id: mid })))
      if (insErr) throw insErr
    }

    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Reporting managers updated',
      target_type: 'user',
      target_id: userId,
      target_name: targetName,
      details: { manager_ids: managerIds },
    })
    await fetchMembers()
  }

  const deactivateUser = async (userId: string, targetName?: string) => {
    const { error: err } = await supabase.from('profiles').update({ is_active: false }).eq('id', userId)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'User deactivated',
      target_type: 'user',
      target_id: userId,
      target_name: targetName,
    })
    await fetchMembers()
  }

  const reactivateUser = async (userId: string, targetName?: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error: err } = await supabase.functions.invoke('admin-update-user', {
      body: { userId, is_active: true },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    if (err || data?.error) throw new Error(err?.message || data?.error)
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'User reactivated',
      target_type: 'user',
      target_id: userId,
      target_name: targetName,
    })
    await fetchMembers()
  }

  const deleteUser = async (userId: string, targetName?: string) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData?.session?.access_token) {
      throw new Error('No active session found. Please log in again.')
    }
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId }),
      }
    )
    const data = await response.json()
    if (!response.ok || data?.error) throw new Error(data?.error || `HTTP ${response.status}`)
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'User deleted',
      target_type: 'user',
      target_id: userId,
      target_name: targetName,
    })
    await fetchMembers()
  }

  const inviteUser = async (name: string, email: string, department: string, role: string) => {
    const { error: err } = await supabase.auth.admin?.inviteUserByEmail(email, {
      data: { name, department, role },
    })
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'User invited',
      target_type: 'user',
      target_name: name,
      details: { email, department, role },
    })
  }

  return { members, loading, error, fetchMembers, updateUserRole, updateUserDept, updateUserManagers, deactivateUser, reactivateUser, deleteUser, inviteUser }
}
