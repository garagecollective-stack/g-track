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
    fetchFiles()
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
              className="mt-3 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70"
            >
              {uploading ? 'Uploading...' : `Upload ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No files uploaded yet</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {files.map(f => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl shrink-0">{getFileIcon(f.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-[#0A5540] truncate block">
                    {f.file_name}
                  </a>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(f.file_size)} · {(f as any).uploader?.name || 'Unknown'} · {timeAgo(f.uploaded_at)}
                  </p>
                </div>
                {canWrite && (
                  <button onClick={() => setDeleteTarget(f)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={15} />
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
