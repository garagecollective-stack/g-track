import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import { useApp } from '../context/AppContext'

export function useProjects() {
  const { currentUser } = useApp()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(id, name, email, role, department),
          members:project_members(user:profiles(id, name, email, role, department))
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (err) throw err

      const formatted = (data || []).map(p => ({
        ...p,
        members: p.members?.map((m: { user: unknown }) => m.user) || [],
      }))
      setProjects(formatted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchProjects()

    const channel = supabase
      .channel(`projects-rt-${currentUser?.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
        const newProject = payload.new as Project
        // Only add non-archived projects (respects the same filter as fetchProjects)
        if (newProject.is_archived) return
        setProjects(prev => prev.find(p => p.id === newProject.id) ? prev : [newProject, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
        const updated = payload.new as Project
        if (updated.is_archived) {
          // Archived project — remove from the list
          setProjects(prev => prev.filter(p => p.id !== updated.id))
        } else {
          // Merge updated fields, preserving joined owner/members from existing state
          setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [fetchProjects])

  const createProject = async (data: Partial<Project> & { memberIds?: string[]; files?: File[] }) => {
    const { memberIds, files, ...projectData } = data
    const { data: inserted, error: err } = await supabase
      .from('projects')
      .insert({ ...projectData, owner_id: currentUser?.id })
      .select()
      .single()
    if (err) throw err

    if (memberIds && memberIds.length > 0) {
      const allIds = [...new Set([currentUser?.id, ...memberIds].filter(Boolean))]
      await supabase.from('project_members').insert(
        allIds.map(uid => ({ project_id: inserted.id, user_id: uid }))
      )
    }

    if (files && files.length > 0) {
      for (const file of files) {
        const path = `${inserted.id}/${Date.now()}-${file.name}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('project-files')
          .upload(path, file)
        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
          await supabase.from('project_files').insert({
            project_id: inserted.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: currentUser?.id,
          })
        }
      }
    }

    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project created',
      target_type: 'project',
      target_id: inserted.id,
      target_name: inserted.name,
    })

    // Real-time INSERT event handles state update
    return inserted
  }

  const updateProject = async (id: string, data: Partial<Project>) => {
    const { error: err } = await supabase.from('projects').update(data).eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project updated',
      target_type: 'project',
      target_id: id,
      target_name: data.name,
    })
    // Real-time UPDATE event handles state update
  }

  const deleteProject = async (id: string, name?: string) => {
    const { error: err } = await supabase.from('projects').delete().eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project deleted',
      target_type: 'project',
      target_id: id,
      target_name: name,
    })
    // Real-time DELETE event handles state update
  }

  const archiveProject = async (id: string, name?: string) => {
    const { error: err } = await supabase.from('projects').update({ is_archived: true }).eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project archived',
      target_type: 'project',
      target_id: id,
      target_name: name,
    })
    // Real-time UPDATE event (is_archived: true) removes the project from state
  }

  return { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject, archiveProject }
}
