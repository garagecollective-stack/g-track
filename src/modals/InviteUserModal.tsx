import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { RoleDropdown } from '../shared/RoleDropdown'
import { DepartmentDropdown } from '../shared/DepartmentDropdown'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../utils/helpers'
import type { Role } from '../types'

interface Props { open: boolean; onClose: () => void; onSuccess?: () => void }

export function InviteUserModal({ open, onClose, onSuccess }: Props) {
  const { currentUser } = useApp()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [showInviteConfirm, setShowInviteConfirm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', department: '', role: 'member' })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = "w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
  const labelCls = "text-sm font-medium text-[var(--ink-700)] block mb-1.5"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.department) { toast.error('Please select a department'); return }
    setShowInviteConfirm(true)
  }

  const handleConfirmedInvite = async () => {
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department || null,
          manager_id: null,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      await supabase.from('audit_logs').insert({
        performed_by: currentUser?.id,
        action: 'User invited',
        target_type: 'user',
        target_name: form.name,
        details: { email: form.email, department: form.department, role: form.role },
      })

      setSentEmail(form.email)
      setSent(true)
      setShowInviteConfirm(false)
      toast.success(`Invite sent to ${form.email}`)
      onSuccess?.()
    } catch (err) {
      toast.error(friendlyError(err))
      setShowInviteConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSent(false)
    setForm({ name: '', email: '', department: '', role: 'member' })
    onClose()
  }

  const roleLabels: Record<string, string> = { director: 'Director', teamLead: 'Team Lead', member: 'Member' }

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Invite Team Member" size="sm">
        {sent ? (
          <div className="text-center py-4">
            <CheckCircle size={36} className="text-[var(--primary)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--ink-900)]">Invite sent!</p>
            <p className="text-xs text-[var(--ink-500)] mt-1">{sentEmail}</p>
            <button onClick={handleClose}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-name" className={labelCls}>Full Name</label>
              <input id="invite-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} placeholder="Priya Shah" />
            </div>
            <div>
              <label htmlFor="invite-email" className={labelCls}>Email</label>
              <input id="invite-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputCls} placeholder="priya@garagecollective.io" />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <DepartmentDropdown value={form.department} onChange={v => set('department', v)} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <RoleDropdown value={form.role as Role} onChange={v => set('role', v)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-[var(--ink-700)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-70">
                {isSubmitting && <LoadingSpinner size="sm" color="white" />} Send Invite
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showInviteConfirm}
        onClose={() => setShowInviteConfirm(false)}
        onConfirm={handleConfirmedInvite}
        title="Send Invite?"
        message={`Send an invitation to ${form.email}? They will receive a verification email and create their own password as ${roleLabels[form.role] ?? form.role} in ${form.department || 'no department'}.`}
        confirmLabel="Yes, Send Invite"
        variant="confirm"
        isLoading={isSubmitting}
      />
    </>
  )
}
