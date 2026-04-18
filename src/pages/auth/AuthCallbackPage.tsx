import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { friendlyError } from '../../utils/helpers'
import { LoadingSpinner } from '../../shared/LoadingSpinner'

type CallbackState = 'loading' | 'success' | 'error'

function readParams() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return {
    code: query.get('code'),
    tokenHash: query.get('token_hash'),
    type: query.get('type') ?? hash.get('type'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
  }
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackState>('loading')
  const [message, setMessage] = useState('Completing authentication…')

  useEffect(() => {
    let cancelled = false

    async function completeAuth() {
      try {
        const { code, tokenHash, type, accessToken, refreshToken } = readParams()

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            throw error
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
          })
          if (error) {
            throw error
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            throw error
          }
        } else {
          throw new Error('Missing authentication tokens')
        }

        if (cancelled) {
          return
        }

        if (type === 'recovery') {
          navigate('/reset-password', { replace: true })
          return
        }

        const { data: sessionData } = await supabase.auth.getSession()
        setStatus('success')
        setMessage('Email verified. Redirecting…')
        window.history.replaceState({}, document.title, '/auth/callback')
        window.setTimeout(() => {
          if (sessionData.session) {
            navigate('/app/dashboard', { replace: true })
            return
          }
          navigate('/?verified=1', { replace: true })
        }, 1200)
      } catch (error) {
        if (cancelled) {
          return
        }
        setStatus('error')
        setMessage(friendlyError(error))
      }
    }

    void completeAuth()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex items-center justify-center px-4">
      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-8 w-full max-w-[420px] shadow-sm text-center">
        {status === 'loading' && (
          <>
            <LoadingSpinner size="lg" />
            <h1 className="text-xl font-bold text-[var(--ink-900)] mt-5">Securing your session</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--primary-50)] flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-[var(--primary)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--ink-900)] mt-4">Email verified</h1>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-[var(--ink-900)] mt-4">Authentication failed</h1>
          </>
        )}

        <p className="text-sm text-[var(--ink-500)] mt-3">{message}</p>

        {status === 'error' && (
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="mt-6 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors"
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  )
}
