'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  const rawRedirect = searchParams.get('redirect') ?? '/levels'
  // Prevent open redirect: only allow relative paths starting with /
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/levels'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return // m-1: prevent double-submit
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      toast.error('이메일 또는 비밀번호가 올바르지 않아요.')
      setLoading(false)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback${refCode ? `?ref=${refCode}` : ''}` },
      })
      if (oauthError) {
        toast.error('Google 로그인에 실패했어요. 다시 시도해 주세요.')
        setGoogleLoading(false)
      }
      // 성공 시 리다이렉트가 발생하므로 setGoogleLoading(false) 불필요
    } catch {
      toast.error('Google 로그인 중 오류가 발생했어요.')
      setGoogleLoading(false)
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      toast.error('이메일을 먼저 입력해주세요.')
      return
    }
    if (resetLoading || resetSent) return
    setResetLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetLoading(false)
    if (error) {
      toast.error('비밀번호 재설정 이메일 발송에 실패했어요.')
    } else {
      setResetSent(true)
      toast.success('비밀번호 재설정 이메일을 보냈어요!', {
        description: '메일함을 확인해주세요.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-exam-serif text-2xl font-bold">이:르다</span>
          <p className="text-stone-500 text-sm mt-1">수능 비문학 추론 훈련</p>
        </div>

        <div className="border border-exam-rule bg-white p-6">
          <h2 className="text-lg font-semibold text-exam-ink mb-5">로그인</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-exam-rule bg-white px-3 py-3 text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-stone-500">비밀번호</label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetSent}
                  className="text-xs text-stone-400 hover:text-exam-ink transition-colors disabled:text-stone-300 py-1"
                >
                  {resetSent ? '메일 발송됨' : '비밀번호 찾기'}
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-exam-rule bg-white px-3 py-3 text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-exam-ink text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-exam-rule" />
            <span className="text-xs text-stone-400">또는</span>
            <div className="flex-1 h-px bg-exam-rule" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full py-3 border border-exam-rule bg-white text-exam-ink text-sm font-semibold hover:bg-bg-game transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? '연결 중...' : 'Google로 로그인'}
          </button>

          <p className="text-center text-xs text-stone-500 mt-4">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-exam-ink font-semibold hover:underline underline-offset-2">
              회원가입
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-exam-ink border-t-transparent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
