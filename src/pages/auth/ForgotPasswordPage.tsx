import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { friendlyError } from '../../utils/helpers'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center">
          <span className="text-white text-xl font-bold">G</span>
        </div>
        <span className="text-xl font-semibold text-[var(--ink-900)]">G-Track</span>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-8 w-full max-w-[400px] shadow-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-50)] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--ink-900)]">Reset link sent</h2>
            <p className="text-sm text-[var(--ink-500)] mt-2">Check your inbox at <strong>{email}</strong>. Reset links expire automatically for security.</p>
            <Link to="/" className="mt-6 block text-sm text-[var(--primary)] hover:underline font-medium">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[var(--ink-900)]">Forgot password?</h1>
            <p className="text-sm text-[var(--ink-500)] mt-1">Enter your email and we'll send a reset link</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="forgot-email" className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Email address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  placeholder="you@garagecollective.io"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[var(--r-sm)] p-3">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--primary)] text-white rounded-[var(--r-sm)] py-2.5 text-sm font-medium hover:bg-[var(--primary-700)] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading && <LoadingSpinner size="sm" color="white" />}
                Send reset link
              </button>
            </form>

            <p className="text-sm text-center text-[var(--ink-500)] mt-6">
              <Link to="/" className="text-[var(--primary)] hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
