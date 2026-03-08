'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ChevronRight, Lightbulb, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { LEVEL_CONFIGS, FREE_DAILY_LIMIT } from '@/lib/game/levelConfig'
import { SubscriptionStatus } from '@/types'

interface LevelGridProps {
  currentLevel: number
  subscriptionStatus: SubscriptionStatus
  subscriptionExpiresAt: string | null
  dailyUsed: number
  hintPoints: number
  levelProgress?: { qualified: number; required: number }
}

export default function LevelGrid({
  currentLevel,
  subscriptionStatus,
  subscriptionExpiresAt,
  dailyUsed,
  hintPoints,
  levelProgress,
}: LevelGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFree = subscriptionStatus !== 'active'
  const remaining = isFree ? Math.max(0, FREE_DAILY_LIMIT - dailyUsed) : null

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
        <p className="text-stone-500 text-sm mt-1">레벨을 선택하고 추론 훈련을 시작하세요.</p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {/* Daily limit banner */}
        {isFree && remaining === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 border border-exam-red/30 bg-exam-highlight p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-exam-red font-bold text-sm">오늘의 추론 훈련을 완료했어요!</p>
              <p className="text-exam-red/70 text-xs mt-0.5">내일 새로운 5문제가 기다리고 있어요. 더 풀고 싶다면 구독해보세요.</p>
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

        {/* Level 7 master banner */}
        {currentLevel === 7 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 border-2 border-exam-ink bg-white p-5"
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
                  className={[
                    'w-full text-left border p-5 transition-all duration-250 group relative',
                    isClickable && loadingLevel === null
                      ? isCurrent
                        ? 'border-2 border-exam-ink bg-white cursor-pointer'
                        : isCompleted
                          ? 'border border-exam-rule bg-white hover:border-stone-400 cursor-pointer'
                          : 'border border-exam-rule bg-white hover:border-stone-400 cursor-pointer'
                      : isThisLoading
                        ? 'border-2 border-exam-ink bg-white cursor-wait'
                        : 'border border-exam-rule bg-bg-base cursor-not-allowed opacity-40',
                  ].join(' ')}
                >
                  {/* Level number */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={[
                      'flex items-center justify-center font-bold text-sm transition-all',
                      isCompleted
                        ? 'problem-number-sm bg-white text-green-700 border-green-700'
                        : isCurrent
                          ? 'problem-number'
                          : 'problem-number-sm opacity-60',
                    ].join(' ')}>
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
                        className={[
                          'w-1.5 h-1.5 rounded-full',
                          j < config.level ? 'bg-exam-ink' : 'bg-exam-rule',
                        ].join(' ')}
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
            className="relative mt-8 border border-exam-rule bg-white p-6 text-center"
          >
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
    </div>
  )
}
