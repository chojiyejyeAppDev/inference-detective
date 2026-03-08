'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import GameBoard from '@/components/game/GameBoard'
import { Question, EvaluationResult, LevelConfig } from '@/types'
import { getLevelConfig } from '@/lib/game/levelConfig'

interface DailyLimitError {
  error: 'daily_limit_reached'
  used: number
  limit: number
}

export default function PlayPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = use(params)
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [levelConfig, setLevelConfig] = useState<LevelConfig>(getLevelConfig(1))
  const [hintPoints, setHintPoints] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHintLoading, setIsHintLoading] = useState(false)
  const [hintStep, setHintStep] = useState(1)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(questionId)
  const [dailyInfo, setDailyInfo] = useState<{ used: number; limit: number | null } | null>(null)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [hintsUsedCount, setHintsUsedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestion(currentQuestionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchQuestion(id?: string | null) {
    setLoading(true)
    setError(null)
    setEvaluationResult(null)

    try {
      const params = id ? `?id=${id}` : ''
      const res = await fetch(`/api/game/question${params}`)

      if (res.status === 403) {
        const data: DailyLimitError = await res.json()
        router.push(`/levels?daily_limit=true&used=${data.used}&limit=${data.limit}`)
        return
      }

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (!res.ok) throw new Error('Failed to load question')

      const data = await res.json()
      setQuestion(data.question)
      setCurrentQuestionId(null) // 다음 문제부터는 랜덤
      setHintStep(1)
      setHintsUsedCount(0)
      setIsReviewMode(!!data.is_review)
      setLevelConfig(getLevelConfig(data.question.difficulty_level))
      setDailyInfo({ used: data.daily_used, limit: data.daily_limit })
      if (data.hint_points != null) setHintPoints(data.hint_points)
      if (data.is_review) {
        toast.info('이 레벨의 새 문제를 모두 풀었어요! 복습 문제입니다.', { duration: 4000 })
      }
    } catch (_err) {
      setError('문제를 불러오지 못했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(chain: (string | null)[]) {
    if (!question) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/game/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, submitted_chain: chain, hints_used: hintsUsedCount }),
      })

      if (!res.ok) throw new Error('Evaluation failed')

      const result = await res.json()
      setEvaluationResult(result as EvaluationResult)

      // 정답 시 힌트 포인트 보너스 반영
      if (result.hint_points_remaining != null) {
        setHintPoints(result.hint_points_remaining)
        if (result.hint_points_bonus > 0) {
          toast.success(`힌트 포인트 +${result.hint_points_bonus}`, { duration: 2000 })
        }
      }
    } catch {
      toast.error('평가 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleHintRequest() {
    if (!question || isHintLoading) return
    setIsHintLoading(true)

    try {
      const res = await fetch('/api/game/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, hint_step: hintStep }),
      })

      if (res.ok) {
        const data = await res.json()
        setHintPoints(data.hint_points_remaining)
        if (data.hint) {
          toast.info(data.hint, { duration: 6000 })
          setHintStep((prev) => prev + 1)
          setHintsUsedCount((prev) => prev + 1)
        } else {
          toast.info('이 문제에는 더 이상 힌트가 없어요.')
        }
      } else {
        const data = await res.json().catch(() => null)
        if (data?.error === 'insufficient_hint_points') {
          toast.error('힌트 포인트가 부족해요.')
        } else if (data?.error === 'no_more_hints') {
          toast.info('이 문제에는 더 이상 힌트가 없어요.')
        } else {
          toast.error('힌트를 불러올 수 없어요.')
        }
      }
    } finally {
      setIsHintLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-game flex flex-col">
        {/* Skeleton header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-5 bg-slate-700/60 rounded animate-pulse" />
            <div className="w-20 h-4 bg-slate-700/40 rounded animate-pulse hidden sm:block" />
          </div>
          <div className="w-16 h-4 bg-slate-700/40 rounded animate-pulse" />
        </div>
        {/* Skeleton body */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-5 p-4 md:p-5">
          {/* Passage skeleton */}
          <div className="w-full md:w-[45%] flex flex-col gap-3">
            <div className="w-24 h-4 bg-slate-700/40 rounded animate-pulse" />
            <div className="flex-1 rounded-xl border border-slate-700/50 bg-slate-900/30 p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-700/30 rounded animate-pulse" style={{ width: `${85 - i * 8}%` }} />
              ))}
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="w-20 h-3 bg-amber-500/20 rounded animate-pulse mb-2" />
              <div className="h-4 bg-amber-500/10 rounded animate-pulse w-3/4" />
            </div>
          </div>
          {/* Game area skeleton */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-40 h-3 bg-slate-700/40 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg border border-slate-700/40 bg-slate-800/40 animate-pulse" />
              ))}
            </div>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-800" />
              <div className="w-24 h-3 bg-slate-700/40 rounded animate-pulse" />
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <div className="space-y-3 pl-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg border-2 border-dashed border-slate-700/40 bg-slate-800/20 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-bg-game flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error ?? '문제를 찾을 수 없어요.'}</p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => fetchQuestion()}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-600 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.push('/levels')}
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
            >
              레벨 선택으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <GameBoard
      question={question}
      levelConfig={levelConfig}
      hintPoints={hintPoints}
      dailyRemaining={dailyInfo?.limit != null ? Math.max(0, dailyInfo.limit - dailyInfo.used) : null}
      isSubmitting={isSubmitting}
      isHintLoading={isHintLoading}
      isReviewMode={isReviewMode}
      evaluationResult={evaluationResult}
      onSubmit={handleSubmit}
      onHintRequest={handleHintRequest}
      onNextQuestion={() => fetchQuestion()}
      onReset={() => setEvaluationResult(null)}
    />
  )
}
