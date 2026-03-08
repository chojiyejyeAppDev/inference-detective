'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase는 recovery token을 URL hash로 전달하고 자동으로 세션 설정
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 해요.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않아요.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error('비밀번호 변경에 실패했어요. 다시 시도해주세요.')
      setLoading(false)
    } else {
      toast.success('비밀번호가 변경되었어요!')
      router.push('/levels')
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-bg-game flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-500 text-sm mb-4">비밀번호 재설정 링크를 확인하고 있어요...</p>
          <p className="text-stone-400 text-xs">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-game flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-exam-ink mb-1">이:르다</h1>
          <p className="text-stone-500 text-sm">비밀번호 재설정</p>
        </div>

        <div className="border border-exam-rule bg-white p-6">
          <h2 className="text-lg font-semibold text-exam-ink mb-5">새 비밀번호 입력</h2>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                새 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-exam-rule bg-white px-3 py-2.5 text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
                placeholder="8자 이상"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-exam-rule bg-white px-3 py-2.5 text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
                placeholder="비밀번호 재입력"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
