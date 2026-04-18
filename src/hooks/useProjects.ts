import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import { useApp } from '../context/AppContext'

export function useProjects() {
  const {
    currentUser,
    projects,
    setProjects,
    projectsLoading: loading,
    projectsError: error,
    fetchProjects,
  } = useApp()

  const createProject = useCallback(async (data: Partial<Project> & { memberIds?: string[]; files?: File[] }) => {
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
      const failed: string[] = []
      for (const file of files) {
        const path = `${inserted.id}/${Date.now()}-${file.name}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('project-files')
          .upload(path, file)
        if (uploadErr || !uploadData) {
          failed.push(file.name)
          continue
        }
        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
        const { error: insertErr } = await supabase.from('project_files').insert({
          project_id: inserted.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: currentUser?.id,
        })
        if (insertErr) failed.push(file.name)
      }
      if (failed.length > 0) {
        throw new Error(`Project created, but these files failed to upload: ${failed.join(', ')}`)
      }
    }

    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project created',
      target_type: 'project',
      target_id: inserted.id,
      target_name: inserted.name,
    })

    // Refetch to get the full joined project (owner + members)
    await fetchProjects()
    return inserted
  }, [currentUser, fetchProjects])

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    const { error: err } = await supabase.from('projects').update(data).eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project updated',
      target_type: 'project',
      target_id: id,
      target_name: data.name,
    })
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }, [currentUser, setProjects])

  const deleteProject = useCallback(async (id: string, name?: string) => {
    const { error: err } = await supabase.from('projects').delete().eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project deleted',
      target_type: 'project',
      target_id: id,
      target_name: name,
    })
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [currentUser, setProjects])

  const archiveProject = useCallback(async (id: string, name?: string) => {
    const { error: err } = await supabase.from('projects').update({ is_archived: true }).eq('id', id)
    if (err) throw err
    await supabase.from('audit_logs').insert({
      performed_by: currentUser?.id,
      action: 'Project archived',
      target_type: 'project',
      target_id: id,
      target_name: name,
    })
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [currentUser, setProjects])

  return { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject, archiveProject }
}
