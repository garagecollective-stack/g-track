import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react'
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)]">
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
    <div className="min-h-screen bg-[var(--surface-2)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full bg-[var(--primary)]/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full bg-[var(--primary)]/8 blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="relative flex flex-col items-center mb-7">
        <img src={logoImg} alt="G-Track" className="h-10 w-auto mb-2" />
        <span className="eyebrow text-[var(--ink-400)]">— G-Track · Garage Collective</span>
      </div>

      {/* Card */}
      <div className="relative bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-xl)] p-8 w-full max-w-[420px] shadow-xl">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-[var(--r-sm)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] text-white shadow-sm">
            <ShieldCheck size={16} strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-[var(--ink-900)] text-[18px] font-bold leading-tight">Director console</h1>
            <p className="text-[11.5px] text-[var(--ink-500)] leading-tight mt-0.5 font-mono tabular-nums">Restricted · Garage leadership only</p>
          </div>
        </div>
        <p className="text-[var(--ink-500)] text-[13px] mb-6 leading-relaxed">
          Sign in to manage Garage Collective's users, departments, and
          G-Track settings. Directors &amp; super-admins only.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--ink-700)] text-xs font-medium mb-1.5">Admin Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" strokeWidth={1.8} />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required
                autoComplete="email"
                placeholder="admin@company.com"
                className="w-full pl-11 pr-4 py-2.5 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] text-[var(--ink-900)] placeholder-[var(--ink-400)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--ink-700)] text-xs font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" strokeWidth={1.8} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-11 pr-10 py-2.5 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-lg)] text-[var(--ink-900)] placeholder-[var(--ink-400)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] hover:text-[var(--ink-700)] transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-[var(--r-lg)] p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-700)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-[var(--r-lg)] transition-colors text-sm"
          >
            {loading ? <LoadingSpinner size="sm" color="white" /> : <><ArrowRight size={15} /> Sign in</>}
          </button>
        </form>

        <div className="mt-6 p-3.5 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-lg)]">
          <p className="eyebrow text-[var(--ink-400)] mb-1.5">Security notice</p>
          <p className="text-[12px] text-[var(--ink-700)] leading-relaxed">
            Credentials are provisioned by Garage leadership outside this app.
            No defaults are shipped — if you don't have console access, contact the director team.
          </p>
        </div>

        <a
          href="/"
          className="group mt-5 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-500)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
          Back to G-Track team sign in
        </a>
      </div>

      {/* External microcopy */}
      <p className="relative mt-5 text-center text-[11px] text-[var(--ink-400)]">
        <a href="https://garagecollective.agency" target="_blank" rel="noreferrer" className="link-ink">
          garagecollective.agency
        </a>
        <span className="mx-1.5">·</span>
        Internal tooling
      </p>
    </div>
  )
}
