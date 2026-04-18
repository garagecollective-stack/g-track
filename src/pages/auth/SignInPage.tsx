import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowUpRight, Check, ShieldCheck } from 'lucide-react'
import logoImg from '../../assets/logo.png'
import { useAuth } from '../../hooks/useAuth'
import { friendlyError } from '../../utils/helpers'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

export function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailVerified = searchParams.get('verified') === '1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/app/dashboard')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative grid lg:grid-cols-[1.1fr_1fr] bg-[var(--canvas)] overflow-hidden">
      {/* ── Ambient background glow ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-32 w-[720px] h-[720px] rounded-full bg-[var(--primary)]/18 blur-[140px]" />
        <div className="absolute -bottom-48 -left-24 w-[560px] h-[560px] rounded-full bg-[var(--brand)]/10 blur-[140px]" />
      </div>

      {/* ── Left: product pitch panel ─────────────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#09090b] text-white overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 bg-grid opacity-[0.4] pointer-events-none" />
        {/* Gradient accents */}
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-[var(--primary)] opacity-40 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -left-24 w-[360px] h-[360px] rounded-full bg-[var(--primary)] opacity-[0.18] blur-[120px] pointer-events-none" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-soft-pulse" />
            <span className="eyebrow text-white/65">Garage Collective · Internal HQ</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-white/40">G-Track · v.2026</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-xl stagger">
          <p className="eyebrow text-[var(--primary-hi)] mb-5">— G-Track · Built inside Garage, for Garage</p>
          <h1 className="font-display text-[clamp(2.4rem,4.5vw,3.75rem)] text-white leading-[1.04] tracking-[-0.025em]">
            Every project, <br />
            every person, <br />
            <span className="text-[var(--primary-hi)]">one Garage.</span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-white/65 max-w-md">
            G-Track is Garage Collective's internal operating hub — the single
            workspace where our directors, leads, and team move projects, tasks,
            and decisions forward. Private to the Garage team.
          </p>

          {/* Feature chips */}
          <ul className="mt-8 space-y-2.5">
            {[
              'Live signal across every Garage department',
              'Role-aware views · Director → Team Lead → Member',
              'Keyboard-first · ⌘K reaches anything inside Garage',
            ].map(t => (
              <li key={t} className="flex items-center gap-2.5 text-[13px] text-white/80">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30">
                  <Check size={10} strokeWidth={3} className="text-[var(--primary-hi)]" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 pt-6 border-t border-white/10 grid grid-cols-3 gap-6">
          <div>
            <div className="font-display text-2xl tabular-nums text-white">12<span className="text-[var(--primary-hi)]">+</span></div>
            <div className="eyebrow text-white/50 mt-1">Garage depts</div>
          </div>
          <div>
            <div className="font-display text-2xl tabular-nums text-white">99.9<span className="text-[var(--primary-hi)]">%</span></div>
            <div className="eyebrow text-white/50 mt-1">Uptime</div>
          </div>
          <div>
            <div className="font-display text-2xl tabular-nums text-white">1.4k<span className="text-[var(--primary-hi)]">+</span></div>
            <div className="eyebrow text-white/50 mt-1">Tasks shipped</div>
          </div>
        </div>
      </aside>

      {/* ── Right: sign-in form (glass card) ─────────────── */}
      <section className="relative flex flex-col px-6 py-10 sm:px-10 lg:px-16">
        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="G-Track" className="h-8 w-auto" />
          </div>
          <a
            href="https://garagecollective.agency"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-500)] hover:text-[var(--primary)] transition-colors"
          >
            <span>New here?</span>
            <span className="link-ink">Explore Garage Collective</span>
            <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Centered glass card */}
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="w-full max-w-[440px] animate-reveal-up">
            <div className="glass-strong rounded-[var(--r-xl)] shadow-xl p-8 sm:p-10">
              <span className="eyebrow">— Garage sign in</span>
              <h2 className="font-display mt-3 text-[28px] leading-[1.1] text-[var(--ink-900)]">
                Welcome back to G-Track.
              </h2>
              <p className="mt-2 text-[14px] text-[var(--ink-500)]">
                Sign in with your Garage Collective email. Internal team access only.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {emailVerified && (
                  <div className="flex items-start gap-2.5 text-[13px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-[var(--r-sm)] p-3 animate-fade-scale-in">
                    <Check size={14} className="mt-0.5 text-emerald-600 shrink-0" strokeWidth={2.4} />
                    <span>Email verified. Sign in below to continue.</span>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="signin-email" className="block text-[12px] font-medium text-[var(--ink-700)] mb-1.5">
                    Work email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" strokeWidth={1.8} />
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      required
                      autoComplete="email"
                      placeholder="you@garagecollective.io"
                      className="input-surface pl-11"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signin-password" className="text-[12px] font-medium text-[var(--ink-700)]">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-[11.5px] font-medium text-[var(--primary)] hover:text-[var(--primary-hi)] transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" strokeWidth={1.8} />
                    <input
                      id="signin-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="input-surface pl-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[var(--r-xs)] text-[var(--ink-400)] hover:text-[var(--ink-900)] hover:bg-[var(--surface-2)] transition-colors"
                      tabIndex={-1}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 text-[13px] text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-[var(--r-sm)] p-3 animate-fade-scale-in">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 text-[14px]"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={15} strokeWidth={2.2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Director portal divider */}
              <div className="mt-8 pt-5 border-t border-[var(--line-1)]">
                <Link
                  to="/super-admin/login"
                  className="group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[var(--r-sm)] bg-[var(--surface-2)] hover:bg-[var(--primary-50)] ring-1 ring-inset ring-[var(--line-1)] hover:ring-[var(--primary)]/25 transition-all"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded-[var(--r-xs)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] text-white shrink-0">
                      <ShieldCheck size={13} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-[var(--ink-900)] leading-tight">Director &amp; super-admin</span>
                      <span className="block text-[11px] text-[var(--ink-500)] leading-tight mt-0.5">Sign in to the G-Track console</span>
                    </span>
                  </span>
                  <ArrowRight size={13} className="text-[var(--ink-400)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </div>

              <div className="mt-5 flex items-center justify-between text-[11.5px] text-[var(--ink-500)]">
                <span className="font-mono tabular-nums">© 2026 · Garage Collective</span>
                <a href="https://garagecollective.agency" target="_blank" rel="noreferrer" className="link-ink inline-flex items-center gap-1">
                  garagecollective.agency <ArrowUpRight size={11} />
                </a>
              </div>
            </div>

            {/* Secondary microcopy */}
            <p className="mt-5 text-center text-[11px] text-[var(--ink-400)]">
              Protected by SSO · Garage-issued accounts only
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
