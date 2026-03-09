import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import logoImg from '../../assets/logo.png'
import { useAdmin } from '../context/AdminContext'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

export function AdminLoginPage() {
  const { adminUser, adminLoading, signInAdmin } = useAdmin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" color="white" />
      </div>
    )
  }

  if (adminUser) return <Navigate to="/super-admin/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInAdmin(email, password)
      navigate('/super-admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img src={logoImg} alt="G-Track" className="h-10 w-auto mb-1.5" />
        <p className="text-xs text-gray-500 font-medium">Super Admin Panel</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-[400px] shadow-sm">
        <h1 className="text-gray-900 text-xl font-bold mb-1">Admin Sign In</h1>
        <p className="text-gray-500 text-sm mb-6">Restricted access · Authorized personnel only</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-xs font-medium mb-1.5">Admin Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required
                autoComplete="email"
                placeholder="superadmin@gtrack.local"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-xs font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0A5540] hover:bg-[#0d6b51] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {loading ? <LoadingSpinner size="sm" color="white" /> : <><ArrowRight size={15} /> Sign in</>}
          </button>
        </form>

        {/* Credentials hint */}
        <div className="mt-6 p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
          <p className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-2">Default Credentials</p>
          <p className="text-xs text-gray-600">
            <span className="text-[#0A5540] font-semibold">Email:</span> superadmin@gtrack.local
          </p>
          <p className="text-xs text-gray-600 mt-1">
            <span className="text-[#0A5540] font-semibold">Password:</span> admin123
          </p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-5">
          Regular user?{' '}
          <a href="/" className="text-[#0A5540] hover:text-green-700 transition-colors font-medium">
            Go to app login
          </a>
        </p>
      </div>
    </div>
  )
}
