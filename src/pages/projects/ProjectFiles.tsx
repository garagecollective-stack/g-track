import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { FileUpload } from '../../shared/FileUpload'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { formatFileSize, getFileIcon, timeAgo, friendlyError } from '../../utils/helpers'
import type { ProjectFile } from '../../types'

interface Props { projectId: string }

export function ProjectFiles({ projectId }: Props) {
  const { currentUser } = useApp()
  const toast = useToast()
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null)

  const canWrite = currentUser?.role !== 'member'

  useEffect(() => {
    void fetchFiles()
  }, [projectId])

  const fetchFiles = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('project_files')
      .select('*, uploader:profiles!project_files_uploaded_by_fkey(name)')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  const handleUpload = async () => {
    if (newFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of newFiles) {
        const path = `${projectId}/${Date.now()}-${file.name}`
        const { error: uploadErr } = await supabase.storage.from('project-files').upload(path, file)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
        await supabase.from('project_files').insert({
          project_id: projectId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: currentUser?.id,
        })
      }
      toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded`)
      setNewFiles([])
      fetchFiles()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await supabase.from('project_files').delete().eq('id', deleteTarget.id)
    toast.success('File deleted')
    setDeleteTarget(null)
    fetchFiles()
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div>
          <FileUpload
            files={newFiles}
            onFiles={f => setNewFiles(prev => [...prev, ...f])}
            onRemove={i => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}
          />
          {newFiles.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary mt-3 disabled:opacity-70"
            >
              {uploading ? 'Uploading...' : `Upload ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-[var(--r-sm)]" />)}
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-[13px] text-[var(--ink-400)] py-10">No files uploaded yet</p>
        ) : (
          <ul className="divide-y divide-[var(--line-1)]">
            {files.map(f => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                <span className="text-xl shrink-0">{getFileIcon(f.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-[13px] font-medium text-[var(--ink-900)] hover:text-[var(--primary)] truncate block transition-colors">
                    {f.file_name}
                  </a>
                  <p className="text-[11px] text-[var(--ink-400)] mt-0.5 font-mono tabular-nums">
                    {formatFileSize(f.file_size)} <span className="font-sans">· {(f as any).uploader?.name || 'Unknown'} ·</span> {timeAgo(f.uploaded_at)}
                  </p>
                </div>
                {canWrite && (
                  <button onClick={() => setDeleteTarget(f)} className="p-1.5 text-[var(--ink-400)] hover:text-red-500 transition-colors shrink-0" aria-label="Delete file">
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${deleteTarget?.file_name}"?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
