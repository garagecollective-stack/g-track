import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useToast } from '../../hooks/useToast'
import { friendlyError } from '../../utils/helpers'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

interface Props { projectId: string; sop: string | null }

export function ProjectSOP({ projectId, sop }: Props) {
  const { currentUser } = useApp()
  const { updateProject } = useProjects()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(sop || '')
  const [saving, setSaving] = useState(false)

  const canEdit = currentUser?.role !== 'member'

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProject(projectId, { sop: value || null })
      toast.success('SOP updated')
      setEditing(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Standard Operating Procedure</h3>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={10}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 resize-vertical"
            placeholder="Enter step-by-step operating procedure..."
          />
          <div className="flex justify-end gap-3 mt-3">
            <button onClick={() => { setEditing(false); setValue(sop || '') }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70">
              {saving && <LoadingSpinner size="sm" color="white" />} Save
            </button>
          </div>
        </div>
      ) : sop ? (
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{sop}</pre>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          No SOP defined yet.{canEdit && ' Click Edit to add one.'}
        </p>
      )}
    </div>
  )
}
