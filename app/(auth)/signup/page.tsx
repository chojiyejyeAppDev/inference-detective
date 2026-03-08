'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [done, setDone] = useState(false)

  const NICKNAME_RE = /^[가-힣a-zA-Z0-9_ ]+$/
  const nicknameError = nickname.length > 0 && !NICKNAME_RE.test(nickname)
    ? '한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.'
    : null
  const passwordTooShort = password.length > 0 && password.length < 8

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setLoading(false)
      return
    }

    if (!NICKNAME_RE.test(nickname.trim())) {
      setError('닉네임에 특수문자를 사용할 수 없어요.')
      setLoading(false)
      return
    }

    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          nickname: nickname.trim(),
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
    setGoogleLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback${refCode ? `?ref=${refCode}` : ''}`,
        },
      })
      if (oauthError) {
        setError('Google 가입에 실패했어요. 다시 시도해 주세요.')
        setGoogleLoading(false)
      }
      // 성공 시 리다이렉트가 발생하므로 setGoogleLoading(false) 불필요
    } catch {
      setError('Google 가입 중 오류가 발생했어요. 다시 시도해 주세요.')
      setGoogleLoading(false)
    }
  }

  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleResendVerification() {
    if (resending || resent) return
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })
    setResending(false)
    setResent(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 border-2 border-exam-ink flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-exam-ink">&#10003;</span>
          </div>
          <h2 className="text-xl font-bold text-exam-ink mb-2">이메일을 확인해 주세요</h2>
          <p className="text-stone-500 text-sm mb-4">
            {email}로 인증 링크를 보냈어요.
            <br />
            메일함을 확인하고 링크를 클릭하면 가입이 완료돼요.
          </p>
          <p className="text-xs text-stone-400 mb-5">
            메일이 안 보이나요? 스팸함도 확인해 보세요.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleResendVerification}
              disabled={resending || resent}
              className="text-sm text-exam-ink font-semibold hover:underline underline-offset-2 transition-colors disabled:text-stone-300 disabled:cursor-not-allowed"
            >
              {resent ? '재발송 완료!' : resending ? '발송 중...' : '인증 메일 재발송'}
            </button>
            <Link
              href="/login"
              className="text-stone-500 hover:text-exam-ink text-sm underline underline-offset-2 transition-colors"
            >
              로그인 페이지로 이동
            </Link>
          </div>
        </motion.div>
      </div>
    )
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
          <h2 className="text-lg font-semibold text-exam-ink mb-5">회원가입</h2>

          {refCode && (
            <div className="mb-4 border border-exam-rule bg-bg-game px-3 py-2.5">
              <p className="text-xs text-exam-ink font-semibold">
                초대 코드 <span className="font-bold">{refCode}</span> 적용됨
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                가입하면 오늘 7문제를 풀 수 있어요! (기본 5 + 보너스 2)
              </p>
            </div>
          )}

          {/* Google OAuth — 이메일 인증 불필요, 최소 마찰 */}
          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className="w-full py-2.5 border border-exam-rule bg-white text-exam-ink text-sm font-semibold hover:bg-bg-game transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {googleLoading ? '연결 중...' : 'Google로 바로 시작'}
          </button>
          <p className="text-center text-[11px] text-stone-400 mt-2 mb-1">이메일 인증 없이 바로 시작할 수 있어요</p>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-exam-rule" />
            <span className="text-xs text-stone-400">또는 이메일로 가입</span>
            <div className="flex-1 h-px bg-exam-rule" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                className={[
                  'w-full border bg-white px-3 py-2.5 text-sm text-exam-ink placeholder-stone-400 focus:outline-none transition-colors',
                  nicknameError ? 'border-exam-red focus:border-exam-red' : 'border-exam-rule focus:border-exam-ink',
                ].join(' ')}
                placeholder="탐정 이름 (한글/영문/숫자)"
              />
              {nicknameError && (
                <p className="text-[11px] text-exam-red mt-1">{nicknameError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-exam-rule bg-white px-3 py-2.5 text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={[
                  'w-full border bg-white px-3 py-2.5 text-sm text-exam-ink placeholder-stone-400 focus:outline-none transition-colors',
                  passwordTooShort ? 'border-exam-red focus:border-exam-red' : 'border-exam-rule focus:border-exam-ink',
                ].join(' ')}
                placeholder="8자 이상"
              />
              {passwordTooShort && (
                <p className="text-[11px] text-exam-red mt-1">비밀번호는 8자 이상이어야 해요. ({password.length}/8)</p>
              )}
            </div>

            {error && <p className="text-xs text-exam-red">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-exam-ink text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '가입 중...' : '이메일로 가입하기'}
            </button>
          </form>

          <p className="text-center text-xs text-stone-500 mt-4">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-exam-ink font-semibold hover:underline underline-offset-2">
              로그인
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          가입 시{' '}
          <Link href="/terms" className="text-stone-500 hover:text-exam-ink underline underline-offset-2 transition-colors">
            서비스 이용약관
          </Link>
          {' '}및{' '}
          <Link href="/privacy" className="text-stone-500 hover:text-exam-ink underline underline-offset-2 transition-colors">
            개인정보처리방침
          </Link>
          에 동의하는 것으로 간주됩니다.
        </p>
      </motion.div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-exam-ink border-t-transparent animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
