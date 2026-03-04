'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
          ref_code: refCode ?? undefined,
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('이미 사용 중인 이메일이에요.')
      } else {
        setError('가입 중 오류가 발생했어요. 다시 시도해 주세요.')
      }
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  async function handleGoogleSignup() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${refCode ? `?ref=${refCode}` : ''}`,
      },
    })
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">이메일을 확인해 주세요</h2>
          <p className="text-slate-400 text-sm mb-6">
            {email}로 인증 링크를 보냈어요.
            <br />
            메일함을 확인하고 링크를 클릭하면 가입이 완료돼요.
          </p>
          <Link
            href="/login"
            className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-2"
          >
            로그인 페이지로 이동
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">추론 탐정</h1>
          <p className="text-slate-400 text-sm">수능 비문학 추론 훈련</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">회원가입</h2>

          {refCode && (
            <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
              <p className="text-xs text-amber-300">
                🎁 초대 코드 <span className="font-bold">{refCode}</span> 적용됨 — 가입 후 보너스 문제 지급!
              </p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="탐정 이름"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="8자 이상"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-600">또는</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <button
            onClick={handleGoogleSignup}
            className="w-full py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 가입하기
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-amber-400 hover:text-amber-300">
              로그인
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          가입 시{' '}
          <span className="text-slate-500">서비스 이용약관</span>
          {' '}및{' '}
          <span className="text-slate-500">개인정보처리방침</span>
          에 동의하는 것으로 간주됩니다.
        </p>
      </motion.div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
