import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Shield } from 'lucide-react'
import logoImg from '../../assets/logo.png'
import { db } from '../../lib/supabaseAdmin'

type Step = 'checking' | 'needed' | 'already_exists' | 'instructions' | 'error'

export function AdminSetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('checking')
  const [log, setLog] = useState<string[]>([])
  const [errMsg, setErrMsg] = useState('')

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  useEffect(() => {
    async function check() {
      addLog('Checking for existing super_admin profile...')
      const { data, error } = await db
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'super_admin')
        .limit(1)

      if (error) {
        addLog(`Schema query failed: ${error.message}`)
        addLog('Run the schema fix SQL first, then refresh this page.')
        setErrMsg(error.message)
        setStep('error')
        return
      }

      if (data && data.length > 0) {
        addLog(`Found existing super_admin: ${data[0].email}`)
        setStep('already_exists')
        return
      }

      addLog('No super_admin found.')
      addLog('Browser bootstrap is disabled because service role keys must stay server-side.')
      setStep('needed')
    }

    void check()
  }, [])

  const showInstructions = () => {
    addLog('Create the first auth user from the Supabase dashboard or a server-side script.')
    addLog('Then update that profile row to role=super_admin in SQL Editor.')
    setStep('instructions')
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center mb-8">
        <img src={logoImg} alt="G-Track" className="h-10 w-auto mb-1.5" />
        <p className="text-xs text-[var(--ink-500)] font-medium">First-Time Setup</p>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl p-8 w-full max-w-[520px] shadow-sm">
        <h1 className="text-[var(--ink-900)] text-xl font-bold mb-1">Admin Setup</h1>
        <p className="text-[var(--ink-500)] text-sm mb-6">
          The browser no longer performs privileged bootstrap actions. Initial super admin setup must run server-side.
        </p>

        <div className="bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-lg)] p-4 mb-5 font-mono text-xs space-y-1 min-h-[100px] max-h-48 overflow-y-auto">
          {log.length === 0 ? (
            <span className="text-[var(--ink-400)]">Initialising...</span>
          ) : log.map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith('ERROR')
                  ? 'text-red-600'
                  : line.startsWith('Found')
                    ? 'text-green-600'
                    : 'text-[var(--ink-700)]'
              }
            >
              {line}
            </div>
          ))}
          {step === 'checking' && (
            <div className="flex items-center gap-2 text-[var(--ink-400)]">
              <Loader2 size={11} className="animate-spin" /> working...
            </div>
          )}
        </div>

        {step === 'needed' && (
          <button
            onClick={showInstructions}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white font-semibold py-2.5 rounded-[var(--r-lg)] transition-colors text-sm"
          >
            <Shield size={15} /> Show Secure Setup Instructions
          </button>
        )}

        {step === 'instructions' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3.5 bg-green-50 border border-green-200 rounded-[var(--r-lg)]">
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-700">Secure bootstrap path</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Create the auth user outside the browser, then promote its profile to `super_admin`.
                </p>
              </div>
            </div>
            <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-lg)] text-xs text-[var(--ink-700)] space-y-2">
              <p className="font-semibold text-[var(--ink-900)]">Recommended steps</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Create the first admin user in Supabase Auth.</li>
                <li>Open SQL Editor and run the profile update below.</li>
                <li>Sign in through `/super-admin/login`.</li>
              </ol>
              <pre className="bg-[var(--surface-1)] p-2 rounded border border-[var(--line-1)] overflow-x-auto whitespace-pre-wrap">{`update profiles
set role = 'super_admin',
    is_active = true
where email = 'your-admin@example.com';

notify pgrst, 'reload schema';`}</pre>
            </div>
            <button
              onClick={() => navigate('/super-admin/login')}
              className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white font-semibold py-2.5 rounded-[var(--r-lg)] transition-colors text-sm"
            >
              <ArrowRight size={15} /> Go to Login
            </button>
          </div>
        )}

        {step === 'already_exists' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3.5 bg-[var(--primary-50)] border border-[var(--primary)]/20 rounded-[var(--r-lg)]">
              <CheckCircle2 size={16} className="text-[var(--primary)] shrink-0" />
              <p className="text-xs text-[var(--primary)] font-medium">Super admin account already exists.</p>
            </div>
            <button
              onClick={() => navigate('/super-admin/login')}
              className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-700)] text-white font-semibold py-2.5 rounded-[var(--r-lg)] transition-colors text-sm"
            >
              <ArrowRight size={15} /> Go to Login
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-[var(--r-lg)]">
              <p className="text-xs font-semibold text-red-700 mb-1">Setup check failed</p>
              <p className="text-xs text-red-600 break-words">{errMsg}</p>
            </div>
            <div className="p-3.5 bg-yellow-50 border border-yellow-200 rounded-[var(--r-lg)] text-xs text-yellow-700 space-y-1">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>Make sure the `profiles` role constraint includes `super_admin`, then refresh this page.</p>
              </div>
              <pre className="bg-yellow-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">{`ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'director', 'teamLead', 'member'));

NOTIFY pgrst, 'reload schema';`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
