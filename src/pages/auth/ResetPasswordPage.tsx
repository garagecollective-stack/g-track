import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { friendlyError } from '../../utils/helpers'

function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters'
  if (!/[A-Z]/.test(password)) return 'Include an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Include a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Include a number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include a symbol'
  return null
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) {
        return
      }

      if (sessionError || !data.session) {
        setError('Your reset link is invalid or has expired. Request a new password reset email.')
      } else {
        setReady(true)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      window.setTimeout(() => {
        void supabase.auth.signOut().finally(() => navigate('/', { replace: true }))
      }, 1500)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex items-center justify-center px-4">
      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-8 w-full max-w-[420px] shadow-sm">
        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-50)] flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-[var(--primary)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--ink-900)] mt-4">Password updated</h1>
            <p className="text-sm text-[var(--ink-500)] mt-2">Redirecting you to sign in with your new password.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[var(--ink-900)]">Set a new password</h1>
            <p className="text-sm text-[var(--ink-500)] mt-1">Use a strong password that you do not reuse elsewhere.</p>

            {!ready && !error ? (
              <div className="py-10 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={!ready || loading}
                      className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] pr-10 text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                      placeholder="At least 12 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(current => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] hover:text-[var(--ink-700)]"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">Confirm password</label>
                  <div className="relative">
                    <input
                      id="reset-password-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={!ready || loading}
                      className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] pr-10 text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(current => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] hover:text-[var(--ink-700)]"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[var(--r-sm)] p-3">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={!ready || loading}
                  className="w-full bg-[var(--primary)] text-white rounded-[var(--r-sm)] py-2.5 text-sm font-medium hover:bg-[var(--primary-700)] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading && <LoadingSpinner size="sm" color="white" />}
                  Update password
                </button>
              </form>
            )}

            <p className="text-sm text-center text-[var(--ink-500)] mt-6">
              <Link to="/" className="text-[var(--primary)] hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
