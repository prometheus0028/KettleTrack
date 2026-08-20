'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { syncUser } from '@/app/actions'

type AuthMode = 'initial' | 'login' | 'signup'

export default function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const msgParam = searchParams.get('msg')
  
  const [mode, setMode] = useState<AuthMode>('initial')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(errorParam ? `Error: ${errorParam}. ${msgParam ? decodeURIComponent(msgParam) : 'Authentication failed.'}` : '')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash && hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1))
        const err = params.get('error')
        const errDesc = params.get('error_description')
        if (err) {
          setMessage(`Supabase Error: ${err}. ${errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : ''}`)
        }
      }
    }
  }, [])

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setMessage(`OAuth Error: ${error.message}`)
    }
  }

  const sanitizeEmail = (rawEmail: string) => {
    return rawEmail.trim().toLowerCase()
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const cleanEmail = sanitizeEmail(email)
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Please enter a valid email address.')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }

      if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('Please enter your name.')
        }
        
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim(),
            }
          }
        })
        
        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('An account with this email already exists. If you originally signed up with Google, please use "Continue with Google".')
          }
          throw error
        }
        
        // Sync Prisma user
        await syncUser()
        
        // If sign up is successful, redirect to home
        window.location.href = '/'
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        })
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. If you originally signed up with Google, please click "Continue with Google".')
          }
          throw error
        }
        
        // Sync Prisma user
        await syncUser()
        
        // If login is successful, redirect to home
        window.location.href = '/'
      }
    } catch (err: any) {
      setMessage(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[var(--background)] p-4 font-sans selection:bg-[#1cc29f] selection:text-white">

      <div className="w-full max-w-[340px] flex flex-col items-center relative z-10 animate-fade-in">
        
        {/* Static Kettle Logo */}
        <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
          <div className="relative w-16 h-16">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 470 512.45"
              className="absolute inset-0 w-full h-full text-[#1cc29f]"
            >
              <path fill="currentColor" d="M330.91 457.77H28.05c-12.69-106.05-14.27-196.13 2.29-275.89l.19 1.11c13.74-44.62 31.73-92.13 48.87-123.3h139.21c39.22-6.5 79.9.42 116.81 16.83 7.92-4.86 24.88-2.06 41.49 7.53 19.56 11.29 31.22 27.73 26.04 36.71l-.14.22c53.03 49.13 82.71 120.48 58.84 191.53-17.95 53.43-67.19 91.2-124.65 103.19-1.62 14.39-3.65 28.46-6.09 42.07zM248.3 88.78l-6.01-.42c24.42 101.78 30.52 214.44 16.88 340.23h26.55c19.99-125.15 5.4-237.64-37.42-339.81zM68.1 59.68c-17.14 31.17-35.14 78.68-48.87 123.31C12.4 142.1-4.78 102.34 1.27 59.63c20.07 1.29 47.56 1.96 66.83.05zm241.21 61c27.14 73.5 36.64 170.71 30.76 260.46 3.05-1.18 6.06-2.42 9-3.74 96.98-43.35 105.08-144.15 27.33-214.57-18.99-17.2-41.99-31.65-67.09-42.15zM30.67 468.08H329.3c12.21 0 22.19 9.99 22.19 22.19 0 12.2-9.98 22.18-22.19 22.18H30.67c-12.2 0-22.19-9.98-22.19-22.18s9.99-22.19 22.19-22.19zM91.38 43.72c11.57-13.72 25.17-25.59 41.28-33.56 29.31-14.49 68.93-13.09 97.88 1.71 13.92 7.12 26.21 18.74 36.74 31.85H91.38z" />
            </svg>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2 tracking-tight text-center">
          KettleTrack
        </h1>
        <p className="text-[var(--muted-foreground)] mb-8 text-[15px] text-center max-w-[260px] leading-relaxed">
          Never argue about whose turn it is to wash the kettle again.
        </p>

        {/* Login Form Box */}
        <div className="w-full">
          {mode === 'initial' ? (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-xl font-medium text-[15px] hover:bg-[var(--border)] active:scale-[0.98] transition-all mb-6"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-[var(--border)] w-full"></div>
                <span className="bg-[var(--background)] px-3 text-[12px] font-medium text-[var(--muted-foreground)] absolute uppercase tracking-wider">or</span>
              </div>

              <button
                type="button"
                onClick={() => { setMode('login'); setMessage(''); }}
                className="w-full bg-[#1cc29f] text-white rounded-xl py-3.5 px-4 font-semibold text-[15px] hover:bg-[#18a88a] active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Continue with Email
              </button>
            </>
          ) : (
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl py-3.5 px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1cc29f] focus:border-transparent transition-all placeholder:text-[var(--muted-foreground)]"
                    required
                  />
                </div>
              )}
              
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl py-3.5 px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1cc29f] focus:border-transparent transition-all placeholder:text-[var(--muted-foreground)]"
                  required
                />
              </div>
              
              {mode === 'login' && (
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl py-3.5 px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1cc29f] focus:border-transparent transition-all placeholder:text-[var(--muted-foreground)]"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl py-3.5 px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1cc29f] focus:border-transparent transition-all placeholder:text-[var(--muted-foreground)]"
                    required
                    minLength={6}
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1cc29f] text-white rounded-xl py-3.5 px-4 font-semibold text-[15px] hover:bg-[#18a88a] active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  mode === 'login' ? 'Log In' : 'Sign Up'
                )}
              </button>
              
              <div className="text-center mt-2 flex flex-col gap-2">
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setMessage(''); }}
                    className="text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Don't have an account? Sign up
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setMessage(''); }}
                    className="text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Already have an account? Log in
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setMode('initial'); setMessage(''); }}
                  className="text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Back to options
                </button>
              </div>
            </form>
          )}

          {message && (
            <div className={`mt-6 text-[13px] text-center leading-relaxed font-medium animate-fade-in ${
              message.includes('Error') || message.includes('failed') || message.includes('Invalid') || message.includes('already exists')
                ? 'text-red-500' 
                : 'text-[#1cc29f]'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[12px] text-[var(--muted-foreground)]">
          By continuing, you agree to KettleTrack's<br />
          <Link href="/terms" className="underline hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}

