import { useState, useRef } from 'react'
import { Camera, Eye, EyeOff, Sun, Moon, User, Lock, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../../shared/Avatar'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { friendlyError } from '../../utils/helpers'

// ── Validation ───────────────────────────────────────────────

function validateName(name: string): string | null {
  const t = name.trim()
  if (t.length < 2)  return 'Name must be at least 2 characters'
  if (t.length > 50) return 'Name must be at most 50 characters'
  if (!/^[a-zA-Z\s'-]+$/.test(t)) return 'Only letters, spaces, hyphens and apostrophes allowed'
  return null
}

function validatePassword(pw: string): string | null {
  if (pw.length < 12)        return 'At least 12 characters required'
  if (!/[A-Z]/.test(pw))     return 'Must include an uppercase letter'
  if (!/[a-z]/.test(pw))     return 'Must include a lowercase letter'
  if (!/[0-9]/.test(pw))     return 'Must include a number'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a symbol'
  return null
}

// ── Design tokens ────────────────────────────────────────────

// Light: brand green  /  Dark: jade green
const inputCls = (hasError?: boolean) =>
  [
    'w-full rounded-[var(--r-sm)] px-3 py-[9px] text-sm border',
    'bg-[var(--surface-1)]       dark:bg-[#0D0D0D]',
    'text-[var(--ink-900)]  dark:text-[var(--ink-900)]',
    'placeholder:text-[var(--ink-400)] dark:placeholder:text-[#6B7280]',
    'focus:outline-none focus:ring-1 transition-colors duration-150',
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
      : 'border-[var(--line-1)] dark:border-[#1F2937] focus:border-[var(--primary)] dark:focus:border-[#16a273] focus:ring-[var(--primary)]/15 dark:focus:ring-[#16a273]/20',
  ].join(' ')

const btnPrimary =
  'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--r-sm)] transition-colors duration-150 disabled:opacity-60 ' +
  'bg-[var(--primary)] text-white hover:bg-[var(--primary-700)] ' +
  'dark:bg-[#16a273] dark:text-black dark:hover:bg-[#073928]'

const btnSecondary =
  'px-4 py-2 text-sm font-medium rounded-[var(--r-sm)] transition-colors duration-150 ' +
  'border border-[var(--line-1)] text-[var(--ink-700)] hover:bg-[var(--surface-2)] ' +
  'dark:border-[#1F2937] dark:text-[#B3B3B3] dark:hover:bg-[#141414]'

// ── Shared wrappers ──────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className={[
      'rounded-[var(--r-lg)] p-5 border transition-colors duration-150',
      'bg-[var(--surface-1)]              dark:bg-[#0D0D0D]',
      'border-[var(--line-1)]       dark:border-[#1F2937]',
      'hover:border-[var(--line-1)] dark:hover:border-[#374151]',
    ].join(' ')}>
      <div className={[
        'flex items-center gap-2.5 mb-5 pb-4 border-b',
        'border-[var(--line-1)] dark:border-[#1F2937]',
      ].join(' ')}>
        <span className="w-7 h-7 rounded-[var(--r-sm)] bg-[var(--primary-50)] dark:bg-[#16a273]/10 flex items-center justify-center">
          <Icon size={14} className="text-[var(--primary)] dark:text-[#16a273]" />
        </span>
        <h3 className="text-sm font-semibold text-[var(--ink-900)] dark:text-[var(--ink-900)]">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, error, children }: {
  label: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-[var(--ink-700)] dark:text-[#B3B3B3]">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}

// ── PasswordInputField ────────────────────────────────────────
// IMPORTANT: defined at module scope, NOT inside PasswordSection.
// If it were defined inside the parent render body, React would see a
// new component type on every keystroke, unmount/remount the <input>,
// and the cursor would jump after a single character.

interface PasswordInputProps {
  id: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
  error?: string
  autoComplete?: string
}

function PasswordInputField({
  id, value, onChange, show, onToggle, placeholder, error, autoComplete = 'off',
}: PasswordInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputCls(!!error)} pr-10`}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className={[
          'absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150',
          'text-[var(--ink-400)] hover:text-[var(--ink-700)]',
          'dark:text-[#6B7280] dark:hover:text-[#B3B3B3]',
        ].join(' ')}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

// ── Avatar Section ───────────────────────────────────────────

function AvatarSection() {
  const { currentUser, refreshUser } = useApp()
  const toast    = useToast()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [file,      setFile]      = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  if (!currentUser) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) { toast.error('File too large', 'Maximum size is 2 MB'); return }
    if (!f.type.startsWith('image/')) { toast.error('Invalid file', 'Please upload an image'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${currentUser.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr

      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')
      const publicUrl   = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`

      const { error: profileErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id)
      if (profileErr) throw profileErr

      // Clean up old avatar (fire-and-forget)
      if (currentUser.avatar_url?.includes('/storage/v1/object/public/avatars/')) {
        const oldPath = currentUser.avatar_url.split('/storage/v1/object/public/avatars/')[1]?.split('?')[0]
        if (oldPath && oldPath !== path) supabase.storage.from('avatars').remove([oldPath]).then(() => {})
      }

      await refreshUser()
      setFile(null)
      setPreview(null)
      toast.success('Profile picture updated')
    } catch (err) {
      toast.error('Upload failed', friendlyError(err))
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Section title="Profile Picture" icon={Camera}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Avatar preview */}
        <div className="relative shrink-0">
          <div className={[
            'w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-[var(--primary)]',
            'ring-4 ring-gray-100 dark:ring-[#1F2937]',
          ].join(' ')}>
            {preview
              ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              : <Avatar name={currentUser.name} size="xl" imageUrl={currentUser.avatar_url} />
            }
          </div>
          {preview && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#16a273] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-black">
              <Check size={10} className="text-black" strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-sm text-[var(--ink-500)] dark:text-[#6B7280]">
            JPG, PNG, or WebP · Max 2 MB
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            <button onClick={() => fileRef.current?.click()} className={btnSecondary} disabled={uploading}>
              Choose Photo
            </button>
            {file && (
              <>
                <button onClick={handleUpload} disabled={uploading} className={btnPrimary}>
                  {uploading && <LoadingSpinner size="sm" color="currentColor" />}
                  {uploading ? 'Uploading…' : 'Save Photo'}
                </button>
                <button
                  onClick={handleCancel}
                  className="text-sm text-[var(--ink-400)] dark:text-[#6B7280] hover:text-[var(--ink-700)] dark:hover:text-[#B3B3B3] transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Display Name Section ─────────────────────────────────────

function NameSection() {
  const { currentUser, refreshUser } = useApp()
  const toast = useToast()
  const [name,   setName]   = useState(currentUser?.name ?? '')
  const [error,  setError]  = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  if (!currentUser) return null

  const isDirty = name.trim() !== currentUser.name.trim()

  const handleSave = async () => {
    const err = validateName(name)
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      await supabase.from('profiles').update({ name: name.trim() }).eq('id', currentUser.id)
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast.success('Display name updated')
    } catch (e) {
      toast.error('Failed to update name', friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Display Name" icon={User}>
      <div className="space-y-4 max-w-sm">
        <Field label="Full Name" error={error}>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(null); setSaved(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className={inputCls(!!error)}
            placeholder="Your full name"
            maxLength={50}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving || !isDirty} className={btnPrimary}>
            {saving && <LoadingSpinner size="sm" color="currentColor" />}
            {saved  && <Check size={14} />}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Name'}
          </button>
          {isDirty && !saving && (
            <button onClick={() => { setName(currentUser.name); setError(null) }} className={btnSecondary}>
              Reset
            </button>
          )}
        </div>
      </div>
    </Section>
  )
}

// ── Theme Section ────────────────────────────────────────────

function ThemeSection() {
  const { currentUser, updateTheme } = useApp()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  if (!currentUser) return null

  const active = currentUser.theme ?? 'light'

  const handleToggle = async (theme: 'light' | 'dark') => {
    if (theme === active || saving) return
    setSaving(true)
    try {
      await updateTheme(theme)
      toast.success(`Switched to ${theme} mode`)
    } catch (e) {
      toast.error('Failed to update theme', friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  const themeBtn = (id: 'light' | 'dark', icon: React.ReactNode, label: string) => {
    const isActive = active === id
    return (
      <button
        onClick={() => handleToggle(id)}
        disabled={saving}
        className={[
          'flex-1 flex flex-col items-center gap-3 p-4 rounded-[var(--r-lg)] border-2 transition-all duration-150',
          isActive
            ? 'border-[var(--primary)] bg-[var(--primary-50)] dark:border-[#16a273] dark:bg-[#16a273]/10'
            : 'border-[var(--line-1)] dark:border-[#1F2937] hover:border-[var(--line-2)] dark:hover:border-[#374151]',
        ].join(' ')}
      >
        {icon}
        <span className="text-sm font-medium text-[var(--ink-900)] dark:text-[var(--ink-900)]">{label}</span>
        {isActive && (
          <span className="w-4 h-4 rounded-full bg-[var(--primary)] dark:bg-[#16a273] flex items-center justify-center">
            <Check size={9} className="text-white dark:text-black" strokeWidth={3} />
          </span>
        )}
      </button>
    )
  }

  return (
    <Section title="Appearance" icon={Sun}>
      <div className="flex items-center gap-3">
        {themeBtn(
          'light',
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <Sun size={20} className="text-yellow-500" />
          </div>,
          'Light',
        )}
        {themeBtn(
          'dark',
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] dark:bg-[#000000] flex items-center justify-center border dark:border-[#1F2937]">
            <Moon size={20} className="text-[var(--ink-500)] dark:text-[#4ADE80]" />
          </div>,
          'Dark',
        )}
      </div>
      <p className="text-xs text-[var(--ink-400)] dark:text-[#6B7280] mt-3">
        Preference is saved to your account and synced across sessions.
      </p>
    </Section>
  )
}

// ── Change Password Section ──────────────────────────────────

function PasswordSection() {
  const { currentUser } = useApp()
  const toast = useToast()

  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [errors,  setErrors]  = useState<{ current?: string; new?: string; confirm?: string }>({})
  const [saving,  setSaving]  = useState(false)

  if (!currentUser) return null

  // ── validation ───────────────────────────────────────────
  const validate = (): typeof errors => {
    const errs: typeof errors = {}
    if (!currentPw)              errs.current = 'Current password is required'
    if (!newPw)                  errs.new     = 'New password is required'
    else {
      const pwErr = validatePassword(newPw)
      if (pwErr) errs.new = pwErr
    }
    if (!confirmPw)              errs.confirm = 'Please confirm your password'
    else if (newPw !== confirmPw) errs.confirm = 'Passwords do not match'
    return errs
  }

  // ── submit ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      // Verify current password by re-authenticating
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    currentUser.email,
        password: currentPw,
      })
      if (signInErr) {
        setErrors({ current: 'Current password is incorrect' })
        return
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
      if (updateErr) throw updateErr

      // Clear all fields on success
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      toast.success('Password changed', 'Your password has been updated successfully')
    } catch (err) {
      toast.error('Failed to change password', friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── strength meter ───────────────────────────────────────
  const strength = (() => {
    if (!newPw) return 0
    let s = 0
    if (newPw.length >= 12)           s++
    if (/[A-Z]/.test(newPw))          s++
    if (/[a-z]/.test(newPw))          s++
    if (/[0-9]/.test(newPw))          s++
    if (/[^A-Za-z0-9]/.test(newPw))   s++
    return s
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength]
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-[#4ADE80]', 'bg-[#16a273]'][strength]

  return (
    <Section title="Change Password" icon={Lock}>
      <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm" noValidate>

        {/* Current password */}
        <Field label="Current Password" error={errors.current}>
          <PasswordInputField
            id="current-password"
            value={currentPw}
            onChange={v => { setCurrentPw(v); setErrors(p => ({ ...p, current: undefined })) }}
            show={showCurrent}
            onToggle={() => setShowCurrent(p => !p)}
            placeholder="Enter current password"
            error={errors.current}
            autoComplete="current-password"
          />
        </Field>

        {/* New password */}
        <Field label="New Password" error={errors.new}>
          <PasswordInputField
            id="new-password"
            value={newPw}
            onChange={v => { setNewPw(v); setErrors(p => ({ ...p, new: undefined })) }}
            show={showNew}
            onToggle={() => setShowNew(p => !p)}
            placeholder="Enter new password"
            error={errors.new}
            autoComplete="new-password"
          />
          {/* Strength bar */}
          {newPw && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength ? strengthColor : 'bg-gray-200 dark:bg-[#1F2937]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[var(--ink-400)] dark:text-[#6B7280]">{strengthLabel}</p>
            </div>
          )}
        </Field>

        {/* Confirm password */}
        <Field label="Confirm New Password" error={errors.confirm}>
          <PasswordInputField
            id="confirm-password"
            value={confirmPw}
            onChange={v => { setConfirmPw(v); setErrors(p => ({ ...p, confirm: undefined })) }}
            show={showConfirm}
            onToggle={() => setShowConfirm(p => !p)}
            placeholder="Re-enter new password"
            error={errors.confirm}
            autoComplete="new-password"
          />
        </Field>

        <button type="submit" disabled={saving} className={`${btnPrimary} mt-2`}>
          {saving ? <LoadingSpinner size="sm" color="currentColor" /> : <Lock size={13} />}
          {saving ? 'Changing…' : 'Change Password'}
        </button>

      </form>
    </Section>
  )
}

// ── Main export ──────────────────────────────────────────────

export function ProfileSettingsTab() {
  return (
    <div className="space-y-5">
      <AvatarSection />
      <NameSection />
      <ThemeSection />
      <PasswordSection />
    </div>
  )
}
