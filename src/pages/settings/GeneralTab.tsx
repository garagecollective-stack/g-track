import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import { friendlyError } from '../../utils/helpers'
import { TIMEZONES, DATE_FORMATS } from '../../constants'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { ConfirmDialog } from '../../shared/ConfirmDialog'

export function GeneralTab() {
  const { currentUser } = useApp()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [companyName, setCompanyName] = useState('Garage Collective')
  const [timezone, setTimezone] = useState('America/New_York')
  const [dateFormat, setDateFormat] = useState('MMM D, YYYY')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `logos/company-logo.${ext}`
        const { error } = await supabase.storage.from('project-files').upload(path, logoFile, { upsert: true })
        if (error) throw error
      }
      toast.success('Settings saved')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="max-w-2xl space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Company</h3>
          <div className="space-y-4">
            {/* Company Logo */}
            <div>
              <label className="text-sm font-medium text-[var(--ink-700)] block mb-2">Company Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[var(--r-lg)] border-2 border-dashed border-[var(--line-1)] flex items-center justify-center overflow-hidden bg-[var(--surface-2)]">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                      <span className="text-white text-lg font-bold">G</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--ink-700)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors">
                    <Upload size={14} /> Upload Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {logoPreview && (
                    <button
                      onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
                    >
                      <X size={14} /> Remove
                    </button>
                  )}
                  <p className="text-xs text-[var(--ink-400)]">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-900)] bg-[var(--surface-1)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--line-1)] pt-6">
          <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Localization</h3>
          <div className="space-y-4">
            {/* Timezone */}
            <div>
              <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-900)] bg-[var(--surface-1)] focus:outline-none focus:border-[var(--primary)]"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            {/* Date Format */}
            <div>
              <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Date Format</label>
              <select
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value)}
                className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-900)] bg-[var(--surface-1)] focus:outline-none focus:border-[var(--primary)]"
              >
                {DATE_FORMATS.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--line-1)] pt-6">
          <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Account</h3>
          <div className="bg-[var(--surface-2)] rounded-[var(--r-lg)] p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ink-500)]">Email</span>
              <span className="font-medium text-[var(--ink-900)]">{currentUser?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ink-500)]">Role</span>
              <span className="font-medium text-[var(--ink-900)] capitalize">{currentUser?.role}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-70 disabled:pointer-events-none"
          >
            {saving && <LoadingSpinner size="sm" color="white" />}
            Save Changes
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSave}
        title="Save Settings"
        description="Save these workspace settings?"
        confirmLabel="Save Settings"
        variant="confirm"
      />
    </>
  )
}
