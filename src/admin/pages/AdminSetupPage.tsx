import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import logoImg from '../../assets/logo.png'
import { supabaseAdmin, db, hasServiceRole } from '../../lib/supabaseAdmin'

type Step = 'checking' | 'needed' | 'already_exists' | 'creating' | 'done' | 'error'

export function AdminSetupPage() {
  const navigate = useNavigate()
  const [step,    setStep]    = useState<Step>('checking')
  const [log,     setLog]     = useState<string[]>([])
  const [errMsg,  setErrMsg]  = useState('')

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  // ── on mount: check if super_admin already exists ──────────────
  useEffect(() => {
    async function check() {
      addLog('Checking for existing super_admin profile…')
      const { data, error } = await db
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'super_admin')
        .limit(1)
      if (error) {
        addLog(`Schema query failed: ${error.message}`)
        addLog('This usually means the profiles table needs the super_admin role constraint.')
        addLog('Run the schema fix SQL first (see instructions below).')
        setStep('error')
        setErrMsg(error.message)
        return
      }
      if (data && data.length > 0) {
        addLog(`Found existing super_admin: ${data[0].email}`)
        setStep('already_exists')
      } else {
        addLog('No super_admin found. Setup required.')
        setStep('needed')
      }
    }
    check()
  }, [])

  // ── create the super_admin user via GoTrue admin API ───────────
  const runSetup = async () => {
    setStep('creating')
    setErrMsg('')

    try {
      // Step 1 — create auth user via GoTrue admin API
      addLog('Creating auth user via Supabase admin API…')
      const email    = 'superadmin@gtrack.local'
      const password = 'admin123'

      const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers()
      const alreadyInAuth = existingAuth?.users?.find(u => u.email === email)

      let userId: string

      if (alreadyInAuth) {
        addLog(`Auth user already exists (id: ${alreadyInAuth.id}). Resetting password…`)
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
          alreadyInAuth.id,
          { password, email_confirm: true }
        )
        if (pwErr) throw new Error(`Password reset failed: ${pwErr.message}`)
        userId = alreadyInAuth.id
        addLog('Password reset to admin123.')
      } else {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: 'Super Admin' },
        })
        if (createErr) throw new Error(`User creation failed: ${createErr.message}`)
        if (!created.user) throw new Error('createUser returned no user.')
        userId = created.user.id
        addLog(`Auth user created (id: ${userId}).`)
      }

      // Step 2 — upsert profile with super_admin role
      addLog('Setting profile role to super_admin…')
      const { error: profileErr } = await db
        .from('profiles')
        .upsert({
          id:        userId,
          name:      'Super Admin',
          email,
          role:      'super_admin',
          is_active: true,
        }, { onConflict: 'id' })

      if (profileErr) throw new Error(`Profile upsert failed: ${profileErr.message}`)
      addLog('Profile set to super_admin.')

      addLog('✓ Setup complete!')
      setStep('done')

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`ERROR: ${msg}`)
      setErrMsg(msg)
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img src={logoImg} alt="G-Track" className="h-10 w-auto mb-1.5" />
        <p className="text-xs text-gray-500 font-medium">First-Time Setup</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-[480px] shadow-sm">
        <h1 className="text-gray-900 text-xl font-bold mb-1">Admin Setup</h1>
        <p className="text-gray-500 text-sm mb-6">
          Creates the super admin account using the Supabase admin API.
          Run this once to set up the system.
        </p>

        {/* Service role warning */}
        {!hasServiceRole && (
          <div className="flex items-start gap-2.5 p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl mb-5">
            <AlertCircle size={15} className="text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-yellow-700">Service Role Key Required</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Add <code className="bg-yellow-100 px-1 rounded">VITE_SUPABASE_SERVICE_ROLE_KEY</code> to
                your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file and restart the
                dev server. The admin API requires the service role key.
              </p>
            </div>
          </div>
        )}

        {/* Log output */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 font-mono text-xs space-y-1 min-h-[100px] max-h-48 overflow-y-auto">
          {log.length === 0 ? (
            <span className="text-gray-400">Initialising…</span>
          ) : log.map((line, i) => (
            <div key={i} className={
              line.startsWith('ERROR') ? 'text-red-600' :
              line.startsWith('✓')    ? 'text-green-600' :
              'text-gray-600'
            }>{line}</div>
          ))}
          {step === 'checking' || step === 'creating' ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={11} className="animate-spin" /> working…
            </div>
          ) : null}
        </div>

        {/* Actions */}
        {step === 'needed' && (
          <button onClick={runSetup} disabled={!hasServiceRole}
            className="w-full flex items-center justify-center gap-2 bg-[#0A5540] hover:bg-[#0d6b51] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            <Shield size={15} /> Create Super Admin
          </button>
        )}

        {step === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-700">Setup complete!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Email: <span className="text-gray-900 font-medium">superadmin@gtrack.local</span> ·
                  Password: <span className="text-gray-900 font-medium">admin123</span>
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/super-admin/login')}
              className="w-full flex items-center justify-center gap-2 bg-[#0A5540] hover:bg-[#0d6b51] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
              <ArrowRight size={15} /> Go to Login
            </button>
          </div>
        )}

        {step === 'already_exists' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3.5 bg-[#edf8f4] border border-[#0A5540]/20 rounded-xl">
              <CheckCircle2 size={16} className="text-[#0A5540] shrink-0" />
              <p className="text-xs text-[#0A5540] font-medium">Super admin account already exists.</p>
            </div>
            <button onClick={() => navigate('/super-admin/login')}
              className="w-full flex items-center justify-center gap-2 bg-[#0A5540] hover:bg-[#0d6b51] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
              <ArrowRight size={15} /> Go to Login
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-semibold text-red-700 mb-1">Setup failed</p>
              <p className="text-xs text-red-600 break-words">{errMsg}</p>
            </div>
            {errMsg.includes('super_admin') || errMsg.includes('constraint') || errMsg.includes('schema') ? (
              <div className="p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700 space-y-1">
                <p className="font-semibold text-yellow-800">Run this SQL first in Supabase SQL Editor:</p>
                <pre className="bg-yellow-100 p-2 rounded text-[11px] overflow-x-auto whitespace-pre-wrap">{`ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'super_admin','director','teamLead','member'
  ));

NOTIFY pgrst, 'reload schema';`}</pre>
                <p className="mt-1">Then refresh this page and click "Create Super Admin".</p>
              </div>
            ) : null}
            <button onClick={() => { setStep('needed'); setLog([]); setErrMsg('') }}
              className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
