'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ChevronRight, Lightbulb, Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LEVEL_CONFIGS, FREE_DAILY_LIMIT } from '@/lib/game/levelConfig'
import { SubscriptionStatus } from '@/types'

interface LevelGridProps {
  currentLevel: number
  subscriptionStatus: SubscriptionStatus
  subscriptionExpiresAt: string | null
  dailyUsed: number
  hintPoints: number
}

export default function LevelGrid({
  currentLevel,
  subscriptionStatus,
  subscriptionExpiresAt,
  dailyUsed,
  hintPoints,
}: LevelGridProps) {
  const router = useRouter()
  const isFree = subscriptionStatus !== 'active'
  const remaining = isFree ? Math.max(0, FREE_DAILY_LIMIT - dailyUsed) : null

  // 구독 만료 임박 감지 (3일 이내)
  const daysUntilExpiry = subscriptionExpiresAt
    ? Math.ceil((new Date(subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isExpiringSoon = subscriptionStatus === 'active' && daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null)

  async function handleLevelClick(level: number) {
    if (loadingLevel !== null) return
    setLoadingLevel(level)
    try {
      const res = await fetch(`/api/game/question?level=${level}`)
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
    <div className="min-h-screen bg-[#0C1628] px-4 sm:px-6 py-8 sm:py-10">
      {/* Background */}
      <div className="fixed inset-0 bg-dot-grid opacity-40 pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-slate-900 font-black text-xs">르</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">이:르다</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Lightbulb size={13} />
              <span className="font-semibold">{hintPoints}</span>
              <span className="text-slate-400 text-xs sm:text-sm">포인트</span>
            </div>
            {isFree && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm">
                <span className="hidden sm:inline">오늘 남은 문제:</span>
                <span className="sm:hidden">남은:</span>
                <span className={remaining === 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {remaining}개
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-1">레벨을 선택하고 추론 훈련을 시작하세요.</p>
      </motion.div>

      {/* Daily limit banner */}
      {isFree && remaining === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/[0.07] p-4 flex items-center justify-between overflow-hidden"
        >
          <div className="absolute inset-0 bg-dot-grid-dense opacity-50 pointer-events-none" />
          <div className="relative">
            <p className="text-amber-300 font-bold text-sm">오늘의 추론 훈련을 완료했어요!</p>
            <p className="text-amber-400/70 text-xs mt-0.5">내일 새로운 5문제가 기다리고 있어요. 더 풀고 싶다면 구독해보세요.</p>
          </div>
          <button
            onClick={() => router.push('/pricing')}
            className="relative px-4 py-2 rounded-xl bg-amber-500 text-slate-900 text-xs font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25"
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
          className="relative mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/[0.07] p-4 flex items-center justify-between overflow-hidden"
        >
          <div className="absolute inset-0 bg-dot-grid-dense opacity-50 pointer-events-none" />
          <div className="relative">
            <p className="text-amber-300 font-bold text-sm">
              구독이 {daysUntilExpiry}일 후 만료돼요
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              월간 구독으로 전환하면 더 저렴하게 이용할 수 있어요.
            </p>
          </div>
          <button
            onClick={() => router.push('/pricing')}
            className="relative px-4 py-2 rounded-xl bg-amber-500 text-slate-900 text-xs font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25"
          >
            플랜 변경
          </button>
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
                className={[
                  'w-full text-left rounded-2xl border p-5 transition-all duration-250 group relative overflow-hidden',
                  isClickable && loadingLevel === null
                    ? isCurrent
                      ? 'border-amber-500/60 bg-amber-500/[0.08] hover:bg-amber-500/12 cursor-pointer animate-level-pulse'
                      : isCompleted
                        ? 'border-emerald-500/30 bg-emerald-500/[0.05] hover:border-emerald-500/50 cursor-pointer animate-level-complete'
                        : 'border-white/[0.08] bg-[#111C30]/60 hover:border-white/15 hover:bg-white/[0.04] cursor-pointer'
                    : isThisLoading
                      ? 'border-amber-500/50 bg-amber-500/[0.08] cursor-wait'
                      : 'border-white/[0.04] bg-[#0F1A2E]/60 cursor-not-allowed opacity-40',
                ].join(' ')}
              >
                {/* Level number */}
                <div className="flex items-center justify-between mb-3">
                  <div className={[
                    'w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all',
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : isCurrent
                        ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-md shadow-amber-500/30'
                        : 'bg-white/[0.05] border-white/10 text-slate-500',
                  ].join(' ')}>
                    {isCompleted ? '✓' : config.level}
                  </div>

                  <div className="flex items-center gap-1">
                    {isCurrent && !isThisLoading && (
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                        현재
                      </span>
                    )}
                    {isThisLoading && (
                      <Loader2 size={14} className="text-amber-400 animate-spin" />
                    )}
                    {!isUnlocked && <Lock size={13} className="text-slate-600" />}
                    {isUnlocked && !isCurrent && !isThisLoading && (
                      <ChevronRight
                        size={14}
                        className="text-slate-600 group-hover:text-slate-400 transition-colors"
                      />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <p className="font-bold text-sm text-slate-200 mb-0.5">{config.name}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{config.description}</p>
                </div>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
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

                {/* Stars for difficulty */}
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Star
                      key={j}
                      size={9}
                      className={j < config.level ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}
                    />
                  ))}
                </div>
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
          className="relative mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-dot-grid opacity-50 pointer-events-none" />
          <div className="relative">
            <p className="text-slate-200 font-bold mb-1.5">더 빠르게 성장하고 싶으신가요?</p>
            <p className="text-slate-500 text-sm mb-5">구독하면 무제한 문제 + 전체 힌트 + 오답 분석을 이용할 수 있어요.</p>
            <button
              onClick={() => router.push('/pricing')}
              className="animate-cta-glow px-7 py-2.5 rounded-xl bg-amber-500 text-slate-900 text-sm font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25"
            >
              구독 플랜 보기
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
