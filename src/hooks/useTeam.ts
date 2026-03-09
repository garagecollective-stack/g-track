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
      setMembers(data || [])
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
      message: `Your role has been changed to ${role}`,
      type: 'role_change',
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
      message: `Your department has been changed to ${department}`,
      type: 'department_change',
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
    const { error: err } = await supabase.from('profiles').update({ is_active: true }).eq('id', userId)
    if (err) throw err
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
    // Delete profile (auth user deletion requires admin API, profile cascade will clean up)
    const { error: err } = await supabase.from('profiles').delete().eq('id', userId)
    if (err) throw err
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

  return { members, loading, error, fetchMembers, updateUserRole, updateUserDept, deactivateUser, reactivateUser, deleteUser, inviteUser }
}
