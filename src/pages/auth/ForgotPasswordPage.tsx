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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-full bg-[#0A5540] flex items-center justify-center">
          <span className="text-white text-xl font-bold">G</span>
        </div>
        <span className="text-xl font-semibold text-gray-900">G-Track</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-[400px] shadow-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#edf8f4] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-[#0A5540]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reset link sent</h2>
            <p className="text-sm text-gray-500 mt-2">Check your inbox at <strong>{email}</strong></p>
            <Link to="/" className="mt-6 block text-sm text-[#0A5540] hover:underline font-medium">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send a reset link</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-[9px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
                  placeholder="you@garagecollective.io"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0A5540] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#0d6b51] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading && <LoadingSpinner size="sm" color="white" />}
                Send reset link
              </button>
            </form>

            <p className="text-sm text-center text-gray-500 mt-6">
              <Link to="/" className="text-[#0A5540] hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
