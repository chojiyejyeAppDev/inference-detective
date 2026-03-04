'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ChevronRight, Lightbulb, Star } from 'lucide-react'
import { LEVEL_CONFIGS, FREE_DAILY_LIMIT } from '@/lib/game/levelConfig'
import { SubscriptionStatus } from '@/types'

interface LevelGridProps {
  currentLevel: number
  subscriptionStatus: SubscriptionStatus
  dailyUsed: number
  hintPoints: number
}

export default function LevelGrid({
  currentLevel,
  subscriptionStatus,
  dailyUsed,
  hintPoints,
}: LevelGridProps) {
  const router = useRouter()
  const isFree = subscriptionStatus !== 'active'
  const remaining = isFree ? Math.max(0, FREE_DAILY_LIMIT - dailyUsed) : null

  return (
    <div className="min-h-screen bg-[#0F172A] px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">추론 탐정</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Lightbulb size={13} />
              <span className="font-semibold">{hintPoints}</span>
              <span className="text-slate-400">포인트</span>
            </div>
            {isFree && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>오늘 남은 문제:</span>
                <span className={remaining === 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {remaining}개
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="text-slate-400 text-sm">레벨을 선택하고 추론 훈련을 시작하세요.</p>
      </motion.div>

      {/* Daily limit banner */}
      {isFree && remaining === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-amber-300 font-semibold text-sm">오늘 분량을 모두 사용했어요!</p>
            <p className="text-amber-400/70 text-xs mt-0.5">구독하면 무제한으로 계속 풀 수 있어요.</p>
          </div>
          <button
            onClick={() => router.push('/pricing')}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            구독하기
          </button>
        </motion.div>
      )}

      {/* Level grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {LEVEL_CONFIGS.map((config, i) => {
          const isUnlocked = config.level <= currentLevel
          const isCurrent = config.level === currentLevel
          const isCompleted = config.level < currentLevel

          return (
            <motion.div
              key={config.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <button
                onClick={() => {
                  if (isUnlocked && (remaining === null || remaining > 0)) {
                    router.push('/play/current')
                  }
                }}
                disabled={!isUnlocked}
                className={[
                  'w-full text-left rounded-xl border p-5 transition-all duration-200 group',
                  isUnlocked && (remaining === null || remaining > 0)
                    ? isCurrent
                      ? 'border-amber-500/70 bg-amber-500/10 hover:bg-amber-500/15 cursor-pointer'
                      : 'border-slate-700 bg-slate-800/60 hover:border-slate-600 cursor-pointer'
                    : 'border-slate-800 bg-slate-900/40 cursor-not-allowed opacity-50',
                ].join(' ')}
              >
                {/* Level number */}
                <div className="flex items-center justify-between mb-3">
                  <div className={[
                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2',
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : isCurrent
                        ? 'bg-amber-500 border-amber-400 text-slate-900'
                        : 'bg-slate-800 border-slate-700 text-slate-500',
                  ].join(' ')}>
                    {isCompleted ? '✓' : config.level}
                  </div>

                  <div className="flex items-center gap-1">
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                        현재
                      </span>
                    )}
                    {!isUnlocked && <Lock size={13} className="text-slate-600" />}
                    {isUnlocked && !isCurrent && (
                      <ChevronRight
                        size={14}
                        className="text-slate-600 group-hover:text-slate-400 transition-colors"
                      />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <p className="font-semibold text-sm text-slate-200 mb-0.5">{config.name}</p>
                  <p className="text-xs text-slate-500">{config.description}</p>
                </div>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
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
          className="mt-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center"
        >
          <p className="text-slate-300 font-semibold mb-1">더 빠르게 성장하고 싶으신가요?</p>
          <p className="text-slate-500 text-sm mb-4">구독하면 무제한 문제 + 전체 힌트 + 오답 분석을 이용할 수 있어요.</p>
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
          >
            구독 플랜 보기
          </button>
        </motion.div>
      )}
    </div>
  )
}
