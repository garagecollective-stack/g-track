import { useState, useEffect, useCallback } from 'react'
import { db } from '../../lib/supabaseAdmin'
import type { Department } from '../../types'

export interface DeptPayload {
  name:            string
  color:           string
  icon?:           string
  department_head: string | null
}

export function useAdminDepts() {
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDepts = useCallback(async () => {
    setLoading(true)
    const { data } = await db
      .from('departments')
      .select('*')
      .order('name')
    setDepts((data as Department[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDepts() }, [fetchDepts])

  const createDept = async (payload: DeptPayload) => {
    const { error } = await db.from('departments').insert({
      name:            payload.name,
      color:           payload.color,
      icon:            payload.icon || 'briefcase',
      department_head: payload.department_head || null,
    })
    if (error) throw error
    await fetchDepts()
  }

  const updateDept = async (id: string, payload: Partial<DeptPayload>) => {
    const { error } = await db.from('departments').update(payload).eq('id', id)
    if (error) throw error
    await fetchDepts()
  }

  const deleteDept = async (id: string) => {
    const { error } = await db.from('departments').delete().eq('id', id)
    if (error) throw error
    await fetchDepts()
  }

  return { depts, loading, fetchDepts, createDept, updateDept, deleteDept }
}
