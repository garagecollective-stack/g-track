import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isSupabaseConfigured } from './lib/supabase.ts'

// ── Error boundary ──────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: 'sans-serif', padding: '24px' }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#ef4444', fontSize: '20px' }}>!</span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>{(this.state.error as Error).message}</p>
            <button onClick={() => window.location.reload()}
              style={{ background: '#0A5540', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Supabase setup screen ────────────────────────────────────────
function SetupScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: 'IBM Plex Sans, sans-serif', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0A5540', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: '22px', fontWeight: 700 }}>G</span>
        </div>
        <span style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>G-Track</span>
      </div>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Supabase not configured</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px', lineHeight: '1.6' }}>
          Add your Supabase credentials to get started.
        </p>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Create <code style={{ fontFamily: 'IBM Plex Mono, monospace', background: '#e5e7eb', padding: '1px 6px', borderRadius: '4px' }}>.env.local</code> in the project root:
          </p>
          <pre style={{ fontSize: '13px', color: '#374151', margin: 0, fontFamily: 'IBM Plex Mono, monospace', lineHeight: '1.8' }}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
        </div>
        <ol style={{ fontSize: '14px', color: '#6b7280', margin: '0', paddingLeft: '20px', lineHeight: '2' }}>
          <li>Go to <strong style={{ color: '#111827' }}>supabase.com</strong> → your project → Settings → API</li>
          <li>Copy the <strong style={{ color: '#111827' }}>Project URL</strong> and <strong style={{ color: '#111827' }}>anon public</strong> key</li>
          <li>Paste them into <code style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>.env.local</code></li>
          <li>Restart the dev server: <code style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>npm run dev</code></li>
        </ol>
      </div>
    </div>
  )
}

// ── Root render ──────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured ? <App /> : <SetupScreen />}
    </ErrorBoundary>
  </StrictMode>,
)
