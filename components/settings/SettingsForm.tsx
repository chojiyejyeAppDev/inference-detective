'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { User, CreditCard, Lightbulb, LogOut, Copy, Check, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePushNotification } from '@/lib/push/usePushNotification'

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
  const searchParams = useSearchParams()
  const setupNickname = searchParams.get('setup_nickname') === 'true'
  const nicknameInputRef = useRef<HTMLInputElement>(null)
  const [nickname, setNickname] = useState(initialNickname)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const isActive = subscriptionStatus === 'active'
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotification()
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (setupNickname && nicknameInputRef.current) {
      nicknameInputRef.current.focus()
    }
  }, [setupNickname])

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
      if (setupNickname) {
        router.replace('/settings')
      } else {
        router.refresh()
      }
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }


  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-xl font-exam-serif font-bold text-exam-ink">설정</h1>

        {setupNickname && (
          <div className="border border-exam-red/30 bg-exam-highlight p-4">
            <p className="text-sm font-semibold text-exam-red">환영해요! 닉네임을 설정해 주세요</p>
            <p className="text-xs text-exam-red/70 mt-1">
              다른 학습자에게 보여질 이름이에요. 언제든 변경할 수 있어요.
            </p>
          </div>
        )}

        {/* Profile */}
        <div className="border border-exam-rule bg-white p-5 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-exam-ink">
            <User size={14} />
            프로필
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1">이메일</label>
            <p className="text-sm text-stone-700">{email}</p>
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1">닉네임</label>
            <div className="flex gap-2">
              <input
                ref={nicknameInputRef}
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder={setupNickname ? '닉네임을 입력하세요' : undefined}
                className="flex-1 border border-exam-rule bg-bg-base px-3 py-2 text-sm text-exam-ink focus:border-exam-ink focus:outline-none transition-colors"
              />
              <button
                onClick={handleSaveNickname}
                disabled={saving || nickname.trim() === initialNickname || !nickname.trim()}
                className="px-3 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? '...' : '저장'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs text-stone-500 mb-0.5">현재 레벨</label>
              <div className="flex items-center gap-1">
                <span className="problem-number-sm text-xs">{currentLevel}</span>
                <span className="text-sm font-semibold text-exam-ink">Lv.{currentLevel}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-0.5">힌트 포인트</label>
              <div className="flex items-center gap-1">
                <Lightbulb size={12} className="text-exam-ink" />
                <span className="text-sm font-semibold text-exam-ink">{hintPoints}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="border border-exam-rule bg-white p-5 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-exam-ink">
            <CreditCard size={14} />
            구독
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className={`text-sm font-semibold ${isActive ? 'text-green-700' : 'text-stone-500'}`}>
                {isActive ? '프리미엄 구독 중' : '무료 플랜'}
              </span>
              {isActive && subscriptionExpiresAt && (
                <p className="text-xs text-stone-500 mt-0.5">
                  만료일: {new Date(subscriptionExpiresAt).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
            <Link
              href="/pricing"
              className="px-3 py-1.5 border border-exam-rule text-xs text-stone-500 hover:text-exam-ink hover:border-stone-400 transition-colors"
            >
              {isActive ? '플랜 관리' : '구독하기'}
            </Link>
          </div>
        </div>

        {/* Invite code */}
        {inviteCode && (
          <div className="border border-exam-rule bg-white p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-exam-ink">
              <Copy size={14} />
              친구 초대
            </div>
            <p className="text-xs text-stone-500">
              {isActive
                ? '친구가 가입하면 나는 힌트 +5포인트, 친구는 +2문제 보너스!'
                : '친구가 가입하면 둘 다 오늘 +2문제 보너스!'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 border border-exam-rule bg-bg-base px-3 py-2 text-xs text-exam-ink truncate font-mono">
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
                className="px-3 py-2 border border-exam-rule text-exam-ink text-xs hover:bg-bg-base transition-colors shrink-0 flex items-center gap-1"
              >
                {copied ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          </div>
        )}

        {/* Push Notifications */}
        {pushSupported && (
          <div className="border border-exam-rule bg-white p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-exam-ink">
              <Bell size={14} />
              알림
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-exam-ink">
                  {pushSubscribed ? '푸시 알림 켜짐' : '푸시 알림 꺼짐'}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  매일 새로운 문제가 준비되면 알려드려요.
                </p>
              </div>
              <button
                onClick={async () => {
                  setPushLoading(true)
                  if (pushSubscribed) {
                    const ok = await pushUnsubscribe()
                    if (ok) toast.success('알림이 해제되었어요.')
                  } else {
                    const ok = await pushSubscribe()
                    if (ok) toast.success('알림이 설정되었어요!')
                    else toast.error('알림 설정에 실패했어요. 브라우저 권한을 확인해주세요.')
                  }
                  setPushLoading(false)
                }}
                disabled={pushLoading}
                className={`px-3 py-1.5 border text-xs font-medium transition-colors disabled:opacity-50 ${
                  pushSubscribed
                    ? 'border-exam-rule text-stone-500 hover:text-exam-red hover:border-exam-red/30'
                    : 'border-exam-ink bg-bg-base text-exam-ink hover:bg-exam-rule'
                }`}
              >
                {pushLoading ? '...' : pushSubscribed ? '끄기' : '켜기'}
              </button>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-exam-rule text-stone-500 text-sm hover:text-exam-red hover:border-exam-red/30 hover:bg-exam-highlight transition-colors"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </div>
  )
}
