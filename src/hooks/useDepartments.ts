import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Department } from '../types'
import { useApp } from '../context/AppContext'

export function useDepartments() {
  const { currentUser } = useApp()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('departments')
      .select('*')
      .order('name')
    if (err) setError(err.message)
    else setDepartments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDepartments() }, [fetchDepartments])

  const createDepartment = async (data: Partial<Department>) => {
    const { error: err } = await supabase.from('departments').insert(data)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Department created',
      target_type: 'department',
      target_name: data.name,
    })
    await fetchDepartments()
  }

  const updateDepartment = async (id: string, data: Partial<Department>) => {
    const { error: err } = await supabase.from('departments').update(data).eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Department updated',
      target_type: 'department',
      target_id: id,
      target_name: data.name,
    })
    await fetchDepartments()
  }

  const deleteDepartment = async (id: string, name?: string) => {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id)
      .eq('is_archived', false)
    if ((count || 0) > 0) throw new Error('Archive or reassign all projects first')

    const { error: err } = await supabase.from('departments').delete().eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Department deleted',
      target_type: 'department',
      target_id: id,
      target_name: name,
    })
    await fetchDepartments()
  }

  return { departments, loading, error, fetchDepartments, createDepartment, updateDepartment, deleteDepartment }
}
