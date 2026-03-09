'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ChevronRight, Lightbulb, Loader2, Zap, Flame, Shield, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { toast } from 'sonner'
import { LEVEL_CONFIGS, FREE_DAILY_LIMIT } from '@/lib/game/levelConfig'
import { SubscriptionStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface LevelGridProps {
  currentLevel: number
  subscriptionStatus: SubscriptionStatus
  subscriptionExpiresAt: string | null
  dailyUsed: number
  hintPoints: number
  levelProgress?: { qualified: number; required: number }
  streakDays?: number
  longestStreak?: number
  streakFreezeCount?: number
  streakAtRisk?: boolean
  streak?: number  // consecutive day streak for hero card
  trialExpiresAt?: string | null
}

export default function LevelGrid({
  currentLevel,
  subscriptionStatus,
  subscriptionExpiresAt,
  dailyUsed,
  hintPoints,
  levelProgress,
  streakDays = 0,
  longestStreak = 0,
  streakFreezeCount = 0,
  streakAtRisk = false,
  streak,
  trialExpiresAt = null,
}: LevelGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trialExpiry = trialExpiresAt ? new Date(trialExpiresAt) : null
  const isInTrial = trialExpiry !== null && trialExpiry > new Date()
  const trialDaysRemaining = isInTrial && trialExpiry
    ? Math.ceil((trialExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0
  const trialExpired = trialExpiry !== null && !isInTrial && subscriptionStatus !== 'active'

  const isFree = subscriptionStatus !== 'active' && !isInTrial
  const remaining = isFree ? Math.max(0, FREE_DAILY_LIMIT - dailyUsed) : null

  // Time until KST midnight reset
  const [resetCountdown, setResetCountdown] = useState('')
  useEffect(() => {
    if (!isFree || remaining !== 0) return
    function update() {
      const now = new Date()
      // KST = UTC+9
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const kstMidnight = new Date(kstNow)
      kstMidnight.setUTCHours(24, 0, 0, 0) // next KST midnight
      const diff = kstMidnight.getTime() - kstNow.getTime()
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setResetCountdown(`${h}시간 ${m}분`)
    }
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [isFree, remaining])

  const TOPIC_LABELS: Record<string, string> = {
    humanities: '인문', social: '사회', science: '과학', tech: '기술', arts: '예술',
  }

  // 약점 주제 집중 훈련 안내 토스트
  const focusTopic = searchParams.get('focus_topic')
  useEffect(() => {
    if (focusTopic && TOPIC_LABELS[focusTopic]) {
      toast.info(`약점 주제: ${TOPIC_LABELS[focusTopic]}`, {
        description: '현재 레벨에서 문제를 풀며 약점을 보완하세요.',
        duration: 5000,
      })
    }
  }, [focusTopic])

  // 닉네임 미설정 Google OAuth 사용자 모달
  const needsNickname = searchParams.get('setup_nickname') === 'true'
  const [showNicknameModal, setShowNicknameModal] = useState(needsNickname)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const NICKNAME_RE = /^[가-힣a-zA-Z0-9_ ]+$/
  const nicknameInputError = nicknameInput.length > 0 && !NICKNAME_RE.test(nicknameInput)
    ? '한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.'
    : null

  async function handleNicknameSave() {
    if (!nicknameInput.trim() || nicknameInputError || nicknameSaving) return
    setNicknameSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nicknameInput.trim() })
        .eq('id', user.id)
      if (error) {
        toast.error('닉네임 저장에 실패했어요. 다시 시도해 주세요.')
      } else {
        setShowNicknameModal(false)
        toast.success(`환영해요, ${nicknameInput.trim()}님!`)
        // URL에서 setup_nickname 파라미터 제거
        const url = new URL(window.location.href)
        url.searchParams.delete('setup_nickname')
        window.history.replaceState({}, '', url.toString())
      }
    } finally {
      setNicknameSaving(false)
    }
  }

  const STREAK_FREEZE_COST = 5 // hint points per freeze
  const [freezeBuying, setFreezeBuying] = useState(false)

  async function handleBuyFreeze() {
    if (freezeBuying || hintPoints < STREAK_FREEZE_COST) return
    setFreezeBuying(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: success } = await supabase.rpc('purchase_streak_freeze', {
        uid: user.id,
        cost: STREAK_FREEZE_COST,
      })
      if (success) {
        toast.success('스트릭 보호가 추가되었어요!', {
          description: '하루 쉬어도 스트릭이 유지됩니다.',
        })
        router.refresh()
      } else {
        toast.error('힌트 포인트가 부족해요.')
      }
    } finally {
      setFreezeBuying(false)
    }
  }

  // 구독 만료 임박 감지 (3일 이내)
  const daysUntilExpiry = subscriptionExpiresAt
    ? Math.ceil((new Date(subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isExpiringSoon = subscriptionStatus === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null)

  async function handleLevelClick(level: number) {
    if (loadingLevel !== null) return
    if (isFree && remaining !== null && remaining <= 0) return
    setLoadingLevel(level)
    try {
      const topicQuery = focusTopic && TOPIC_LABELS[focusTopic] ? `&topic=${focusTopic}` : ''
      const res = await fetch(`/api/game/question?level=${level}${topicQuery}`)
      const data = await res.json()

      if (res.status === 403 && data.error === 'daily_limit_reached') {
        toast.error('오늘의 추론 훈련을 완료했어요!', {
          description: '내일 새로운 5문제가 준비됩니다. 더 풀려면 구독해보세요.',
          action: {
            label: '구독하기',
            onClick: () => router.push('/pricing'),
          },
        })
        return
      }

      if (res.status === 404) {
        toast.info('이 레벨의 문제를 모두 풀었어요!', {
          description: '다른 레벨을 시도하거나 나중에 새 문제가 추가되면 다시 도전해보세요.',
        })
        return
      }

      if (!res.ok || !data.question?.id) {
        toast.error('문제를 불러오지 못했어요.', {
          description: '잠시 후 다시 시도해 주세요.',
        })
        return
      }

      router.push(`/play/${data.question.id}`)
    } catch {
      toast.error('네트워크 오류가 발생했어요.', {
        description: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      })
    } finally {
      setLoadingLevel(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 max-w-4xl mx-auto"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-1">
          <div className="flex items-center gap-2.5">
            <span className="problem-number">르</span>
            <h1 className="text-xl sm:text-2xl font-exam-serif font-bold text-exam-ink tracking-tight">이:르다</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-exam-ink">
              <Lightbulb size={13} />
              <span className="font-semibold">{hintPoints}</span>
              <span className="text-stone-500 text-xs sm:text-sm">포인트</span>
            </div>
            {isFree && (
              <div className="flex items-center gap-1.5 text-stone-500 text-xs sm:text-sm" role="status" aria-live="polite" aria-atomic="true">
                <span className="hidden sm:inline">오늘 남은 문제:</span>
                <span className="sm:hidden">남은:</span>
                <span className={remaining === 0 ? 'text-exam-red font-bold' : 'text-green-700 font-bold'}>
                  {remaining}개
                </span>
              </div>
            )}
          </div>
        </div>
        <span className="section-label">훈련 레벨</span>
        <p className="text-stone-500 text-sm mt-1">레벨을 선택하고 추론 훈련을 시작하세요.</p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {/* Quick Play hero card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 border-2 border-exam-ink bg-white p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              {(streak ?? 0) >= 1 && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Flame size={16} className="text-exam-red" />
                  <span className="text-sm font-bold text-exam-red">{streak}일 연속</span>
                </div>
              )}
              <p className="text-lg font-exam-serif font-bold text-exam-ink">
                Lv.{currentLevel} {LEVEL_CONFIGS[currentLevel - 1]?.name}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {isFree
                  ? `오늘 ${dailyUsed}/5 완료`
                  : '무제한 모드'}
              </p>
            </div>
            {/* Level-up progress ring */}
            {levelProgress && currentLevel < 7 && (
              <div className="text-center">
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#D6D3CA"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#1C1917"
                      strokeWidth="3"
                      strokeDasharray={`${(levelProgress.qualified / levelProgress.required) * 100}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-exam-ink">
                    {levelProgress.qualified}/{levelProgress.required}
                  </span>
                </div>
                <p className="text-[9px] text-stone-400 mt-1">레벨업</p>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={loadingLevel !== null || (isFree && remaining !== null && remaining <= 0)}
            loading={loadingLevel === currentLevel}
            onClick={() => handleLevelClick(currentLevel)}
          >
            {loadingLevel !== currentLevel && (
              <>
                다음 문제
                <ChevronRight size={16} />
              </>
            )}
          </Button>
        </motion.div>

        {/* Daily streak banner */}
        {streakDays > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'relative mb-4 border bg-white p-4',
              streakAtRisk ? 'border-exam-red/50 bg-exam-highlight' : 'border-exam-rule',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 border-2 border-exam-ink">
                  <Flame size={20} className={streakAtRisk ? 'text-exam-red' : 'text-exam-ink'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-exam-ink font-exam-serif">{streakDays}일</span>
                    <span className="text-xs text-stone-500">연속 훈련</span>
                    {streakAtRisk && (
                      <span className="text-[10px] font-bold text-exam-red border border-exam-red/30 bg-exam-highlight px-1.5 py-0.5 animate-pulse">
                        오늘 안 풀면 초기화!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                    <span>최장 {longestStreak}일</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Shield size={10} />
                      보호 {streakFreezeCount}개
                    </span>
                  </div>
                </div>
              </div>
              {streakFreezeCount === 0 && hintPoints >= STREAK_FREEZE_COST && (
                <button
                  onClick={handleBuyFreeze}
                  disabled={freezeBuying}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-exam-rule text-xs font-medium text-stone-600 hover:border-exam-ink hover:text-exam-ink transition-colors disabled:opacity-50"
                >
                  <Shield size={11} />
                  {freezeBuying ? '구매 중...' : `보호 구매 (${STREAK_FREEZE_COST}P)`}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Trial period active banner */}
        {isInTrial && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-4 border border-green-300 bg-green-50 p-4 flex items-center gap-3"
          >
            <div className="flex items-center justify-center w-10 h-10 border-2 border-green-600">
              <Clock size={18} className="text-green-700" />
            </div>
            <div>
              <p className="text-green-800 font-bold text-sm">
                무료 체험 {trialDaysRemaining}일 남음
              </p>
              <p className="text-green-700 text-xs mt-0.5">
                지금은 무제한으로 풀 수 있어요!
              </p>
            </div>
          </motion.div>
        )}

        {/* Trial expired banner */}
        {trialExpired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-4 border border-exam-rule bg-exam-highlight p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-exam-ink font-bold text-sm">체험 기간이 끝났어요</p>
              <p className="text-stone-500 text-xs mt-0.5">하루 5문제 또는 프리미엄으로 무제한!</p>
            </div>
            <button
              onClick={() => router.push('/pricing')}
              className="px-4 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              구독하기
            </button>
          </motion.div>
        )}

        {/* Daily limit banner */}
        {isFree && remaining === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 border border-exam-red/30 bg-exam-highlight p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-exam-red font-bold text-sm">오늘의 추론 훈련을 완료했어요!</p>
              <p className="text-exam-red/70 text-xs mt-0.5">
                {resetCountdown ? `${resetCountdown} 후 초기화` : '내일 새로운 5문제가 기다리고 있어요'}. 더 풀고 싶다면 구독해보세요.
              </p>
            </div>
            <button
              onClick={() => router.push('/pricing')}
              className="px-4 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              구독하기
            </button>
          </motion.div>
        )}

        {/* Subscription expiring soon banner */}
        {isExpiringSoon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 border border-exam-rule bg-exam-highlight p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-exam-red font-bold text-sm">
                구독이 {daysUntilExpiry}일 후 만료돼요
              </p>
              <p className="text-stone-500 text-xs mt-0.5">
                월간 구독으로 전환하면 더 저렴하게 이용할 수 있어요.
              </p>
            </div>
            <button
              onClick={() => router.push('/pricing')}
              className="px-4 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              플랜 변경
            </button>
          </motion.div>
        )}

        {/* Level 5 master banner */}
        {currentLevel === 7 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 border-2 border-exam-ink bg-white bg-ruled p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-exam-ink font-exam-serif font-bold text-base">마스터 모드</p>
              <span className="problem-number-sm">7</span>
            </div>
            <p className="text-stone-500 text-xs mb-3">
              모든 레벨을 해금했어요! 힌트 없이 7단계 추론에 도전하거나, 이전 레벨을 자유롭게 복습하세요.
            </p>
            <div className="flex items-center gap-4 text-xs text-stone-400">
              <span>7단계 추론 · 힌트 없음</span>
              <span>·</span>
              <span>고난도 추상 지문</span>
            </div>
          </motion.div>
        )}

        {/* Level grid */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {LEVEL_CONFIGS.map((config, i) => {
            const isUnlocked = config.level <= currentLevel
            const isCurrent = config.level === currentLevel
            const isCompleted = config.level < currentLevel
            const isClickable = isUnlocked && (remaining === null || remaining > 0)
            const isThisLoading = loadingLevel === config.level

            return (
              <motion.div
                key={config.level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <button
                  aria-label={!isUnlocked ? `레벨 ${config.level} — 레벨 ${config.level - 1} 클리어 후 해금` : `레벨 ${config.level} — ${config.name}`}
                  onClick={() => {
                    if (!isUnlocked) {
                      toast.info(`레벨 ${config.level}은(는) 레벨 ${config.level - 1} 클리어 후 해금돼요.`)
                      return
                    }
                    if (isClickable) {
                      handleLevelClick(config.level)
                    }
                  }}
                  disabled={!isClickable || loadingLevel !== null}
                  className={cn(
                    'w-full text-left border p-5 transition-all duration-250 group relative',
                    isClickable && loadingLevel === null
                      ? isCurrent
                        ? 'border-2 border-exam-ink bg-white cursor-pointer hover:shadow-sm'
                        : isCompleted
                          ? 'border border-exam-rule bg-white hover:border-exam-ink/40 hover:shadow-sm cursor-pointer'
                          : 'border border-exam-rule bg-white hover:border-exam-ink/40 hover:shadow-sm cursor-pointer'
                      : isThisLoading
                        ? 'border-2 border-exam-ink bg-white cursor-wait'
                        : 'border border-exam-rule bg-bg-base cursor-not-allowed opacity-40',
                  )}
                >
                  {/* Level number */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      'flex items-center justify-center font-bold text-sm transition-all',
                      isCompleted
                        ? 'problem-number-sm bg-white text-green-700 border-green-700'
                        : isCurrent
                          ? 'problem-number'
                          : 'problem-number-sm opacity-60',
                    )}>
                      {isCompleted ? '\u2713' : config.level}
                    </div>

                    <div className="flex items-center gap-1">
                      {isCurrent && !isThisLoading && (
                        <span className="text-[10px] font-bold text-exam-red border border-exam-red/30 bg-exam-highlight px-2 py-0.5">
                          현재
                        </span>
                      )}
                      {isThisLoading && (
                        <Loader2 size={14} className="text-exam-ink animate-spin" />
                      )}
                      {!isUnlocked && <Lock size={13} className="text-stone-400" />}
                      {isUnlocked && !isCurrent && !isThisLoading && (
                        <ChevronRight
                          size={14}
                          className="text-stone-400 group-hover:text-exam-ink transition-colors"
                        />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <p className="font-bold text-sm text-exam-ink mb-0.5">{config.name}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{config.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-stone-400">
                    <span>{config.slots}단계 추론</span>
                    <span>·</span>
                    <span>
                      {config.hint_type === 'none'
                        ? '힌트 없음'
                        : config.hint_type === 'indirect'
                          ? '간접 힌트'
                          : config.hint_type === 'semi'
                            ? '반직접 힌트'
                            : '직접 힌트'}
                    </span>
                  </div>

                  {/* Difficulty dots */}
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <span
                        key={j}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          j < config.level ? 'bg-exam-ink' : 'bg-exam-rule',
                        )}
                      />
                    ))}
                  </div>

                  {/* Diagnostic skip button for locked levels within 2 levels */}
                  {!isUnlocked && config.level - currentLevel <= 2 && config.level - currentLevel > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/diagnostic?target=${config.level}`)
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border border-exam-ink text-exam-ink text-xs font-semibold hover:bg-exam-ink hover:text-white transition-colors"
                    >
                      <Zap size={11} />
                      진단 테스트로 스킵
                    </button>
                  )}

                  {/* Level-up progress (current level only) */}
                  {isCurrent && config.level < 7 && levelProgress && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-stone-500">레벨업 진행</span>
                        <span className="text-[10px] font-semibold text-exam-ink">
                          {levelProgress.qualified}/{levelProgress.required}
                        </span>
                      </div>
                      <div className="h-1.5 bg-exam-rule overflow-hidden">
                        <div
                          className="h-full bg-exam-ink transition-all duration-500"
                          style={{ width: `${(levelProgress.qualified / levelProgress.required) * 100}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-stone-400 mt-1">최근 {levelProgress.required}세션 연속 80% 이상 달성 시 레벨업</p>
                    </div>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Upgrade prompt for free users */}
        {isFree && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative mt-8 border-2 border-exam-ink bg-white p-6 text-center"
          >
            <span className="font-annotation text-xs block mb-2">※ 안내</span>
            <p className="text-exam-ink font-bold mb-1.5">더 빠르게 성장하고 싶으신가요?</p>
            <p className="text-stone-500 text-sm mb-5">구독하면 무제한 문제 + 전체 힌트 + 오답 분석을 이용할 수 있어요.</p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-7 py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
            >
              구독 플랜 보기
            </button>
          </motion.div>
        )}
      </div>

      {/* Nickname setup modal for Google OAuth users */}
      <AnimatePresence>
        {showNicknameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm border-2 border-exam-ink bg-white p-6"
            >
              <h2 className="font-exam-serif text-lg font-bold text-exam-ink mb-1">환영해요!</h2>
              <p className="text-sm text-stone-500 mb-5">추론 훈련에서 사용할 닉네임을 설정해 주세요.</p>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">닉네임</label>
              <Input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={20}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNicknameSave()
                }}
                error={!!nicknameInputError}
                placeholder="탐정 이름 (한글/영문/숫자)"
                className="py-3"
              />
              {nicknameInputError && (
                <p className="text-[11px] text-exam-red mt-1">{nicknameInputError}</p>
              )}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!nicknameInput.trim() || !!nicknameInputError || nicknameSaving}
                onClick={handleNicknameSave}
                className="mt-4"
              >
                {nicknameSaving ? '저장 중...' : '시작하기'}
              </Button>
              <button
                onClick={() => {
                  setShowNicknameModal(false)
                  const url = new URL(window.location.href)
                  url.searchParams.delete('setup_nickname')
                  window.history.replaceState({}, '', url.toString())
                }}
                className="w-full mt-2 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                나중에 설정하기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
