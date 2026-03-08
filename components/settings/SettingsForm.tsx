'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { User, CreditCard, Lightbulb, LogOut, Star, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SettingsFormProps {
  email: string
  nickname: string
  currentLevel: number
  subscriptionStatus: string
  subscriptionExpiresAt: string | null
  hintPoints: number
  inviteCode: string
}

export default function SettingsForm({
  email,
  nickname: initialNickname,
  currentLevel,
  subscriptionStatus,
  subscriptionExpiresAt,
  hintPoints,
  inviteCode,
}: SettingsFormProps) {
  const router = useRouter()
  const [nickname, setNickname] = useState(initialNickname)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const isActive = subscriptionStatus === 'active'

  const NICKNAME_RE = /^[가-힣a-zA-Z0-9_ ]+$/

  async function handleSaveNickname() {
    const trimmed = nickname.trim()
    if (!trimmed || trimmed === initialNickname) return

    if (!NICKNAME_RE.test(trimmed)) {
      toast.error('닉네임에 특수문자를 사용할 수 없어요.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ nickname: trimmed })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')

    setSaving(false)
    if (error) {
      toast.error('닉네임 변경에 실패했어요.')
    } else {
      toast.success('닉네임이 변경되었어요!')
      router.refresh()
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-xl font-bold text-white">설정</h1>

        {/* Profile */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
            <User size={14} />
            프로필
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">이메일</label>
            <p className="text-sm text-slate-400">{email}</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">닉네임</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleSaveNickname}
                disabled={saving || nickname.trim() === initialNickname || !nickname.trim()}
                className="px-3 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? '...' : '저장'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs text-slate-500 mb-0.5">현재 레벨</label>
              <div className="flex items-center gap-1">
                <Star size={12} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">Lv.{currentLevel}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-0.5">힌트 포인트</label>
              <div className="flex items-center gap-1">
                <Lightbulb size={12} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">{hintPoints}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
            <CreditCard size={14} />
            구독
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className={`text-sm font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isActive ? '프리미엄 구독 중' : '무료 플랜'}
              </span>
              {isActive && subscriptionExpiresAt && (
                <p className="text-xs text-slate-500 mt-0.5">
                  만료일: {new Date(subscriptionExpiresAt).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
            <Link
              href="/pricing"
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              {isActive ? '플랜 관리' : '구독하기'}
            </Link>
          </div>
        </div>

        {/* Invite code */}
        {inviteCode && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
              <Copy size={14} />
              친구 초대
            </div>
            <p className="text-xs text-slate-400">
              {isActive
                ? '친구가 가입하면 나는 힌트 +5포인트, 친구는 +2문제 보너스!'
                : '친구가 가입하면 둘 다 오늘 +2문제 보너스!'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-amber-400 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${inviteCode}` : inviteCode}
              </code>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/signup?ref=${inviteCode}`
                  navigator.clipboard.writeText(link).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-200 hover:border-slate-600 transition-colors shrink-0 flex items-center gap-1"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </div>
  )
}
