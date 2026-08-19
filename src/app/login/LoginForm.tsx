'use client'

import { loginWithGoogle } from './actions'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const msgParam = searchParams.get('msg')
  
  const [email, setEmail] = useState('')
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
    let e = rawEmail.toLowerCase().trim()
    if (e.endsWith('@gmail.com')) {
      const parts = e.split('@')
      parts[0] = parts[0].replace(/\./g, '')
      e = parts.join('@')
    }
    return e
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const normalizedEmail = sanitizeEmail(email)

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* App Logo / Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-16 h-16">
            {/* Background (faded) kettle */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 470 512.45"
              className="w-full h-full text-[#1cc29f] opacity-20"
            >
              <path fill="currentColor" d="M330.91 457.77H28.05c-12.69-106.05-14.27-196.13 2.29-275.89l.19 1.11c13.74-44.62 31.73-92.13 48.87-123.3h139.21c39.22-6.5 79.9.42 116.81 16.83 7.92-4.86 24.88-2.06 41.49 7.53 19.56 11.29 31.22 27.73 26.04 36.71l-.14.22c53.03 49.13 82.71 120.48 58.84 191.53-17.95 53.43-67.19 91.2-124.65 103.19-1.62 14.39-3.65 28.46-6.09 42.07zM248.3 88.78l-6.01-.42c24.42 101.78 30.52 214.44 16.88 340.23h26.55c19.99-125.15 5.4-237.64-37.42-339.81zM68.1 59.68c-17.14 31.17-35.14 78.68-48.87 123.31C12.4 142.1-4.78 102.34 1.27 59.63c20.07 1.29 47.56 1.96 66.83.05zm241.21 61c27.14 73.5 36.64 170.71 30.76 260.46 3.05-1.18 6.06-2.42 9-3.74 96.98-43.35 105.08-144.15 27.33-214.57-18.99-17.2-41.99-31.65-67.09-42.15zM30.67 468.08H329.3c12.21 0 22.19 9.99 22.19 22.19 0 12.2-9.98 22.18-22.19 22.18H30.67c-12.2 0-22.19-9.98-22.19-22.18s9.99-22.19 22.19-22.19zM91.38 43.72c11.57-13.72 25.17-25.59 41.28-33.56 29.31-14.49 68.93-13.09 97.88 1.71 13.92 7.12 26.21 18.74 36.74 31.85H91.38z" />
            </svg>
            {/* Foreground (solid) kettle that fills up */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden animate-fill-up">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 470 512.45"
                className="absolute bottom-0 left-0 w-16 h-16 text-[#1cc29f]"
                preserveAspectRatio="xMidYMax meet"
              >
                <path fill="currentColor" d="M330.91 457.77H28.05c-12.69-106.05-14.27-196.13 2.29-275.89l.19 1.11c13.74-44.62 31.73-92.13 48.87-123.3h139.21c39.22-6.5 79.9.42 116.81 16.83 7.92-4.86 24.88-2.06 41.49 7.53 19.56 11.29 31.22 27.73 26.04 36.71l-.14.22c53.03 49.13 82.71 120.48 58.84 191.53-17.95 53.43-67.19 91.2-124.65 103.19-1.62 14.39-3.65 28.46-6.09 42.07zM248.3 88.78l-6.01-.42c24.42 101.78 30.52 214.44 16.88 340.23h26.55c19.99-125.15 5.4-237.64-37.42-339.81zM68.1 59.68c-17.14 31.17-35.14 78.68-48.87 123.31C12.4 142.1-4.78 102.34 1.27 59.63c20.07 1.29 47.56 1.96 66.83.05zm241.21 61c27.14 73.5 36.64 170.71 30.76 260.46 3.05-1.18 6.06-2.42 9-3.74 96.98-43.35 105.08-144.15 27.33-214.57-18.99-17.2-41.99-31.65-67.09-42.15zM30.67 468.08H329.3c12.21 0 22.19 9.99 22.19 22.19 0 12.2-9.98 22.18-22.19 22.18H30.67c-12.2 0-22.19-9.98-22.19-22.18s9.99-22.19 22.19-22.19zM91.38 43.72c11.57-13.72 25.17-25.59 41.28-33.56 29.31-14.49 68.93-13.09 97.88 1.71 13.92 7.12 26.21 18.74 36.74 31.85H91.38z" />
              </svg>
            </div>
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
          <form action={loginWithGoogle}>
            <button
              type="submit"
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
          </form>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-[var(--border)] w-full"></div>
            <span className="bg-[var(--background)] px-3 text-[12px] font-medium text-[var(--muted-foreground)] absolute uppercase tracking-wider">or</span>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-input-bg border border-[var(--border)] rounded-xl p-3.5 text-[15px] focus:outline-none focus:border-[#1cc29f] text-[var(--foreground)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1cc29f] text-white py-3.5 rounded-xl font-medium text-[15px] hover:bg-[#159e80] active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Continue with Email'
              )}
            </button>
          </form>

          {message && (
            <p className={`text-center text-[13px] font-medium mt-4 p-3 rounded-xl ${
              message.includes('Check') 
                ? 'bg-[#1cc29f]/10 text-[#1cc29f]' 
                : 'bg-red-50 dark:bg-red-950/30 text-red-500'
            }`}>
              {message}
            </p>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-[12px] text-[var(--muted-foreground)]">
          <p>
            By continuing, you agree to KettleTrack's
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Link href="/terms" className="hover:text-[var(--foreground)] underline underline-offset-2 transition-colors">
              Terms of Service
            </Link>
            <span>and</span>
            <Link href="/privacy" className="hover:text-[var(--foreground)] underline underline-offset-2 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
