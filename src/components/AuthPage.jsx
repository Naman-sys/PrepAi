import { memo, useState } from 'react'
import { apiClient } from '../services/apiClient'
import { storeAuth } from '../utils/authStorage'

const AuthHeroPanel = memo(function AuthHeroPanel({ onBack }) {
  return (
    <section className="relative hidden overflow-hidden border-r border-zinc-200 bg-zinc-50 p-10 lg:flex lg:flex-col lg:justify-between">
      <img
        src="/WhatsApp%20Image%202026-04-11%20at%204.58.24%20PM.jpeg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover [transform:translateZ(0)]"
        loading="eager"
        decoding="async"
      />

      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(120deg, rgba(13,13,13,0.72), rgba(13,13,13,0.46))',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 20%, rgba(201,168,76,0.20), transparent 44%), radial-gradient(circle at 80% 84%, rgba(136,136,128,0.16), transparent 38%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage: 'radial-gradient(rgba(15,23,42,0.16) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,0.22))',
        }}
      />

      <div className="relative z-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-900 text-xl font-black text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          aria-label="Back to home"
          title="Back to home"
        >
          PI
        </button>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300">PrepAI Identity</p>
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="font-display text-5xl font-black leading-[1.05] tracking-tight text-white">
          Build interview confidence without slowing down.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-zinc-200">
          Secure your profile to unlock personal progress tracking, session history, and multi-device continuity.
        </p>
      </div>
    </section>
  )
})

export default function AuthPage({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isRegister = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = isRegister
        ? await apiClient.register({ name, email, password })
        : await apiClient.login({ email, password })

      storeAuth(payload.token, payload.user)
      onAuthenticated(payload.user)
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="grid min-h-screen w-full overflow-hidden bg-white lg:grid-cols-2">
        <AuthHeroPanel onBack={onBack} />

        <section className="relative flex items-center bg-white p-5 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Account Access</p>
            <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-zinc-900">
              {isRegister ? 'Create your account' : 'Log in to PrepAI'}
            </h1>
            <p className="mt-3 text-zinc-500">
              Keep your reports, growth metrics, and interview history in one place.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/google`}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-150 hover:border-zinc-400 hover:bg-white active:scale-[0.98]"
                title="Sign in with Google"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/github`}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-150 hover:border-zinc-400 hover:bg-white active:scale-[0.98]"
                title="Sign in with GitHub"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">or continue with email</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${isRegister ? 'max-h-32 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'}`}
                aria-hidden={!isRegister}
              >
                <label className="block pt-0.5">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isRegister}
                    disabled={!isRegister}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                    placeholder="Your full name"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                  placeholder="Enter your email"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-14 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 transition-transform duration-150 hover:text-zinc-900 active:scale-95"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl border border-zinc-900 bg-zinc-900 px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-white transition-transform duration-150 hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Log In'}
              </button>

              <p className="pt-2 text-sm text-zinc-500">
                {isRegister ? 'Already have an account?' : 'New to PrepAI?'}{' '}
                <button
                  type="button"
                  onClick={() => setMode(isRegister ? 'login' : 'register')}
                  className="font-semibold text-zinc-900 transition-transform duration-150 hover:text-zinc-700 active:scale-95"
                >
                  {isRegister ? 'Switch to Login' : 'Create an account'}
                </button>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
