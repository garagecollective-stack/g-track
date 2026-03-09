import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useDepartments } from '../hooks/useDepartments'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import { COLOR_SWATCHES, ICON_OPTIONS } from '../constants'
import type { Department } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  department?: Department | null
}

export function CreateDepartmentModal({ open, onClose, department }: Props) {
  const { createDepartment, updateDepartment } = useDepartments()
  const toast = useToast()
  const isEdit = !!department
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', color: COLOR_SWATCHES[0], icon: ICON_OPTIONS[0] })

  useEffect(() => {
    if (department) setForm({ name: department.name, color: department.color, icon: department.icon })
    else setForm({ name: '', color: COLOR_SWATCHES[0], icon: ICON_OPTIONS[0] })
  }, [department, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) await updateDepartment(department!.id, form)
      else await createDepartment(form)
      toast.success(isEdit ? 'Department updated' : 'Department created')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 focus:outline-none focus:border-[#0A5540]"
  const labelCls = "text-sm font-medium text-gray-700 block mb-1.5"

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Department' : 'Create Department'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className={labelCls}>Name</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputCls} placeholder="Department name" />
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex gap-2">
            {COLOR_SWATCHES.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Icon</label>
          <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className={inputCls}>
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A5540] rounded-lg hover:bg-[#0d6b51] transition-colors disabled:opacity-70">
            {loading && <LoadingSpinner size="sm" color="white" />}
            {isEdit ? 'Update Department' : 'Create Department'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
