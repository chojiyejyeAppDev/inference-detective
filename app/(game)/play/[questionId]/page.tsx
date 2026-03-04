'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
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
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const [dailyInfo, setDailyInfo] = useState<{ used: number; limit: number | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestion()
  }, [])

  async function fetchQuestion() {
    setLoading(true)
    setError(null)
    setEvaluationResult(null)

    try {
      const res = await fetch('/api/game/question')

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
      setLevelConfig(getLevelConfig(data.question.difficulty_level))
      setDailyInfo({ used: data.daily_used, limit: data.daily_limit })
    } catch (err) {
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
        body: JSON.stringify({ question_id: question.id, submitted_chain: chain }),
      })

      if (!res.ok) throw new Error('Evaluation failed')

      const result: EvaluationResult = await res.json()
      setEvaluationResult(result)

      if (result.level_up) {
        setLevelConfig(getLevelConfig(levelConfig.level + 1))
      }
    } catch {
      setError('평가 중 오류가 발생했어요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleHintRequest() {
    if (!question) return

    const res = await fetch('/api/game/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: question.id, hint_level: levelConfig.level }),
    })

    if (res.ok) {
      const data = await res.json()
      setHintPoints(data.hint_points_remaining)
      // Hint text will be shown via a toast or inline — handled by GameBoard
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">문제를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error ?? '문제를 찾을 수 없어요.'}</p>
          <button
            onClick={fetchQuestion}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <GameBoard
      question={question}
      levelConfig={levelConfig}
      hintPoints={hintPoints}
      isSubmitting={isSubmitting}
      evaluationResult={evaluationResult}
      onSubmit={handleSubmit}
      onHintRequest={handleHintRequest}
      onNextQuestion={fetchQuestion}
      onReset={() => setEvaluationResult(null)}
    />
  )
}
