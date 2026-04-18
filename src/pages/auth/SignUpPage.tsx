import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import logoImg from '../../assets/logo.png'
import { useAuth } from '../../hooks/useAuth'
import { friendlyError } from '../../utils/helpers'
import { LoadingSpinner } from '../../shared/LoadingSpinner'
import { DepartmentDropdown } from '../../shared/DepartmentDropdown'

function getStrength(pw: string): number {
  let s = 0
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
const strengthLabels = ['Weak', 'Fair', 'Good', 'Very Good', 'Strong']

export function SignUpPage() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [department, setDepartment] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const strength = getStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (strength < 4) { setError('Use at least 12 characters with upper, lower, number, and symbol'); return }
    setLoading(true)
    try {
      await signUp(email, password, name, department)
      setSuccess(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--surface-2)] flex flex-col items-center justify-center px-4">
        <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-8 w-full max-w-[400px] shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--primary-50)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-[var(--primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--ink-900)]">Check your email</h2>
          <p className="text-sm text-[var(--ink-500)] mt-2">We sent a confirmation link to <strong>{email}</strong>. Click it to verify your address and activate your account.</p>
          <Link to="/" className="mt-6 block text-sm text-[var(--primary)] hover:underline font-medium">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-8">
        <img src={logoImg} alt="G-Track" className="h-10 w-auto" />
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-8 w-full max-w-[400px] shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]">Create account</h1>
        <p className="text-sm text-[var(--ink-500)] mt-1">Join Garage Collective</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              placeholder="Priya Shah" />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              placeholder="you@garagecollective.io" />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-[9px] pr-10 text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                placeholder="At least 12 characters" />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] hover:text-[var(--ink-700)]" tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColors[strength - 1] : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className={`text-xs mt-1 ${strength >= 4 ? 'text-green-600' : strength >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {strengthLabels[strength - 1] || 'Too weak'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Confirm Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
              className={`w-full border rounded-[var(--r-sm)] px-3 py-[9px] text-sm text-[var(--ink-900)] placeholder-[var(--ink-400)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 ${
                confirmPw && confirmPw !== password ? 'border-red-400' : 'border-[var(--line-1)]'
              }`}
              placeholder="••••••••" />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--ink-700)] block mb-1.5">Department</label>
            <DepartmentDropdown value={department} onChange={setDepartment} />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[var(--r-sm)] p-3">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[var(--primary)] text-white rounded-[var(--r-sm)] py-2.5 text-sm font-medium hover:bg-[var(--primary-700)] active:bg-[#062e22] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
            {loading && <LoadingSpinner size="sm" color="white" />}
            Create account
          </button>
        </form>

        <p className="text-sm text-center text-[var(--ink-500)] mt-6">
          Already have an account?{' '}
          <Link to="/" className="text-[var(--primary)] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
